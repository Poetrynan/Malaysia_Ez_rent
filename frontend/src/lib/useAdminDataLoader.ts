'use client';

import { useEffect, useRef } from 'react';
import { useAdminData } from './AdminDataContext';
import { isMockDatabase } from './supabase';

/**
 * Lightweight data loader for mobile pages.
 * Loads communities, units, leases, interests, feedbacks into AdminDataProvider.
 * Extracted from AdminPanel's loadFromSupabase / loadFromLocalStorage.
 */
export function useAdminDataLoader() {
  const ctx = useAdminData();
  const loadingRef = useRef(false);

  useEffect(() => {
    if (ctx.isLoaded || loadingRef.current) return;
    loadingRef.current = true;

    if (isMockDatabase) {
      loadFromLocalStorage(ctx);
    } else {
      loadFromSupabase(ctx);
    }
  }, [ctx.isLoaded]);

  return ctx;
}

async function loadFromSupabase(ctx: ReturnType<typeof useAdminData>) {
  try {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();

    // Auto-expire leases
    try { await supabase.rpc('expire_ended_leases'); } catch {}

    const [commRes, unitRes, leaseRes, paymentRes, userRes, interestRes, feedbackRes, adminRes] = await Promise.all([
      supabase.from('communities').select('*'),
      supabase.from('units').select('*'),
      supabase.from('leases').select(`
        *,
        units ( id, room_type, community_id, rent, status, description, agent_id,
          communities ( id, name, address, lat, lng )
        )
      `),
      supabase.from('payment_records').select('*'),
      supabase.from('users').select('id, full_name, phone'),
      supabase.from('tenant_interests').select('*'),
      supabase.from('feedbacks').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_users').select('id'),
    ]);

    const c = commRes.data || [];
    const u = unitRes.data || [];
    const l = leaseRes.data || [];
    const p = paymentRes.data || [];
    const users = userRes.data || [];
    const admins = adminRes.data || [];

    ctx.setCommunities(c);
    ctx.setUnits(u);
    ctx.setAllUsers(users);
    ctx.setAdminIds(admins.map((a: any) => a.id));
    ctx.setLeases(l.map((row: any) => {
      const { units: nestedUnit, ...lease } = row;
      const unitData = nestedUnit ? {
        id: nestedUnit.id,
        community_id: nestedUnit.community_id,
        room_type: nestedUnit.room_type,
        rent: nestedUnit.rent,
        status: nestedUnit.status,
        description: nestedUnit.description ?? '',
        agent_id: nestedUnit.agent_id,
      } : u.find((x: any) => x.id === lease.unit_id);
      const communityData = nestedUnit?.communities ? {
        id: nestedUnit.communities.id,
        name: nestedUnit.communities.name,
        address: nestedUnit.communities.address ?? '',
        lat: nestedUnit.communities.lat ?? 0,
        lng: nestedUnit.communities.lng ?? 0,
      } : (() => {
        const un = unitData ?? u.find((x: any) => x.id === lease.unit_id);
        return un ? c.find((x: any) => x.id === un.community_id) : undefined;
      })();
      return {
        ...lease,
        unitData,
        communityData,
        tenantName: users.find((x: any) => x.id === lease.tenant_id)?.full_name || lease.tenant_id,
        payments: p.filter((x: any) => x.lease_id === lease.id),
      };
    }));
    if (interestRes.data) ctx.setInterests(interestRes.data);
    if (feedbackRes.data) ctx.setFeedbacks(feedbackRes.data);
    ctx.setIsLoaded(true);
  } catch (e) {
    console.error('[Mobile] Failed to load from Supabase:', e);
    // Fallback to localStorage
    loadFromLocalStorage(ctx);
  }
}

function loadFromLocalStorage(ctx: ReturnType<typeof useAdminData>) {
  try {
    const c = JSON.parse(localStorage.getItem('ez_communities') || '[]');
    const u = JSON.parse(localStorage.getItem('ez_units') || '[]');
    let l = JSON.parse(localStorage.getItem('ez_leases') || '[]');
    const p = JSON.parse(localStorage.getItem('ez_payments') || '[]');
    const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
    const ints = JSON.parse(localStorage.getItem('ez_interests') || '[]');
    const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
    const feedbacks = JSON.parse(localStorage.getItem('ez_feedbacks') || '[]');

    // Auto-expire leases
    const today = new Date().toISOString().split('T')[0];
    let changed = false;
    l = l.map((lease: any) => {
      if (lease.status === 'active' && lease.end_date < today) {
        changed = true;
        return { ...lease, status: 'expired' };
      }
      return lease;
    });
    if (changed) localStorage.setItem('ez_leases', JSON.stringify(l));

    ctx.setCommunities(c);
    ctx.setUnits(u);
    ctx.setAllUsers(users);
    ctx.setAdminIds(admins.map((a: any) => a.id));
    ctx.setLeases(l.map((lease: any) => ({
      ...lease,
      unitData: u.find((x: any) => x.id === lease.unit_id),
      communityData: (() => {
        const un = u.find((x: any) => x.id === lease.unit_id);
        return un ? c.find((x: any) => x.id === un.community_id) : undefined;
      })(),
      tenantName: users.find((x: any) => x.id === lease.tenant_id)?.full_name || lease.tenant_id,
      payments: p.filter((x: any) => x.lease_id === lease.id),
    })));
    ctx.setInterests(ints);
    ctx.setFeedbacks(feedbacks);
    ctx.setIsLoaded(true);
  } catch (e) {
    console.error('[Mobile] Failed to load from localStorage:', e);
  }
}
