'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function deleteAccountAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();

    // Use regular server client to get current user
    const { createClient: createServerClient } = await import('@/utils/supabase/server');
    const supabase = createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Use service role key to bypass RLS
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminClient = serviceKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : supabase;

    // Check if user is an agent (admin)
    const { data: adminRecord } = await adminClient
      .from('admin_users')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    const isAgent = !!adminRecord;

    if (isAgent) {
      // Agent deletion logic:
      // 1. Check if they have any active leases (as agent_id on units)
      const { data: activeLeases } = await adminClient
        .from('leases')
        .select('id')
        .eq('status', 'active')
        .in('unit_id',
          (await adminClient.from('units').select('id').eq('agent_id', user.id)).data?.map((u: any) => u.id) || []
        );

      if (activeLeases && activeLeases.length > 0) {
        return {
          success: false,
          error: '您还有未到期的活跃租约，无法注销。请先等待所有租约到期或完成结算后再注销。'
        };
      }

      // 2. Agent can delete - but KEEP leases and payment records as evidence
      // Only delete user-related records, not financial records
      await adminClient.from('agent_registrations').delete().eq('auth_user_id', user.id);
      await adminClient.from('admin_users').delete().eq('id', user.id);
      await adminClient.from('users').delete().eq('id', user.id);

    } else {
      // Tenant deletion logic:
      // 1. Get all leases belonging to this tenant
      const { data: userLeases } = await adminClient
        .from('leases')
        .select('id')
        .eq('tenant_id', user.id);

      // 2. Delete payment records for all tenant's leases
      if (userLeases && userLeases.length > 0) {
        const leaseIds = userLeases.map(l => l.id);
        await adminClient.from('payment_records').delete().in('lease_id', leaseIds);
        await adminClient.from('leases').delete().eq('tenant_id', user.id);
      }

      // 3. Delete other tenant records
      await adminClient.from('tenant_interests').delete().eq('user_id', user.id);
      await adminClient.from('maintenance_requests').delete().eq('user_id', user.id);
      await adminClient.from('users').delete().eq('id', user.id);
    }

    // Delete auth user
    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) console.error('Auth user deletion error:', error);

    return { success: true };
  } catch (e: any) {
    console.error('Delete account error:', e);
    return { success: false, error: e.message || 'Unknown error' };
  }
}
