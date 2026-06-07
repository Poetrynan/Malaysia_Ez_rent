'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { isMockDatabase } from '@/lib/supabase';
import { hasTenantIdentityType } from '@/lib/tenantIdentityUtils';
import { useTenantData, IdentityType } from '@/lib/TenantDataContext';

const BYPASS_PATHS = new Set(['/profile', '/guest']);

export default function TenantIdentityGate({ children }: { children: React.ReactNode }) {
  const { role, loading: authLoading } = useAuth();
  const { profileIdentityType, setProfileIdentityType } = useTenantData();
  const pathname = usePathname();
  const router = useRouter();
  const [gateLoading, setGateLoading] = useState(true);

  useEffect(() => {
    if (authLoading || role !== 'student' || BYPASS_PATHS.has(pathname)) {
      setGateLoading(false);
      return;
    }

    // Bypass check instantly if identity type is already cached in context
    if (profileIdentityType) {
      setGateLoading(false);
      return;
    }

    setGateLoading(true);
    let cancelled = false;

    (async () => {
      try {
        let identityType: IdentityType | null = null;
        if (isMockDatabase) {
          const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
          const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
          const u = users.find((x: { id: string }) => x.id === tenantId);
          if (u && hasTenantIdentityType(u)) {
            identityType = u.identity_type as IdentityType;
          }
        } else {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data } = await supabase
            .from('users')
            .select('identity_type')
            .eq('id', user.id)
            .maybeSingle();

          identityType = (data?.identity_type || user.user_metadata?.identity_type) as IdentityType | null;
        }

        if (cancelled) return;

        if (!identityType) {
          router.replace('/profile');
          return;
        }

        // Cache the identity type globally to prevent subsequent database hits
        setProfileIdentityType(identityType);
      } catch (err) {
        console.error('TenantIdentityGate check error:', err);
      } finally {
        if (!cancelled) setGateLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, role, pathname, router, profileIdentityType, setProfileIdentityType]);

  if (authLoading || (gateLoading && role === 'student' && !BYPASS_PATHS.has(pathname))) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return <>{children}</>;
}

