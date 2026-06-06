'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { isMockDatabase } from '@/lib/supabase';
import { hasTenantIdentityType } from '@/lib/tenantIdentityUtils';

const BYPASS_PATHS = new Set(['/profile', '/guest']);

export default function TenantIdentityGate({ children }: { children: React.ReactNode }) {
  const { role, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [gateLoading, setGateLoading] = useState(true);

  useEffect(() => {
    if (authLoading || role !== 'student' || BYPASS_PATHS.has(pathname)) {
      setGateLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (isMockDatabase) {
          const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
          const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
          const u = users.find((x: { id: string }) => x.id === tenantId);
          if (!hasTenantIdentityType(u)) {
            router.replace('/profile');
            return;
          }
        } else {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          if (!user.user_metadata?.role) {
            router.replace('/profile');
            return;
          }

          const { data } = await supabase
            .from('users')
            .select('identity_type')
            .eq('id', user.id)
            .maybeSingle();

          const identityType = data?.identity_type || user.user_metadata?.identity_type;
          if (!identityType) {
            router.replace('/profile');
            return;
          }
        }
      } finally {
        if (!cancelled) setGateLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, role, pathname, router]);

  if (authLoading || (gateLoading && role === 'student' && !BYPASS_PATHS.has(pathname))) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return <>{children}</>;
}
