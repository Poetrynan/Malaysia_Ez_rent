'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Clock, X, Smartphone, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';

interface Payment {
  id: string;
  lease_id: string;
  billing_month: string;
  paid: boolean;
  paid_date?: string | null;
  evidence_url?: string | null;
  status?: string;
  admin_notes?: string;
}

interface LeaseLedgerCardProps {
  community_name: string;
  room_type?: string | null;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  payments: Payment[];
  onPaymentUpdated?: () => void;
  agent_id?: string | null;
  landlord_qr_code?: string | null;
  landlord_bank_info?: string | null;
  area?: number | null;
}

export default function LeaseLedgerCard({
  community_name, room_type, start_date, end_date,
  monthly_rent, payments = [], onPaymentUpdated, agent_id,
  landlord_qr_code, landlord_bank_info, area
}: LeaseLedgerCardProps) {
  const { t, lang } = useApp();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [adminQR, setAdminQR] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const channelRef = useRef<any>(null);

  // Fetch admin payment QR code
  useEffect(() => {
    if (isMockDatabase) {
      const saved = localStorage.getItem('ez_admin_qr_code');
      if (saved) setAdminQR(saved);
    } else {
      (async () => {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabaseClient = createClient();
          
          let qrCodeUrl = null;
          
          if (agent_id) {
            // Fetch this specific agent's QR code
            const { data, error } = await supabaseClient
              .from('admin_users')
              .select('payment_qr_code')
              .eq('id', agent_id)
              .maybeSingle();
            if (!error && data?.payment_qr_code) {
              qrCodeUrl = data.payment_qr_code;
            }
          }
          
          if (!qrCodeUrl) {
            // Fallback to first available admin QR code
            const { data, error } = await supabaseClient
              .from('admin_users')
              .select('payment_qr_code')
              .not('payment_qr_code', 'is', null)
              .limit(1)
              .single();
            if (!error && data?.payment_qr_code) {
              qrCodeUrl = data.payment_qr_code;
            }
          }
          
          if (qrCodeUrl) {
            setAdminQR(qrCodeUrl);
            localStorage.setItem('ez_admin_qr_code', qrCodeUrl);
          } else {
            const saved = localStorage.getItem('ez_admin_qr_code');
            if (saved) setAdminQR(saved);
          }
        } catch (e) {
          console.error('[QR Fetch] Error:', e);
          const saved = localStorage.getItem('ez_admin_qr_code');
          if (saved) setAdminQR(saved);
        }
      })();
    }
  }, [agent_id]);

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short' });
  };

  // Subscribe to Realtime when a payment is selected
  useEffect(() => {
    if (!selectedPayment || selectedPayment.paid || selectedPayment.evidence_url) return;

    const paymentId = selectedPayment.id;
    setEvidenceUrl(null);
    setRealtimeConnected(false);

    // Build the mobile upload URL
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const channel = supabase
      .channel(`pc-sync-${paymentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payment_records', filter: `id=eq.${paymentId}` },
        (payload: any) => {
          if (payload.new?.evidence_url) {
            setEvidenceUrl(payload.new.evidence_url);
            // Update local payment state
            setSelectedPayment(prev => prev ? { ...prev, evidence_url: payload.new.evidence_url, status: payload.new.status } : null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    setRealtimeConnected(true);

    // Also poll localStorage every 2s as fallback for mock mode
    const pollInterval = setInterval(() => {
      const all: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const updated = all.find((p: Payment) => p.id === paymentId);
      if (updated?.evidence_url && !evidenceUrl) {
        setEvidenceUrl(updated.evidence_url);
        setSelectedPayment(prev => prev ? { ...prev, evidence_url: updated.evidence_url, status: updated.status } : null);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedPayment?.id]);

  const getMobileUrl = (paymentId: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/mobile-upload/${paymentId}`;
  };

  const getStatusBadge = (p: Payment) => {
    if (p.paid) return { bg: 'var(--success-light)', color: 'var(--success)', text: t('approved') };
    if (p.evidence_url && p.status === 'pending_review') return { bg: 'var(--warning-light)', color: 'var(--warning)', text: t('pendingReview') };
    if (p.status === 'rejected') return { bg: 'var(--danger-light)', color: 'var(--danger)', text: t('rejected') };
    return null;
  };

  const sortedPayments = [...payments].sort((a, b) => new Date(a.billing_month).getTime() - new Date(b.billing_month).getTime());
  
  return (
    <div className="glass-card" style={{ marginTop: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-h)' }}>
            {community_name}{room_type ? ` · ${room_type}` : ''}{area ? ` · ${area} sqft` : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
            {start_date} → {end_date} &nbsp;·&nbsp;
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>RM {monthly_rent}{t('perMonth')}</span>
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--success-light)', color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>
          {t('ledgerActive')}
        </span>
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>
        {t('ledgerTitle')}
      </div>

      {/* Progress Flow */}
      <div style={{ marginBottom: 24, padding: '16px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
          {/* Base Grey Line */}
          <div style={{ position: 'absolute', top: 10, left: 20, right: 20, height: 2, background: 'var(--glass-border)', zIndex: 0 }} />
          
          {/* Animated Progress Line with Extension Effect */}
          <div style={{ 
            position: 'absolute', 
            top: 10, 
            left: 20, 
            width: 'calc(100% - 40px)', 
            height: 2, 
            background: 'var(--primary)', 
            zIndex: 0, 
            opacity: 0.6,
            transformOrigin: 'left center',
            animation: 'extendLine 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          }} />
          
          {/* Animated glow at the end of the line */}
          <div style={{ 
            position: 'absolute', 
            top: 8, 
            right: 20,
            width: 6, 
            height: 6, 
            borderRadius: '50%',
            background: 'var(--primary)',
            boxShadow: '0 0 12px var(--primary), 0 0 20px var(--primary)',
            zIndex: 1,
            animation: 'glowPulse 1.5s ease-in-out infinite, slideToEnd 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          }} />

          {[
            { key: 'step1', label: lang === 'zh' ? '发起确认' : 'Initiated', active: true },
            { key: 'step2', label: lang === 'zh' ? '中介同意' : 'Agreed', active: true },
            { key: 'step3', label: lang === 'zh' ? '合约生成' : 'Lease Created', active: true },
            { key: 'step4', label: lang === 'zh' ? '租房中' : 'Renting', active: true },
          ].map((step, idx) => (
            <div key={step.key} style={{ 
              zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              transition: 'transform 0.3s ease',
              transform: step.active ? 'scale(1.05)' : 'scale(1)'
            }}>
              <div style={{ 
                width: 20, height: 20, borderRadius: '50%', 
                background: step.active ? 'var(--primary)' : 'var(--bg-card)',
                border: `2px solid ${step.active ? 'var(--primary)' : 'var(--glass-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.5s ease',
                boxShadow: step.active ? '0 0 10px rgba(var(--primary-rgb), 0.4)' : 'none'
              }}>
                <CheckCircle2 size={12} color={step.active ? 'white' : 'var(--text-muted)'} />
              </div>
              <span style={{ 
                fontSize: '0.6rem', fontWeight: 700, 
                color: step.active ? 'var(--text-h)' : 'var(--text-muted)',
                transition: 'color 0.5s ease'
              }}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="payment-grid">
        {sortedPayments.map(p => {
          const badge = getStatusBadge(p);
          return (
            <div
              key={p.id}
              onClick={() => { if (!p.paid) setSelectedPayment(p); }}
              className={`payment-cell ${p.paid ? 'paid' : 'unpaid'}`}
              style={{ cursor: p.paid ? 'default' : 'pointer' }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {formatMonth(p.billing_month)}
              </span>
              <div className={`check-icon ${p.paid ? 'paid' : 'unpaid'}`}>
                {p.paid ? '✓' : p.evidence_url ? <Clock size={12} /> : 'RM'}
              </div>
              <span style={{ fontSize: '0.65rem', color: p.paid ? 'var(--success)' : p.evidence_url ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
                {p.paid ? t('paid') : p.evidence_url ? t('pendingReview') : t('unpaid')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          {/* Close button wrapped in a white circle */}
          <button
            onClick={() => setSelectedPayment(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ffffff',
              border: 'none',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s',
              zIndex: 999,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div
            className="modal-content"
            style={{ position: 'relative', width: 520, textAlign: 'left', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >

            <h3 style={{ fontSize: '1.05rem', marginBottom: 4, color: 'var(--text-h)' }}>{t('paymentTitle')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              {t('paymentCycle')}：{formatMonth(selectedPayment.billing_month)} &nbsp;·&nbsp;
              {(sortedPayments.length > 0 && selectedPayment.id === sortedPayments[0].id) ? t('paymentRent') : t('detailRent')}：RM {monthly_rent}
            </p>

            {/* Already has evidence — show preview */}
            {(selectedPayment.evidence_url || evidenceUrl) ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--success)' }}>
                    {selectedPayment.status === 'approved' ? t('approved') : t('uploadSuccess')}
                  </span>
                </div>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: 16, background: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img
                    src={evidenceUrl || selectedPayment.evidence_url || ''}
                    alt="Evidence"
                    style={{ maxWidth: '100%', maxHeight: 'min(50vh, 420px)', width: 'auto', height: 'auto', display: 'block', objectFit: 'contain' }}
                  />
                </div>
                {selectedPayment.status === 'pending_review' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--warning-light)', border: '1px solid var(--warning)' }}>
                    <Clock size={14} style={{ color: 'var(--warning)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{t('pendingReview')}</span>
                  </div>
                )}
              </div>
            ) : (
              /* No evidence yet — show payment QR + upload QR side by side */
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Left: Payment QR Code (Agent or Landlord) */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                  <div style={{ marginBottom: 12 }}>
                    {selectedPayment && sortedPayments.length > 0 && selectedPayment.id === sortedPayments[0].id ? (
                      <span style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                        {lang === 'zh' ? '中介收款 (定金扫给中介)' : 'Agent Payment (Deposit to Agent)'}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                        {lang === 'zh' ? '房东收款 (租金扫给房东)' : 'Landlord Payment (Rent to Landlord)'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                    {selectedPayment && sortedPayments.length > 0 && selectedPayment.id === sortedPayments[0].id ? t('payToAgent') : t('payToLandlord')}
                  </div>
                  {(() => {
                    const isFirstMonth = sortedPayments.length > 0 && selectedPayment?.id === sortedPayments[0].id;
                    const qrToShow = isFirstMonth ? adminQR : (landlord_qr_code || null);
                    const noLandlordInfo = (!isFirstMonth && !landlord_qr_code && !landlord_bank_info);

                    return (
                      <>
                        {qrToShow ? (
                          <div style={{ background: 'white', padding: 8, borderRadius: 12, display: 'inline-block', marginBottom: 8, border: '1px solid var(--glass-border)' }}>
                            <img src={qrToShow} alt="Payment QR" style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block', objectFit: 'contain' }} />
                          </div>
                        ) : isFirstMonth ? (
                          <div style={{ padding: '24px 12px', borderRadius: 10, border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 8 }}>
                            {t('noPaymentQR')}
                          </div>
                        ) : null}

                        {noLandlordInfo && (
                          <div style={{ padding: '24px 12px', borderRadius: 10, border: '1px dashed var(--warning)', background: 'var(--warning-light)', color: 'var(--warning)', fontSize: '0.78rem', marginBottom: 8 }}>
                            {t('landlordPaymentMissing')}
                          </div>
                        )}

                        {!isFirstMonth && landlord_bank_info && (
                          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: 8, marginTop: 8, textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}>
                             <strong style={{ color: 'var(--text-h)' }}>{t('landlordBankInfo')}</strong><br/>
                             {landlord_bank_info}
                          </div>
                        )}
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0, marginTop: 8 }}>{t('duitnowWarning')}</p>
                      </>
                    );
                  })()}
                </div>

                {/* Divider */}
                <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--glass-border)', margin: '0 4px' }} />

                {/* Right: Mobile Upload QR Code */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{t('scanToUpload')}</div>
                  <div style={{ background: 'white', padding: 8, borderRadius: 12, display: 'inline-block', marginBottom: 8, border: '1px solid var(--glass-border)' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getMobileUrl(selectedPayment.id))}`}
                      alt="Upload QR"
                      style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, background: 'var(--primary-light)', border: '1px solid var(--primary-glow)', marginBottom: 8 }}>
                    <Smartphone size={13} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-body)' }}>{t('scanToUploadDesc')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '4px 0' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('waitingForUpload')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
