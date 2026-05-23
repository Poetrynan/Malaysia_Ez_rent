'use client';

import React, { useState, useEffect } from 'react';
import { Home, Calendar, CreditCard, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import LeaseLedgerCard from './LeaseLedgerCard';
import { useApp } from '@/lib/ThemeProvider';

interface Lease {
  id: string; unit_id: string; tenant_id: string;
  start_date: string; end_date: string;
  monthly_rent: number; deposit_amount: number; status: string;
}
interface Payment {
  id: string; lease_id: string; billing_month: string;
  paid: boolean; paid_date?: string | null; admin_notes?: string;
}
interface Unit { id: string; community_id: string; unit_number: string; room_type: string; }
interface Community { id: string; name: string; }

export default function StudentPortal() {
  const { t, lang } = useApp();
  const [lease, setLease] = useState<Lease | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = () => {
    const leases: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
    const allPayments: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
    const units: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
    const communities: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
    const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
    const myLease = leases.find(l => l.tenant_id === tenantId && l.status === 'active') || null;
    setLease(myLease);
    if (myLease) {
      setPayments(allPayments.filter(p => p.lease_id === myLease.id));
      const u = units.find(u => u.id === myLease.unit_id) || null;
      setUnit(u);
      if (u) setCommunity(communities.find(c => c.id === u.community_id) || null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tick]);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>{t('loadingApp')}</div>;

  if (!lease) return (
    <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
      <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
      <h3 style={{ marginBottom: 8 }}>{t('noLeaseTitle')}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 380, margin: '0 auto' }}>{t('noLeaseDesc')}</p>
    </div>
  );

  const today = new Date();
  const start = new Date(lease.start_date);
  const end = new Date(lease.end_date);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const elapsedDays = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / 86400000));
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  const progress = Math.min(1, elapsedDays / totalDays);
  const paidCount = payments.filter(p => p.paid).length;
  const nextUnpaid = payments.find(p => !p.paid);

  const R = 70, C = 2 * Math.PI * R;
  const dashOffset = C * (1 - progress);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const fmtMonth = (d: string) => new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero lease card */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-surface) 100%)' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* SVG Ring */}
          <div className="countdown-svg-container" style={{ width: 160, height: 160 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={R} fill="none" stroke="var(--glass-border)" strokeWidth="10" />
              <circle
                cx="80" cy="80" r={R}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={dashOffset}
                className="progress-ring-circle"
                style={{ filter: 'drop-shadow(0 0 6px var(--primary-glow))' }}
              />
            </svg>
            <div className="progress-text">
              <div className="progress-number">{remainingDays}</div>
              <div className="progress-label">{t('daysLeft')}</div>
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{t('leaseProgress')}</div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>
              {community?.name} · {unit?.unit_number}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>
              {unit?.room_type} &nbsp;·&nbsp;
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>RM {lease.monthly_rent}{t('perMonth')}</span>
            </p>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { icon: <Calendar size={14} />, label: t('leaseElapsed'), val: `${Math.round(progress * 100)}%` },
                { icon: <CreditCard size={14} />, label: t('monthsPaid'), val: `${paidCount} / ${payments.length}` },
                { icon: <Clock size={14} />, label: t('leaseExpires'), val: fmtDate(lease.end_date) },
              ].map((s, i) => (
                <div key={i} className="stat-chip">
                  <span style={{ color: 'var(--primary)' }}>{s.icon}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next due banner */}
        {nextUnpaid ? (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-light)', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-body)' }}>
              {t('ledgerNextDue')}：<strong>{fmtMonth(nextUnpaid.billing_month)}</strong>
              &nbsp;· RM {lease.monthly_rent}
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--success-light)', border: '1px solid var(--success)', display: 'flex', gap: 8 }}>
            <TrendingUp size={15} style={{ color: 'var(--success)' }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-body)' }}><strong>{t('ledgerAllPaid')}</strong> {t('ledgerAllPaidDesc')}</span>
          </div>
        )}
      </div>

      {/* Ledger */}
      <LeaseLedgerCard
        community_name={community?.name || ''}
        unit_number={unit?.unit_number || ''}
        start_date={lease.start_date}
        end_date={lease.end_date}
        monthly_rent={lease.monthly_rent}
        payments={payments}
        onPaymentUpdated={() => setTick(t2 => t2 + 1)}
      />

      {/* Deposit */}
      <div className="glass-card">
        <h4 style={{ fontSize: '0.9rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Home size={16} style={{ color: 'var(--primary)' }} /> {t('ledgerDepositTitle')}
        </h4>
        {[
          { label: t('securityDeposit'), val: lease.monthly_rent * 2 },
          { label: t('utilityDeposit'), val: lease.monthly_rent * 0.5 },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
            <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>RM {r.val.toLocaleString()}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', fontSize: '0.875rem', fontWeight: 700 }}>
          <span style={{ color: 'var(--text-body)' }}>{t('totalDeposit')}</span>
          <span style={{ color: 'var(--primary)' }}>RM {(lease.monthly_rent * 2.5).toLocaleString()}</span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>{t('depositNote')}</p>
      </div>
    </div>
  );
}
