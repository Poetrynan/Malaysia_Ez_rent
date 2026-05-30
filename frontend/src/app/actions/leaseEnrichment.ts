'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function getLeaseEnrichmentData(leaseIds: string[], tenantIds: string[]) {
  try {
    const cookieStore = await cookies();

    // 1. Verify user is authenticated to prevent public anonymous queries
    const { createClient: createServerClient } = await import('@/utils/supabase/server');
    const supabase = createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated', leases: [], units: [], communities: [] };
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return { success: false, error: 'Service role key not configured', leases: [], units: [], communities: [] };
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false } }
    );

    let allLeases: any[] = [];

    // Query leases by ID
    if (leaseIds.length > 0) {
      const { data: explicitLeases } = await adminClient
        .from('leases')
        .select('id, tenant_id, unit_id, status')
        .in('id', leaseIds);
      if (explicitLeases) allLeases.push(...explicitLeases);
    }

    // Query leases by tenant ID (student user ID)
    if (tenantIds.length > 0) {
      const existingLeaseIds = new Set(allLeases.map(l => l.id));
      const { data: tenantLeases } = await adminClient
        .from('leases')
        .select('id, tenant_id, unit_id, status')
        .in('tenant_id', tenantIds);
      if (tenantLeases) {
        tenantLeases.forEach((al: any) => {
          if (!existingLeaseIds.has(al.id)) allLeases.push(al);
        });
      }
    }

    // Fetch units and communities
    let allUnits: any[] = [];
    let allComms: any[] = [];

    const unitIds = [...new Set(allLeases.map((l: any) => l.unit_id).filter(Boolean))];
    if (unitIds.length > 0) {
      const { data: units } = await adminClient
        .from('units')
        .select('id, room_type, community_id')
        .in('id', unitIds);
      if (units) {
        allUnits = units;
        const commIds = [...new Set(units.map((u: any) => u.community_id).filter(Boolean))];
        if (commIds.length > 0) {
          const { data: comms } = await adminClient
            .from('communities')
            .select('id, name')
            .in('id', commIds);
          if (comms) allComms = comms;
        }
      }
    }

    return {
      success: true,
      leases: allLeases,
      units: allUnits,
      communities: allComms
    };
  } catch (e: any) {
    console.error('Lease enrichment server action error:', e);
    return { success: false, error: e.message || 'Unknown error', leases: [], units: [], communities: [] };
  }
}
