'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

async function removeStorageUrl(adminClient: ReturnType<typeof createClient>, url?: string | null) {
  if (!url) return;
  try {
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\/storage\/v1\/object\/public\/unit-media\/(.+)$/);
    if (match?.[1]) {
      await adminClient.storage.from('unit-media').remove([decodeURIComponent(match[1])]);
    }
  } catch (err) {
    console.error('[deleteAgentBySuperAdmin] Storage delete failed:', url, err);
  }
}

/**
 * Super-admin removes an agent completely: admin_users + agent_profiles + auth.users.
 */
export async function deleteAgentBySuperAdminAction(
  targetUserId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return { success: false, error: 'Service role key not configured' };
    }

    const cookieStore = await cookies();
    const { createClient: createServerClient } = await import('@/utils/supabase/server');
    const sessionClient = createServerClient(cookieStore);
    const { data: { user: caller } } = await sessionClient.auth.getUser();
    if (!caller) return { success: false, error: 'Not authenticated' };

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    const { data: callerAdmin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerAdmin?.role !== 'super_admin') {
      return { success: false, error: 'Only super administrators can delete agents' };
    }

    if (targetUserId === caller.id) {
      return { success: false, error: 'Cannot delete your own account from this panel' };
    }

    const { data: targetAdmin, error: targetErr } = await adminClient
      .from('admin_users')
      .select('id, role, email, ren_tag_url')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetErr) throw targetErr;
    if (!targetAdmin) {
      return { success: false, error: 'Agent record not found' };
    }

    if (targetAdmin.role === 'super_admin') {
      return { success: false, error: 'Cannot delete a super administrator' };
    }

    const { data: agentUnits } = await adminClient
      .from('units')
      .select('id')
      .eq('agent_id', targetUserId);

    const unitIds = (agentUnits || []).map((u) => u.id);

    if (unitIds.length > 0) {
      const { data: activeLeases } = await adminClient
        .from('leases')
        .select('id')
        .eq('status', 'active')
        .in('unit_id', unitIds);

      if (activeLeases && activeLeases.length > 0) {
        return {
          success: false,
          error: '该中介仍有活跃租约，无法删除。请先处理相关租约后再试。',
        };
      }
    }

    const { data: agentProfile } = await adminClient
      .from('agent_profiles')
      .select('ren_tag_image_url')
      .eq('auth_user_id', targetUserId)
      .maybeSingle();

    await adminClient.from('user_notifications').delete().eq('user_id', targetUserId);
    await adminClient.from('agent_profiles').delete().eq('auth_user_id', targetUserId);
    await adminClient.from('admin_users').delete().eq('id', targetUserId);
    await adminClient.from('users').delete().eq('id', targetUserId);

    await removeStorageUrl(adminClient, targetAdmin.ren_tag_url);
    await removeStorageUrl(adminClient, agentProfile?.ren_tag_image_url);

    const { error: authErr } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (authErr) throw authErr;

    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[deleteAgentBySuperAdmin] Error:', e);
    return { success: false, error: message };
  }
}
