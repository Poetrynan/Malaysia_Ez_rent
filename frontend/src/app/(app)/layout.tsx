'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PendingCountsProvider } from '@/lib/PendingCountsContext';
import AppSidebar from '@/components/AppSidebar';
import AppTopbar from '@/components/AppTopbar';
import { useApp } from '@/lib/ThemeProvider';
import { usePathname } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';

import { TenantDataProvider } from '@/lib/TenantDataContext';

function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang } = useApp();
  const { role, loading } = useAuth();
  const pathname = usePathname();

  // Guest mode: on /guest — ALWAYS hide sidebar & topbar (clean browsing experience)
  const isGuest = pathname === '/guest';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('loadingApp')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={isGuest ? { gridTemplateColumns: '1fr' } : undefined}>
      {!isGuest && <AppSidebar />}
      <main className="main-viewport" style={isGuest ? { gridColumn: '1 / -1' } : undefined}>
        {!isGuest && <AppTopbar />}
        <div className="main-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PendingCountsProvider>
        <TenantDataProvider>
          <AppShell>{children}</AppShell>
        </TenantDataProvider>
      </PendingCountsProvider>
    </AuthProvider>
  );
}

