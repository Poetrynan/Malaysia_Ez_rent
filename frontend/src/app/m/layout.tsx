'use client';

import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AdminDataProvider } from '@/lib/AdminDataContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';
import MobileShell from '@/components/MobileShell';

function MobileGate({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const { lang } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/login');
    }
  }, [loading, role, router]);

  if (loading) {
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

  if (role !== 'admin') return null;

  return <MobileShell lang={lang}>{children}</MobileShell>;
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminDataProvider>
        <MobileGate>{children}</MobileGate>
      </AdminDataProvider>
    </AuthProvider>
  );
}
