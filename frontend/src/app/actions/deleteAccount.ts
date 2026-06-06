'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Automatically purges any user records that have been scheduled for deletion for 7+ days.
 * Dissociates financial records (leases, ratings, reviews) and deletes files/rows.
 */
export async function cleanupExpiredDeletedAccountsAction(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return { success: false, error: 'Service role key not configured', count: 0 };

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // 1. Find all users marked as DELETED
    const { data: deletedUsers, error: fetchErr } = await adminClient
      .from('users')
      .select('id, avatar_url, ic_photo_front_url, ic_photo_back_url, passport_photo_url, student_card_url, work_permit_photo_url, document_url')
      .like('avatar_url', 'DELETED:%');

    if (fetchErr) throw fetchErr;
    if (!deletedUsers || deletedUsers.length === 0) {
      return { success: true, count: 0 };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const u of deletedUsers) {
      const parts = u.avatar_url.split(':');
      if (parts.length < 2) continue;
      const deletedAtStr = parts.slice(1).join(':');
      const deletedAt = new Date(deletedAtStr);

      if (deletedAt < sevenDaysAgo) {
        // Exceeded 7 days, perform permanent purge:
        
        // A. Dissociate references to avoid foreign key constraint violations
        await adminClient.from('leases').update({ tenant_id: null }).eq('tenant_id', u.id);
        await adminClient.from('agent_ratings').update({ tenant_id: null }).eq('tenant_id', u.id);
        await adminClient.from('reviews').update({ user_id: null }).eq('user_id', u.id);
        await adminClient.from('favorites').delete().eq('user_id', u.id);

        // B. Delete files from Supabase Storage
        const urlsToDelete = [
          u.ic_photo_front_url,
          u.ic_photo_back_url,
          u.passport_photo_url,
          u.student_card_url,
          u.work_permit_photo_url,
          u.document_url
        ].filter(Boolean) as string[];

        for (const url of urlsToDelete) {
          try {
            const cleanUrl = url.split('?')[0];
            const match = cleanUrl.match(/\/storage\/v1\/object\/public\/unit-media\/(.+)$/);
            if (match && match[1]) {
              const storagePath = decodeURIComponent(match[1]);
              await adminClient.storage.from('unit-media').remove([storagePath]);
            }
          } catch (storageErr) {
            console.error(`Failed to delete storage file: ${url}`, storageErr);
          }
        }

        // C. Remove row from users table
        const { error: deleteErr } = await adminClient
          .from('users')
          .delete()
          .eq('id', u.id);

        if (deleteErr) {
          console.error(`Failed to delete user row: ${u.id}`, deleteErr);
        } else {
          count++;
        }
      }
    }

    return { success: true, count };
  } catch (e: any) {
    console.error('Cleanup expired deleted accounts error:', e);
    return { success: false, error: e.message || 'Unknown error', count: 0 };
  }
}

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

    // Run a background cleanup task first to purge any previously expired accounts
    try {
      await cleanupExpiredDeletedAccountsAction();
    } catch (cleanupErr) {
      console.error('Periodic deletion cleanup failed:', cleanupErr);
    }

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
      await adminClient.from('agent_profiles').delete().eq('auth_user_id', user.id);
      await adminClient.from('admin_users').delete().eq('id', user.id);
      await adminClient.from('users').delete().eq('id', user.id);

    } else {
      // Tenant deletion logic:
      // 1. Delete records that reference auth.users(id) to prevent foreign key errors when deleting the auth user
      await adminClient.from('tenant_interests').delete().eq('user_id', user.id);
      await adminClient.from('maintenance_requests').delete().eq('user_id', user.id);
      await adminClient.from('user_notifications').delete().eq('user_id', user.id);

      // 2. Mark the public.users record as deactivated with the deactivation timestamp,
      // but KEEP all personal info and documents for 7 days as evidence.
      // Leases and payment records are preserved intact to avoid affecting agent rent archives.
      await adminClient.from('users').update({
        avatar_url: `DELETED:${new Date().toISOString()}`
      }).eq('id', user.id);
    }

    // Delete auth user (instantly deactivates login)
    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) console.error('Auth user deletion error:', error);

    return { success: true };
  } catch (e: any) {
    console.error('Delete account error:', e);
    return { success: false, error: e.message || 'Unknown error' };
  }
}
