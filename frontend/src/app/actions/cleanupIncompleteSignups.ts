'use server';

import { createClient } from '@supabase/supabase-js';

const STALE_MINUTES = 30;

/**
 * Permanently removes Google OAuth accounts that never completed identity
 * verification within 30 minutes of signup. Safe for legacy tenants because
 * only Google-provider accounts with zero tenant activity are eligible.
 */
export async function cleanupIncompleteOAuthSignupsAction(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return { success: false, error: 'Service role key not configured', count: 0 };
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
    );

    const { data: staleRows, error: fetchErr } = await adminClient.rpc(
      'find_stale_incomplete_oauth_signups',
      { stale_minutes: STALE_MINUTES },
    );

    if (fetchErr) throw fetchErr;
    if (!staleRows || staleRows.length === 0) {
      return { success: true, count: 0 };
    }

    let count = 0;

    for (const row of staleRows) {
      const userId =
        typeof row === 'string'
          ? row
          : (row as { user_id?: string }).user_id;

      if (!userId) continue;

      const { error: publicErr } = await adminClient
        .from('users')
        .delete()
        .eq('id', userId);

      if (publicErr) {
        console.error(`Failed to delete public.users row: ${userId}`, publicErr);
        continue;
      }

      const { error: authErr } = await adminClient.auth.admin.deleteUser(userId);
      if (authErr) {
        console.error(`Failed to delete auth user: ${userId}`, authErr);
        continue;
      }

      count++;
    }

    return { success: true, count };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Cleanup incomplete OAuth signups error:', e);
    return { success: false, error: message, count: 0 };
  }
}
