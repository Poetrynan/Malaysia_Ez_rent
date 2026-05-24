'use client';

import React, { useState, useEffect } from 'react';
import { Home, Calendar, CreditCard, AlertCircle, TrendingUp, Clock, MessageSquare, X, Send, User, Save, ChevronDown, ChevronUp } from 'lucide-react';
import LeaseLedgerCard from './LeaseLedgerCard';
import { useApp } from '@/lib/ThemeProvider';
import { isMockDatabase } from '@/lib/supabase';

interface Lease {
  id: string; unit_id: string; tenant_id: string;
  start_date: string; end_date: string;
  monthly_rent: number; deposit_amount: number;
  security_deposit_months?: number; utility_deposit_months?: number;
  status: string;
}
interface Payment {
  id: string; lease_id: string; billing_month: string;
  paid: boolean; paid_date?: string | null; evidence_url?: string | null; status?: string; admin_notes?: string;
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<{ id: string; content: string; status: string; admin_reply: string | null; created_at: string }[]>([]);
  const [showMyFeedbacks, setShowMyFeedbacks] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const profileComplete = profileName.trim().length > 0;

  const loadProfile = async () => {
    let name = '';
    if (isMockDatabase) {
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
      const u = users.find((u: any) => u.id === tenantId);
      if (u) { name = u.full_name || ''; setProfileName(name); setProfilePhone(u.phone || ''); }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('users').select('full_name, phone').eq('id', user.id).single();
        if (data) { name = data.full_name || ''; setProfileName(name); setProfilePhone(data.phone || ''); }
      } catch (e) { console.error('Load profile error:', e); }
    }
    if (!name) setShowProfile(true);
  };

  const saveProfile = async () => {
    if (!profileName.trim()) return;
    setProfileSaving(true);
    if (isMockDatabase) {
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
      const idx = users.findIndex((u: any) => u.id === tenantId);
      if (idx !== -1) {
        users[idx].full_name = profileName.trim();
        users[idx].phone = profilePhone.trim();
      } else {
        users.push({ id: tenantId, full_name: profileName.trim(), phone: profilePhone.trim() });
      }
      localStorage.setItem('ez_users', JSON.stringify(users));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setProfileSaving(false); return; }
        const { error } = await supabase.from('users').upsert({ id: user.id, full_name: profileName.trim(), phone: profilePhone.trim() });
        if (error) { console.error('Save profile error:', error); setProfileSaving(false); return; }
      } catch (e) { console.error('Save profile error:', e); setProfileSaving(false); return; }
    }
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const load = async () => {
    if (isMockDatabase) {
      const leases: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const allPayments: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const units: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
      const communities: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const myLease = leases.find(l => l.tenant_id === tenantId && l.status === 'active') || null;
      setLease(myLease);
      if (myLease) {
        setPayments(
          allPayments
            .filter(p => p.lease_id === myLease.id)
            .sort((a, b) => a.billing_month.localeCompare(b.billing_month))
        );
        const u = units.find(u => u.id === myLease.unit_id) || null;
        setUnit(u);
        if (u) setCommunity(communities.find(c => c.id === u.community_id) || null);
      }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: leaseData } = await supabase
          .from('leases').select('*')
          .eq('tenant_id', user.id).eq('status', 'active').limit(1).single();

        if (leaseData) {
          setLease(leaseData);
          const [payRes, unitRes] = await Promise.all([
            supabase
              .from('payment_records')
              .select('*')
              .eq('lease_id', leaseData.id)
              .order('billing_month', { ascending: true }),
            supabase.from('units').select('id, community_id, unit_number, room_type').eq('id', leaseData.unit_id).single(),
          ]);
          setPayments(payRes.data || []);
          if (unitRes.data) {
            setUnit(unitRes.data);
            const { data: commData } = await supabase.from('communities').select('id, name').eq('id', unitRes.data.community_id).single();
            if (commData) setCommunity(commData);
          }
        }
      } catch (e) { console.error('StudentPortal load error:', e); }
    }
    setLoading(false);
  };

  const loadMyFeedbacks = async () => {
    if (isMockDatabase) {
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      setMyFeedbacks(all.filter((f: any) => f.user_id === tenantId));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('feedback').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setMyFeedbacks(data);
      } catch (e) { console.error('Load feedback error:', e); }
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    if (!profileComplete) { setShowProfile(true); return; }
    setFeedbackSubmitting(true);
    if (isMockDatabase) {
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      all.unshift({ id: `fb-${Date.now()}`, user_id: tenantId, content: feedbackText.trim(), status: 'pending', admin_reply: null, created_at: new Date().toISOString() });
      localStorage.setItem('ez_feedback', JSON.stringify(all));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('feedback').insert({ user_id: user.id, content: feedbackText.trim() });
        if (error) { console.error('Submit feedback error:', error); setFeedbackSubmitting(false); return; }
      } catch (e) { console.error('Submit feedback error:', e); setFeedbackSubmitting(false); return; }
    }
    setFeedbackText('');
    setFeedbackSubmitting(false);
    setFeedbackSuccess(true);
    setTimeout(() => setFeedbackSuccess(false), 3000);
    loadMyFeedbacks();
  };

  useEffect(() => { load(); loadProfile(); }, [tick]);

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
      {/* Profile */}
      <div className="glass-card">
        <div
          onClick={() => setShowProfile(!showProfile)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <h4 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <User size={16} style={{ color: profileComplete ? 'var(--primary)' : 'var(--danger)' }} /> {t('myProfile')}
            {profileComplete && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>（{profileName}）</span>}
            {!profileComplete && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />}
          </h4>
          {showProfile ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>
        {showProfile && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('profileName')}</label>
              <input
                type="text"
                className="form-input"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder={t('profileNamePlaceholder')}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('profilePhone')}</label>
              <input
                type="tel"
                className="form-input"
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
                placeholder={t('profilePhonePlaceholder')}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={saveProfile} disabled={profileSaving || !profileName.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: profileName.trim() ? 'var(--primary)' : 'var(--glass-border)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', cursor: profileName.trim() ? 'pointer' : 'not-allowed' }}>
                <Save size={14} /> {profileSaving ? t('saving') : t('profileSave')}
              </button>
              {profileSaved && (
                <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>{t('profileSaved')}</span>
              )}
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{t('profileHint')}</p>
          </div>
        )}
      </div>

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
          { label: `${t('securityDeposit')} (${lease.security_deposit_months ?? 2} ${t('months')})`, val: lease.monthly_rent * (lease.security_deposit_months ?? 2) },
          { label: `${t('utilityDeposit')} (${lease.utility_deposit_months ?? 0.5} ${t('months')})`, val: lease.monthly_rent * (lease.utility_deposit_months ?? 0.5) },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
            <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>RM {r.val.toLocaleString()}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', fontSize: '0.875rem', fontWeight: 700 }}>
          <span style={{ color: 'var(--text-body)' }}>{t('totalDeposit')}</span>
          <span style={{ color: 'var(--primary)' }}>RM {(lease.monthly_rent * ((lease.security_deposit_months ?? 2) + (lease.utility_deposit_months ?? 0.5))).toLocaleString()}</span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>{t('depositNote')}</p>
      </div>

      {/* Feedback */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h4 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <MessageSquare size={16} style={{ color: 'var(--primary)' }} /> {t('feedback')}
          </h4>
          <button onClick={() => { setShowMyFeedbacks(!showMyFeedbacks); if (!showMyFeedbacks) loadMyFeedbacks(); }}
            style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {t('feedbackMy')} ({myFeedbacks.length})
          </button>
        </div>

        {/* Submit form */}
        <div style={{ marginBottom: 12 }}>
          {!profileComplete && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)', marginBottom: 12 }}>
              <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-body)' }}>{t('profileRequired')}</span>
            </div>
          )}
          <textarea
            className="form-textarea"
            rows={3}
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
            style={{ resize: 'vertical', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            {feedbackSuccess && (
              <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>{t('feedbackSuccess')}</span>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={submitFeedback} disabled={feedbackSubmitting || !feedbackText.trim() || !profileComplete}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: (feedbackText.trim() && profileComplete) ? 'var(--primary)' : 'var(--glass-border)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', cursor: (feedbackText.trim() && profileComplete) ? 'pointer' : 'not-allowed' }}>
              <Send size={13} /> {t('feedbackSubmit')}
            </button>
          </div>
        </div>

        {/* My feedback list */}
        {showMyFeedbacks && (
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
            {myFeedbacks.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>{t('feedbackNoItems')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto' }}>
                {myFeedbacks.map(f => (
                  <div key={f.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(f.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: f.status === 'resolved' ? 'var(--success-light)' : 'var(--warning-light)', color: f.status === 'resolved' ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                        {f.status === 'resolved' ? t('feedbackResolved') : t('feedbackPending')}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-body)', margin: 0, whiteSpace: 'pre-wrap' }}>{f.content}</p>
                    {f.admin_reply && (
                      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--primary-light)', border: '1px solid var(--primary-glow)' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>{t('feedbackReply')}：</span>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{f.admin_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
