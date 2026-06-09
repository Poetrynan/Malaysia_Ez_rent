'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { TenantDataProvider, useTenantData } from '@/lib/TenantDataContext';
import { useTenantDataLoader } from '@/lib/useTenantDataLoader';
import { ListingsDataProvider } from '@/lib/ListingsDataContext';
import { PendingCountsProvider } from '@/lib/PendingCountsContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter, usePathname } from 'next/navigation';
import MobileTenantShell from '@/components/MobileTenantShell';

function MobileTenantGate({ children }: { children: React.ReactNode }) {
  const { role, loading: authLoading } = useAuth();
  useTenantDataLoader(); // Pre-load tenant profile data into context
  const { profileIdentityType, profileLoaded } = useTenantData();
  const { lang } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [identityChecked, setIdentityChecked] = useState(false);
  const [hasIdentity, setHasIdentity] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !role) {
      router.push('/login');
    }
  }, [authLoading, role, router]);

  // Identity gate
  useEffect(() => {
    if (authLoading || !role) return;
    if (role === 'admin') return;

    // Allow profile page always
    if (pathname === '/mt/profile') {
      setHasIdentity(true);
      setIdentityChecked(true);
      return;
    }

    // Check cached identity
    if (profileLoaded && profileIdentityType) {
      setHasIdentity(true);
      setIdentityChecked(true);
      return;
    }

    // If profile loaded but no identity, redirect
    if (profileLoaded && !profileIdentityType) {
      setHasIdentity(false);
      setIdentityChecked(true);
      router.replace('/mt/profile');
      return;
    }

    // If not loaded yet, check DB directly
    const checkIdentity = async () => {
      try {
        const { isMockDatabase } = await import('@/lib/supabase');
        if (isMockDatabase) {
          const stored = JSON.parse(localStorage.getItem('ez_user_identity_type') || 'null');
          if (stored) {
            setHasIdentity(true);
          } else {
            router.replace('/mt/profile');
          }
        } else {
          const { createClient } = await import('@/utils/supabase/client');
          const client = createClient();
          const { data: { user } } = await client.auth.getUser();
          if (user) {
            const identityType = user.user_metadata?.identity_type;
            if (identityType) {
              setHasIdentity(true);
            } else {
              const { data: dbUser } = await client.from('users').select('identity_type').eq('id', user.id).maybeSingle();
              if (dbUser?.identity_type) {
                setHasIdentity(true);
              } else {
                router.replace('/mt/profile');
              }
            }
          }
        }
      } catch {
        router.replace('/mt/profile');
      } finally {
        setIdentityChecked(true);
      }
    };
    checkIdentity();
  }, [authLoading, role, profileIdentityType, profileLoaded, pathname, router]);

  if (authLoading || !identityChecked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-base)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid var(--glass-border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {lang === 'zh' ? '加载中...' : 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  if (role === 'admin') return null;
  if (!role) return null;

  if (pathname === '/mt/profile') {
    return <MobileTenantShell lang={lang}>{children}</MobileTenantShell>;
  }

  if (!hasIdentity) return null;

  return <MobileTenantShell lang={lang}>{children}</MobileTenantShell>;
}

export default function MobileTenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PendingCountsProvider>
        <TenantDataProvider>
          <ListingsDataProvider>
            <MobileTenantGate>{children}</MobileTenantGate>
          </ListingsDataProvider>
        </TenantDataProvider>
      </PendingCountsProvider>
    </AuthProvider>
  );
}
