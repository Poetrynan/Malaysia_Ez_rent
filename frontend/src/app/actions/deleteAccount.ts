'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function parseDeletedAt(marker: string | null | undefined): Date | null {
  if (!marker?.startsWith('DELETED:')) return null;
  const deletedAt = new Date(marker.slice('DELETED:'.length));
  return Number.isNaN(deletedAt.getTime()) ? null : deletedAt;
}

async function removeStorageUrl(
  adminClient: ReturnType<typeof createClient>,
  url?: string | null,
) {
  if (!url) return;
  try {
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\/storage\/v1\/object\/public\/unit-media\/(.+)$/);
    if (match?.[1]) {
      await adminClient.storage.from('unit-media').remove([decodeURIComponent(match[1])]);
    }
  } catch (storageErr) {
    console.error(`Failed to delete storage file: ${url}`, storageErr);
  }
}

async function purgeExpiredAgent(
  adminClient: ReturnType<typeof createClient>,
  agentId: string,
) {
  const { data: adminRow } = await adminClient
    .from('admin_users')
    .select('ren_tag_url')
    .eq('id', agentId)
    .maybeSingle();

  const { data: profileRow } = await adminClient
    .from('agent_profiles')
    .select('ren_tag_image_url')
    .eq('auth_user_id', agentId)
    .maybeSingle();

  await removeStorageUrl(adminClient, adminRow?.ren_tag_url);
  await removeStorageUrl(adminClient, profileRow?.ren_tag_image_url);

  await adminClient.from('agent_profiles').delete().eq('auth_user_id', agentId);
  await adminClient.from('admin_users').delete().eq('id', agentId);
  await adminClient.from('users').delete().eq('id', agentId);
}

async function purgeExpiredTenant(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  userRow: {
    ic_photo_front_url?: string | null;
    ic_photo_back_url?: string | null;
    passport_photo_url?: string | null;
    student_card_url?: string | null;
    work_permit_photo_url?: string | null;
    document_url?: string | null;
  },
) {
  await adminClient.from('leases').update({ tenant_id: null }).eq('tenant_id', userId);
  await adminClient.from('agent_ratings').update({ tenant_id: null }).eq('tenant_id', userId);
  await adminClient.from('reviews').update({ user_id: null }).eq('user_id', userId);
  await adminClient.from('favorites').delete().eq('user_id', userId);

  const urlsToDelete = [
    userRow.ic_photo_front_url,
    userRow.ic_photo_back_url,
    userRow.passport_photo_url,
    userRow.student_card_url,
    userRow.work_permit_photo_url,
    userRow.document_url,
  ].filter(Boolean) as string[];

  for (const url of urlsToDelete) {
    await removeStorageUrl(adminClient, url);
  }

  await adminClient.from('users').delete().eq('id', userId);
}

/**
 * Purges tenant/agent records retained for 7 days after self-deletion.
 */
export async function cleanupExpiredDeletedAccountsAction(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return { success: false, error: 'Service role key not configured', count: 0 };

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - RETENTION_MS);
    let count = 0;

    const { data: deletedAgents, error: agentFetchErr } = await adminClient
      .from('admin_users')
      .select('id, avatar_url')
      .like('avatar_url', 'DELETED:%');

    if (agentFetchErr) throw agentFetchErr;

    for (const agent of deletedAgents || []) {
      const deletedAt = parseDeletedAt(agent.avatar_url);
      if (!deletedAt || deletedAt >= sevenDaysAgo) continue;
      await purgeExpiredAgent(adminClient, agent.id);
      count++;
    }

    const { data: deletedUsers, error: fetchErr } = await adminClient
      .from('users')
      .select('id, avatar_url, ic_photo_front_url, ic_photo_back_url, passport_number, passport_photo_url, student_card_url, work_permit_photo_url, document_url')
      .like('avatar_url', 'DELETED:%');

    if (fetchErr) throw fetchErr;

    for (const u of deletedUsers || []) {
      const deletedAt = parseDeletedAt(u.avatar_url);
      if (!deletedAt || deletedAt >= sevenDaysAgo) continue;

      const { data: stillAgent } = await adminClient
        .from('admin_users')
        .select('id')
        .eq('id', u.id)
        .maybeSingle();

      if (stillAgent) continue;

      await purgeExpiredTenant(adminClient, u.id, u);
      count++;
    }

    return { success: true, count };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Cleanup expired deleted accounts error:', e);
    return { success: false, error: message, count: 0 };
  }
}

export async function deleteAccountAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();

    const { createClient: createServerClient } = await import('@/utils/supabase/server');
    const supabase = createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminClient = serviceKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : supabase;

    try {
      await cleanupExpiredDeletedAccountsAction();
    } catch (cleanupErr) {
      console.error('Periodic deletion cleanup failed:', cleanupErr);
    }

    const { data: adminRecord } = await adminClient
      .from('admin_users')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    const isAgent = !!adminRecord;

    if (isAgent) {
      const { data: agentUnits } = await adminClient
        .from('units')
        .select('id')
        .eq('agent_id', user.id);

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
            error: '您还有未到期的活跃租约，无法注销。请先等待所有租约到期或完成结算后再注销。',
          };
        }
      }

      const deletedMarker = `DELETED:${new Date().toISOString()}`;

      await adminClient.from('user_notifications').delete().eq('user_id', user.id);

      await adminClient.from('users').update({ avatar_url: deletedMarker }).eq('id', user.id);
      await adminClient.from('admin_users').update({ avatar_url: deletedMarker }).eq('id', user.id);
      await adminClient.from('agent_profiles').update({
        verification_status: 'rejected',
        rejection_reason: deletedMarker,
      }).eq('auth_user_id', user.id);
    } else {
      await adminClient.from('tenant_interests').delete().eq('user_id', user.id);
      await adminClient.from('maintenance_requests').delete().eq('user_id', user.id);
      await adminClient.from('user_notifications').delete().eq('user_id', user.id);

      await adminClient.from('users').update({
        avatar_url: `DELETED:${new Date().toISOString()}`,
      }).eq('id', user.id);
    }

    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) {
      console.error('Auth user deletion error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Delete account error:', e);
    return { success: false, error: message };
  }
}
