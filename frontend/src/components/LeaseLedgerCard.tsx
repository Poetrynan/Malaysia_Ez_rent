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
  unit_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  payments: Payment[];
  onPaymentUpdated?: () => void;
}

export default function LeaseLedgerCard({
  community_name, unit_number, start_date, end_date,
  monthly_rent, payments = [], onPaymentUpdated
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
          const { data, error } = await supabaseClient
            .from('admin_users')
            .select('payment_qr_code')
            .not('payment_qr_code', 'is', null)
            .limit(1)
            .single();
          if (error) {
            console.error('[QR Fetch] Error:', error.message);
            // Fallback to localStorage
            const saved = localStorage.getItem('ez_admin_qr_code');
            if (saved) setAdminQR(saved);
            return;
          }
          if (data?.payment_qr_code) {
            setAdminQR(data.payment_qr_code);
            localStorage.setItem('ez_admin_qr_code', data.payment_qr_code);
          }
        } catch (err: any) {
          console.error('[QR Fetch] Exception:', err?.message);
          const saved = localStorage.getItem('ez_admin_qr_code');
          if (saved) setAdminQR(saved);
        }
      })();
    }
  }, []);

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

  return (
    <div className="glass-card" style={{ marginTop: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-h)' }}>
            {community_name} · {unit_number}
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

      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>
        {t('ledgerTitle')}
      </div>

      <div className="payment-grid">
        {payments.map(p => {
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: 520, textAlign: 'left', overflow: 'hidden' }}>
            {/* Close button */}
            <button
              onClick={() => setSelectedPayment(null)}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.05rem', marginBottom: 4, color: 'var(--text-h)' }}>{t('paymentTitle')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              {t('paymentCycle')}：{formatMonth(selectedPayment.billing_month)} &nbsp;·&nbsp;
              {t('paymentRent')}：RM {monthly_rent}
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
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: 16 }}>
                  <img
                    src={evidenceUrl || selectedPayment.evidence_url || ''}
                    alt="Evidence"
                    style={{ width: '100%', display: 'block' }}
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
                {/* Left: Admin Payment QR Code (DuitNow / Touch'n Go) */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{t('paymentTitle')}</div>
                  {adminQR ? (
                    <>
                      <div style={{ background: 'white', padding: 8, borderRadius: 12, display: 'inline-block', marginBottom: 8, border: '1px solid var(--glass-border)' }}>
                        <img src={adminQR} alt="Payment QR" style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block', objectFit: 'contain' }} />
                      </div>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>{t('duitnowWarning')}</p>
                    </>
                  ) : (
                    <div style={{ padding: '24px 12px', borderRadius: 10, border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {t('noPaymentQR')}
                    </div>
                  )}
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
