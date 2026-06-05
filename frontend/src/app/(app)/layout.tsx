'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PendingCountsProvider } from '@/lib/PendingCountsContext';
import AppSidebar from '@/components/AppSidebar';
import AppTopbar from '@/components/AppTopbar';
import { useApp } from '@/lib/ThemeProvider';
import { usePathname } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';

function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang } = useApp();
  const { role, loading, agentRegStatus } = useAuth();
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
          {/* Agent Registration Status Banners */}
          {role === 'student' && agentRegStatus === 'pending' && (
            <div style={{
              margin: '12px 16px 0', borderRadius: 10, overflow: 'hidden',
              background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04), rgba(245,158,11,0.12))',
              border: '1px solid rgba(245,158,11,0.25)', position: 'relative', height: 40,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', height: '100%', whiteSpace: 'nowrap',
                animation: 'marquee 20s linear infinite', paddingLeft: '100%',
              }}>
                <Building2 size={14} style={{ color: '#D97706', marginRight: 8, flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#D97706' }}>
                  {lang === 'zh'
                    ? '⚠️ 您的中介注册申请正在审核中，审核通过后将自动移入中介管理端。当前为租客界面。'
                    : '⚠️ Your agent registration is under review. After approval, you will be moved to the agent portal. Currently viewing tenant interface.'}
                </span>
                <span style={{ margin: '0 40px', color: 'rgba(245,158,11,0.3)' }}>●</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#D97706' }}>
                  {lang === 'zh'
                    ? '⚠️ 您的中介注册申请正在审核中，审核通过后将自动移入中介管理端。当前为租客界面。'
                    : '⚠️ Your agent registration is under review. After approval, you will be moved to the agent portal. Currently viewing tenant interface.'}
                </span>
              </div>
            </div>
          )}
          {role === 'student' && agentRegStatus === 'approved' && (
            <div style={{
              margin: '12px 16px 0', padding: '14px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
              border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={20} style={{ color: '#059669' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 2 }}>
                  {lang === 'zh' ? '中介申请已通过！' : 'Agent Application Approved!'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {lang === 'zh'
                    ? '恭喜！您的中介申请已审核通过。请重新登录以进入中介管理后台。'
                    : 'Congratulations! Your agent application has been approved. Please log in again to access the admin panel.'}
                </div>
              </div>
            </div>
          )}
          {role === 'student' && agentRegStatus === 'rejected' && (
            <div style={{
              margin: '12px 16px 0', padding: '14px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
              border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} style={{ color: '#DC2626' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 2 }}>
                  {lang === 'zh' ? '中介申请未通过' : 'Agent Application Rejected'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {lang === 'zh'
                    ? '很抱歉，您的中介申请未通过审核。如有疑问请联系管理员。'
                    : 'Sorry, your agent application was not approved. Please contact admin for details.'}
                </div>
              </div>
            </div>
          )}
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
        <AppShell>{children}</AppShell>
      </PendingCountsProvider>
    </AuthProvider>
  );
}
