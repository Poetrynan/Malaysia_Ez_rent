'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import { supabase as sb, isMockDatabase } from '@/lib/supabase';
import {
  FileText, MapPin, Calendar, DollarSign, Users, CheckCircle2, XCircle,
  Clock, AlertCircle, ChevronDown, ChevronUp, Camera
} from 'lucide-react';
import { compressImageToDataUrl, compressDataUrl, EVIDENCE_IMAGE_PRESET } from '@/utils/compressImage';

export default function MobileLeasePage() {
  const { role } = useAuth();
  const { lang } = useApp();

  const [lease, setLease] = useState<any | null>(null);
  const [unit, setUnit] = useState<any | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [roommates, setRoommates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackPhoto, setFeedbackPhoto] = useState<string | null>(null);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        if (isMockDatabase) {
          const myId = localStorage.getItem('ez_tenant_id');
          const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
          const myLease = leases.find((l: any) => l.tenant_id === myId && l.status === 'active');
          setLease(myLease || null);
          if (myLease) {
            const units = JSON.parse(localStorage.getItem('ez_units') || '[]');
            const comms = JSON.parse(localStorage.getItem('ez_communities') || '[]');
            const u = units.find((u: any) => u.id === myLease.unit_id);
            setUnit(u || null);
            if (u) setCommunity(comms.find((c: any) => c.id === u.community_id) || null);
            const payments = JSON.parse(localStorage.getItem('ez_payments') || '[]');
            setPayments(payments.filter((p: any) => p.lease_id === myLease.id).sort((a: any, b: any) => a.billing_month.localeCompare(b.billing_month)));
          }
          setHistory(leases.filter((l: any) => l.tenant_id === myId && l.status !== 'active'));
        } else {
          const { createClient } = await import('@/utils/supabase/client');
          const client = createClient();
          const { data: { user } } = await client.auth.getUser();
          if (!user) { setLoading(false); return; }

          const { data: leases } = await client.from('leases')
            .select('*, units(*, communities(*))')
            .eq('tenant_id', user.id)
            .in('status', ['active', 'expired', 'terminated', 'completed'])
            .order('created_at', { ascending: false });

          const activeLease = leases?.find(l => l.status === 'active');
          setLease(activeLease || null);
          if (activeLease?.units) {
            setUnit(activeLease.units);
            setCommunity(activeLease.units.communities);
            const { data: p } = await client.from('payment_records')
              .select('*').eq('lease_id', activeLease.id).order('billing_month');
            setPayments(p || []);
          }
          setHistory(leases?.filter(l => l.status !== 'active') || []);
        }
      } catch (e) { console.error('Load lease error:', e); }
      setLoading(false);
    };
    load();
  }, []);

  const handleFeedbackPhoto = useCallback(async (file: File) => {
    try {
      const dataUrl = await compressImageToDataUrl(file, EVIDENCE_IMAGE_PRESET);
      setFeedbackPhoto(dataUrl);
    } catch { showToast('error', lang === 'zh' ? '图片压缩失败' : 'Image compression failed'); }
  }, [lang, showToast]);

  const submitFeedback = useCallback(async () => {
    if (!feedbackCategory || !feedbackText.trim()) {
      showToast('error', lang === 'zh' ? '请填写分类和描述' : 'Please fill category and description'); return;
    }
    setFeedbackSending(true);
    try {
      if (isMockDatabase) {
        const feedbacks = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
        feedbacks.push({
          id: `fb-${Date.now()}`, user_id: localStorage.getItem('ez_tenant_id'),
          category: feedbackCategory, description: feedbackText, photo_url: feedbackPhoto,
          status: 'pending', replies: '[]', created_at: new Date().toISOString(),
        });
        localStorage.setItem('ez_feedback', JSON.stringify(feedbacks));
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        const { data: { user } } = await client.auth.getUser();
        let photoUrl = null;
        if (feedbackPhoto && feedbackPhoto.startsWith('data:')) {
          const blob = await compressDataUrl(feedbackPhoto, EVIDENCE_IMAGE_PRESET);
          const { data } = await client.storage.from('unit-media').upload(`feedback/${Date.now()}.jpg`, blob, { contentType: 'image/jpeg' });
          if (data) photoUrl = client.storage.from('unit-media').getPublicUrl(data.path).data.publicUrl;
        }
        await client.from('maintenance_requests').insert({
          user_id: user?.id, lease_id: lease?.id, category: feedbackCategory,
          description: feedbackText, photo_url: photoUrl || feedbackPhoto,
        });
      }
      setFeedbackCategory(''); setFeedbackText(''); setFeedbackPhoto(null);
      showToast('success', lang === 'zh' ? '工单已提交' : 'Ticket submitted');
    } catch (e: any) {
      showToast('error', e.message || (lang === 'zh' ? '提交失败' : 'Submission failed'));
    } finally { setFeedbackSending(false); }
  }, [feedbackCategory, feedbackText, feedbackPhoto, lease, lang, showToast]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    active: { bg: 'var(--success-light)', border: 'var(--success)', text: 'var(--success)', label: lang === 'zh' ? '生效中' : 'Active' },
    expired: { bg: 'var(--warning-light)', border: 'var(--warning)', text: 'var(--warning)', label: lang === 'zh' ? '已到期' : 'Expired' },
    terminated: { bg: 'var(--danger-light)', border: 'var(--danger)', text: 'var(--danger)', label: lang === 'zh' ? '已终止' : 'Terminated' },
    completed: { bg: 'var(--glass-bg)', border: 'var(--glass-border)', text: 'var(--text-muted)', label: lang === 'zh' ? '已归档' : 'Archived' },
  };

  const CATS = ['Aircon', 'Plumbing', 'Electrical', 'Furniture', 'Appliance', lang === 'zh' ? '其他' : 'Others'];

  return (
    <div style={{ paddingBottom: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.08)' : 'var(--danger-light)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.2)' : 'var(--danger)'}`,
          backdropFilter: 'blur(16px)',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} /> : <AlertCircle size={15} style={{ color: 'var(--danger)' }} />}
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: toast.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>{toast.msg}</span>
        </div>
      )}

      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 4 }}>
        {lang === 'zh' ? '我的租约' : 'My Lease'}
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['current', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            background: activeTab === tab ? 'var(--primary)' : 'var(--glass-bg)',
            color: activeTab === tab ? 'white' : 'var(--text-muted)',
            border: `1px solid ${activeTab === tab ? 'var(--primary)' : 'var(--glass-border)'}`,
            transition: 'all 0.2s',
          }}>
            {tab === 'current' ? (lang === 'zh' ? '当前租约' : 'Current') : (lang === 'zh' ? '历史租约' : 'History')}
          </button>
        ))}
      </div>

      {activeTab === 'current' ? (
        lease ? (
          <>
            {/* Lease card */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 16,
              padding: '16px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} style={{ color: 'var(--primary)' }} />
                  {community?.name || '—'} · {unit?.room_type || '—'}
                </div>
                {(() => { const s = statusColors[lease.status] || statusColors.active; return (
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{s.label}</span>
                ); })()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.78rem' }}>
                <div><DollarSign size={13} style={{ color: 'var(--primary)', verticalAlign: -2 }} /> <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '月租' : 'Rent'}:</span> <strong style={{ color: 'var(--primary)' }}>RM {Number(lease.monthly_rent).toLocaleString()}</strong></div>
                <div><Calendar size={13} style={{ color: 'var(--text-muted)', verticalAlign: -2 }} /> <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '起始' : 'Start'}:</span> {lease.start_date?.slice(0, 10)}</div>
                <div><Calendar size={13} style={{ color: 'var(--text-muted)', verticalAlign: -2 }} /> <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '到期' : 'End'}:</span> {lease.end_date?.slice(0, 10)}</div>
                {lease.unit_number && <div><MapPin size={13} style={{ color: 'var(--text-muted)', verticalAlign: -2 }} /> <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '单元号' : 'Unit'}:</span> {lease.unit_number}</div>}
              </div>
            </div>

            {/* Payments */}
            {payments.length > 0 && (
              <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 16,
                padding: '16px', marginBottom: 16,
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 12 }}>
                  {lang === 'zh' ? '账单记录' : 'Payment Records'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {payments.map(p => {
                    const month = new Date(p.billing_month).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', year: '2-digit' });
                    const paid = p.paid || p.status === 'approved';
                    return (
                      <div key={p.id} style={{
                        background: paid ? 'var(--success-light)' : 'var(--danger-light)',
                        border: `1px solid ${paid ? 'var(--success)' : 'var(--danger)'}`,
                        borderRadius: 10, padding: '10px 8px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{month}</div>
                        {paid ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <XCircle size={18} style={{ color: 'var(--danger)' }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Feedback */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 16,
              padding: '16px', marginBottom: 16,
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 14 }}>
                {lang === 'zh' ? '提交维修工单' : 'Submit Maintenance Ticket'}
              </div>
              <select value={feedbackCategory} onChange={e => setFeedbackCategory(e.target.value)} style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: '0.82rem', marginBottom: 10,
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-h)', boxSizing: 'border-box',
              }}>
                <option value="">{lang === 'zh' ? '选择分类...' : 'Select category...'}</option>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder={lang === 'zh' ? '描述问题...' : 'Describe the issue...'} rows={3} style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: '0.82rem', marginBottom: 10, resize: 'vertical',
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-h)', boxSizing: 'border-box',
              }} />
              {feedbackPhoto ? (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <img src={feedbackPhoto} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10 }} />
                  <button onClick={() => setFeedbackPhoto(null)} style={{
                    position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer',
                  }}>×</button>
                </div>
              ) : (
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px', borderRadius: 10, cursor: 'pointer', marginBottom: 10,
                  border: '2px dashed var(--primary-glow)', background: 'var(--primary-light)',
                }}>
                  <Camera size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '添加照片' : 'Add photo'}</span>
                  <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleFeedbackPhoto(e.target.files[0]); }} style={{ display: 'none' }} />
                </label>
              )}
              <button onClick={submitFeedback} disabled={feedbackSending} style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'var(--gradient-primary)', color: 'white', fontSize: '0.85rem', fontWeight: 700,
                opacity: feedbackSending ? 0.7 : 1,
              }}>
                {feedbackSending ? (lang === 'zh' ? '提交中...' : 'Submitting...') : (lang === 'zh' ? '提交工单' : 'Submit Ticket')}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FileText size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 6 }}>
              {lang === 'zh' ? '暂无活跃租约' : 'No active lease'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {lang === 'zh' ? '去「找房」页面看看吧' : 'Check the Listings page to find a room'}
            </div>
          </div>
        )
      ) : (
        /* History tab */
        history.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map(h => {
              const s = statusColors[h.status] || statusColors.completed;
              const expanded = expandedHistory === h.id;
              return (
                <div key={h.id} style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 14, overflow: 'hidden',
                }}>
                  <button onClick={() => setExpandedHistory(expanded ? null : h.id)} style={{
                    width: '100%', padding: '14px', border: 'none', background: 'transparent', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)' }}>
                        {h.units?.communities?.name || '—'} · {h.units?.room_type || '—'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        RM {Number(h.monthly_rent).toLocaleString()} · {h.start_date?.slice(0, 10)} ~ {h.end_date?.slice(0, 10)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 600, background: s.bg, color: s.text }}>{s.label}</span>
                      {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Clock size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-h)' }}>
              {lang === 'zh' ? '暂无历史租约' : 'No lease history'}
            </div>
          </div>
        )
      )}
    </div>
  );
}
