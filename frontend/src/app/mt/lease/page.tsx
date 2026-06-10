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
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [agentQrCode, setAgentQrCode] = useState<string | null>(null);
  const [evidenceUploading, setEvidenceUploading] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    // Check sessionStorage cache first
    const cached = sessionStorage.getItem('mt_lease_cache');
    if (cached) {
      try {
        const d = JSON.parse(cached);
        setLease(d.lease || null); setUnit(d.unit || null); setCommunity(d.community || null);
        setPayments(d.payments || []); setHistory(d.history || []);
        setLoading(false); return;
      } catch {}
    }

    const load = async () => {
      try {
        if (isMockDatabase) {
          const myId = localStorage.getItem('ez_tenant_id');
          const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
          const myLease = leases.find((l: any) => l.tenant_id === myId && l.status === 'active');
          setLease(myLease || null);
          let u: any = null, c: any = null, p: any[] = [];
          if (myLease) {
            const units = JSON.parse(localStorage.getItem('ez_units') || '[]');
            const comms = JSON.parse(localStorage.getItem('ez_communities') || '[]');
            u = units.find((x: any) => x.id === myLease.unit_id) || null;
            setUnit(u);
            c = u ? comms.find((x: any) => x.id === u.community_id) || null : null;
            setCommunity(c);
            const allP = JSON.parse(localStorage.getItem('ez_payments') || '[]');
            p = allP.filter((x: any) => x.lease_id === myLease.id).sort((a: any, b: any) => a.billing_month.localeCompare(b.billing_month));
            setPayments(p);
          }
          const hist = leases.filter((l: any) => l.tenant_id === myId && l.status !== 'active');
          setHistory(hist);
          sessionStorage.setItem('mt_lease_cache', JSON.stringify({ lease: myLease || null, unit: u, community: c, payments: p, history: hist }));
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
          let p: any[] = [];
          if (activeLease?.units) {
            setUnit(activeLease.units);
            setCommunity(activeLease.units.communities);
            const { data: pData } = await client.from('payment_records')
              .select('*').eq('lease_id', activeLease.id).order('billing_month');
            p = pData || [];
            setPayments(p);
          }
          const hist = leases?.filter(l => l.status !== 'active') || [];
          setHistory(hist);
          sessionStorage.setItem('mt_lease_cache', JSON.stringify({
            lease: activeLease || null, unit: activeLease?.units || null,
            community: activeLease?.units?.communities || null, payments: p, history: hist,
          }));
        }
      } catch (e) { console.error('Load lease error:', e); }
      setLoading(false);
    };
    load();
  }, []);

  // Load agent payment QR code
  useEffect(() => {
    if (!lease?.agent_id && !unit?.agent_id) return;
    const agentId = lease?.agent_id || unit?.agent_id;
    const loadQr = async () => {
      try {
        const { isMockDatabase } = await import('@/lib/supabase');
        if (isMockDatabase) {
          const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
          const admin = admins.find((a: any) => a.id === agentId);
          if (admin?.payment_qr_code) setAgentQrCode(admin.payment_qr_code);
        } else {
          const { createClient } = await import('@/utils/supabase/client');
          const client = createClient();
          const { data } = await client.from('admin_users').select('payment_qr_code').eq('id', agentId).maybeSingle();
          if (data?.payment_qr_code) setAgentQrCode(data.payment_qr_code);
        }
      } catch {}
    };
    loadQr();
  }, [lease?.agent_id, unit?.agent_id]);

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

  // Evidence upload handler
  const handleEvidenceUpload = useCallback(async (file: File) => {
    if (!selectedPayment) return;
    setEvidenceUploading(true);
    try {
      const dataUrl = await compressImageToDataUrl(file, EVIDENCE_IMAGE_PRESET);
      const { isMockDatabase } = await import('@/lib/supabase');
      if (isMockDatabase) {
        const allP = JSON.parse(localStorage.getItem('ez_payments') || '[]');
        const idx = allP.findIndex((p: any) => p.id === selectedPayment.id);
        if (idx >= 0) { allP[idx].evidence_url = dataUrl; allP[idx].status = 'pending_review'; }
        localStorage.setItem('ez_payments', JSON.stringify(allP));
        setPayments(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, evidence_url: dataUrl, status: 'pending_review' } : p));
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        const blob = await compressDataUrl(dataUrl, EVIDENCE_IMAGE_PRESET);
        const { data: uploadData } = await client.storage.from('unit-media').upload(`evidence/${selectedPayment.id}.jpg`, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadData) {
          const publicUrl = client.storage.from('unit-media').getPublicUrl(uploadData.path).data.publicUrl;
          await client.from('payment_records').update({ evidence_url: publicUrl, status: 'pending_review' }).eq('id', selectedPayment.id);
          setPayments(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, evidence_url: publicUrl, status: 'pending_review' } : p));
        }
      }
      setSelectedPayment(null);
      showToast('success', lang === 'zh' ? '凭证已上传，等待审核' : 'Evidence uploaded, pending review');
    } catch (e: any) {
      showToast('error', e.message || (lang === 'zh' ? '上传失败' : 'Upload failed'));
    } finally { setEvidenceUploading(false); }
  }, [selectedPayment, lang, showToast]);

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
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 12,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(220,38,38,0.95)',
          border: 'none',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          animation: 'slideDown 0.3s ease-out',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} style={{ color: 'white' }} /> : <AlertCircle size={16} style={{ color: 'white' }} />}
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{toast.msg}</span>
        </div>
      )}
      <style>{`@keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>

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
                      <div key={p.id} onClick={() => setSelectedPayment(p)} style={{
                        background: paid ? 'var(--success-light)' : 'var(--danger-light)',
                        border: `1px solid ${paid ? 'var(--success)' : 'var(--danger)'}`,
                        borderRadius: 10, padding: '10px 8px', textAlign: 'center',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{month}</div>
                        {paid ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <XCircle size={18} style={{ color: 'var(--danger)' }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment Modal */}
            {selectedPayment && (() => {
              const paid = selectedPayment.paid || selectedPayment.status === 'approved';
              const month = new Date(selectedPayment.billing_month).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' });
              const isFirstMonth = payments.indexOf(selectedPayment) === 0;
              const qrToShow = isFirstMonth ? agentQrCode : (unit?.landlord_qr_code || null);
              const bankInfo = unit?.landlord_bank_info || null;
              return (
                <div onClick={() => setSelectedPayment(null)} style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                }}>
                  <div onClick={e => e.stopPropagation()} style={{
                    background: 'var(--bg-surface-solid)', borderRadius: 20, width: '100%', maxWidth: 400,
                    padding: '24px 20px', maxHeight: '85vh', overflow: 'auto',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{month}</h3>
                      <button onClick={() => setSelectedPayment(null)} style={{
                        width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--glass-border)',
                        background: 'var(--glass-bg)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>×</button>
                    </div>

                    {paid ? (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 8 }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>
                          {lang === 'zh' ? '已缴费' : 'Paid'}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', marginBottom: 16, lineHeight: 1.6 }}>
                          {lang === 'zh'
                            ? `请使用银行转账完成支付，然后上传转账截图。`
                            : `Complete payment by bank transfer, then upload your screenshot.`}
                        </div>

                        {/* Payment QR */}
                        {qrToShow ? (
                          <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <img src={qrToShow} alt="Payment QR" style={{ width: 160, height: 160, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--glass-border)' }} />
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                              {isFirstMonth
                                ? (lang === 'zh' ? '中介收款码' : 'Agent Payment QR')
                                : (lang === 'zh' ? '房东收款码' : 'Landlord Payment QR')}
                            </div>
                          </div>
                        ) : bankInfo ? (
                          <div style={{
                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12,
                            padding: '12px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-body)', whiteSpace: 'pre-wrap',
                          }}>
                            {bankInfo}
                          </div>
                        ) : (
                          <div style={{
                            background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 12,
                            padding: '12px', marginBottom: 16, fontSize: '0.78rem', color: 'var(--warning)',
                          }}>
                            {lang === 'zh' ? '⚠️ 房东暂未上传收款信息' : '⚠️ Landlord payment info not available'}
                          </div>
                        )}

                        {/* Evidence upload */}
                        <label style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '14px', borderRadius: 12, cursor: evidenceUploading ? 'not-allowed' : 'pointer',
                          background: 'var(--gradient-primary)', color: 'white', fontWeight: 700, fontSize: '0.85rem',
                          opacity: evidenceUploading ? 0.7 : 1, marginBottom: 8,
                        }}>
                          <Camera size={18} />
                          {evidenceUploading
                            ? (lang === 'zh' ? '上传中...' : 'Uploading...')
                            : (lang === 'zh' ? '上传转账截图' : 'Upload Transfer Screenshot')}
                          <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleEvidenceUpload(e.target.files[0]); }} style={{ display: 'none' }} disabled={evidenceUploading} />
                        </label>

                        {/* Existing evidence */}
                        {selectedPayment.evidence_url && (
                          <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                              {lang === 'zh' ? '已上传的凭证' : 'Uploaded evidence'}
                            </div>
                            <img src={selectedPayment.evidence_url} alt="Evidence" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

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
