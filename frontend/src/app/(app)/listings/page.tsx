'use client';

import React, { useEffect } from 'react';
import PropertyListings from '@/components/PropertyListings';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';

export default function ListingsPage() {
  const { role, loading } = useAuth();
  const { t, lang } = useApp();
  const router = useRouter();

  useEffect(() => {
    document.title = `${t('navListings')} | Malaysia Ez Rent`;
  }, [t]);

  // Redirect based on auth state
  useEffect(() => {
    if (loading) return;
    if (!role) {
      router.replace('/guest');
    } else if (role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [loading, role, router]);

  // Loading: show spinner while checking identity
  if (loading || !role) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {lang === 'zh' ? '身份校验中...' : 'Verifying identity...'}
          </div>
        </div>
      </div>
    );
  }

  // Student: full access
  return <PropertyListings />;
}
