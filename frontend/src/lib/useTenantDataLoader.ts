'use client';

import { useEffect, useRef } from 'react';
import { useTenantData } from './TenantDataContext';
import { isMockDatabase } from './supabase';

/**
 * Loads tenant profile data into TenantDataContext.
 * Similar to useAdminDataLoader but for tenant-side.
 * Caches via profileLoaded flag to avoid re-fetching.
 */
export function useTenantDataLoader() {
  const ctx = useTenantData();
  const loadingRef = useRef(false);

  useEffect(() => {
    if (ctx.profileLoaded || loadingRef.current) return;
    loadingRef.current = true;

    if (isMockDatabase) {
      loadFromLocalStorage(ctx);
    } else {
      loadFromSupabase(ctx);
    }
  }, [ctx.profileLoaded]);

  return ctx;
}

async function loadFromSupabase(ctx: ReturnType<typeof useTenantData>) {
  try {
    const { createClient } = await import('@/utils/supabase/client');
    const client = createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { ctx.setProfileLoaded(true); return; }

    ctx.setProfileName(user.user_metadata?.full_name || '');

    const { data: dbUser } = await client
      .from('users')
      .select('phone, school, company, identity_type, local_id_number, passport_number, ic_photo_front_url, ic_photo_back_url, passport_photo_url, student_card_url, work_permit_photo_url, unit_number')
      .eq('id', user.id)
      .maybeSingle();

    if (dbUser) {
      ctx.setProfilePhone(dbUser.phone || '');
      ctx.setProfileSchool(dbUser.school || '');
      ctx.setProfileCompany(dbUser.company || '');
      ctx.setProfileIdentityType(dbUser.identity_type || user.user_metadata?.identity_type || null);
      ctx.setProfileLocalId(dbUser.local_id_number || '');
      ctx.setProfilePassport(dbUser.passport_number || '');
      ctx.setIcFrontUrl(dbUser.ic_photo_front_url || null);
      ctx.setIcBackUrl(dbUser.ic_photo_back_url || null);
      ctx.setPassportPhotoUrl(dbUser.passport_photo_url || null);
      ctx.setProfileStudentCardUrl(dbUser.student_card_url || null);
      ctx.setWorkPermitUrl(dbUser.work_permit_photo_url || null);
      ctx.setProfileUnit(dbUser.unit_number || '');
    } else {
      ctx.setProfileIdentityType(user.user_metadata?.identity_type || null);
    }
  } catch (e) {
    console.error('[TenantDataLoader] Failed to load from Supabase:', e);
    loadFromLocalStorage(ctx);
  }
  ctx.setProfileLoaded(true);
}

function loadFromLocalStorage(ctx: ReturnType<typeof useTenantData>) {
  try {
    const myId = localStorage.getItem('ez_tenant_id');
    const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
    const me = users.find((u: any) => u.id === myId);
    if (me) {
      ctx.setProfileName(me.full_name || '');
      ctx.setProfilePhone(me.phone || '');
      ctx.setProfileSchool(me.school || '');
      ctx.setProfileCompany(me.company || '');
      ctx.setProfileIdentityType(me.identity_type || null);
      ctx.setProfileLocalId(me.local_id_number || '');
      ctx.setProfilePassport(me.passport_number || '');
      ctx.setIcFrontUrl(me.ic_photo_front_url || null);
      ctx.setIcBackUrl(me.ic_photo_back_url || null);
      ctx.setPassportPhotoUrl(me.passport_photo_url || null);
      ctx.setProfileStudentCardUrl(me.student_card_url || null);
      ctx.setWorkPermitUrl(me.work_permit_photo_url || null);
      ctx.setProfileUnit(me.unit_number || '');
    }
  } catch (e) {
    console.error('[TenantDataLoader] Failed to load from localStorage:', e);
  }
  ctx.setProfileLoaded(true);
}
