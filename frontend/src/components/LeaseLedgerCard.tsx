'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Clock, X, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const channelRef = useRef<any>(null);

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
              onClick={() => setSelectedPayment(p)}
              className={`payment-cell ${p.paid ? 'paid' : 'unpaid'}`}
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
          <div className="modal-content" style={{ width: 400, textAlign: 'left' }}>
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
              /* No evidence yet — show QR code + waiting state */
              <div style={{ textAlign: 'center' }}>
                {/* QR Code */}
                <div style={{ background: 'white', padding: 12, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getMobileUrl(selectedPayment.id))}`}
                    alt="QR Code"
                    style={{ width: 180, height: 180, display: 'block' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--primary-light)', border: '1px solid var(--primary-glow)', marginBottom: 16 }}>
                  <Smartphone size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{t('scanToUploadDesc')}</span>
                </div>

                {/* Waiting indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('waitingForUpload')}</span>
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
