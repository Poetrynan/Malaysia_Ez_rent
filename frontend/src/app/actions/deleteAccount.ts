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

    // Delete tenant-specific data (preserves leases & payment_records for agent's ledger)
    await supabase.from('tenant_interests').delete().eq('user_id', user.id);
    await supabase.from('maintenance_requests').delete().eq('user_id', user.id);
    await supabase.from('agent_registrations').delete().eq('auth_user_id', user.id);
    await supabase.from('admin_users').delete().eq('id', user.id);
    await supabase.from('users').delete().eq('id', user.id);

    // Use service role key to delete auth user
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
      );
      const { error } = await adminClient.auth.admin.deleteUser(user.id);
      if (error) console.error('Auth user deletion error:', error);
    }

    return { success: true };
  } catch (e: any) {
    console.error('Delete account error:', e);
    return { success: false, error: e.message || 'Unknown error' };
  }
}
