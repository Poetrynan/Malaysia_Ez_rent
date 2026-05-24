'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { supabase, isMockDatabase } from '@/lib/supabase';

interface Payment {
  id: string;
  lease_id: string;
  billing_month: string;
  paid: boolean;
  evidence_url?: string | null;
  status?: string;
}

interface Lease {
  id: string;
  monthly_rent: number;
  unit_id: string;
}

interface Unit {
  id: string;
  unit_number: string;
  community_id: string;
}

interface Community {
  id: string;
  name: string;
}

export default function MobileUploadPage() {
  const routerParams = useParams();
  const paymentId = (routerParams?.id as string) || '';
  const [payment, setPayment] = useState<Payment | null>(null);
  const [lease, setLease] = useState<Lease | null>(null);
  const [unitInfo, setUnitInfo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentId) return;
    loadPayment();
  }, [paymentId]);

  const loadPayment = async () => {
    if (isMockDatabase) {
      // Mock mode: read from localStorage
      const payments: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const p = payments.find(x => x.id === paymentId);
      if (!p) { setError('Payment not found'); return; }
      setPayment(p);
      if (p.evidence_url) { setDone(true); return; }
      const leases: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const l = leases.find(x => x.id === p.lease_id);
      if (l) {
        setLease(l);
        const units: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
        const communities: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
        const u = units.find(x => x.id === l.unit_id);
        if (u) {
          const c = communities.find(x => x.id === u.community_id);
          setUnitInfo(`${c?.name || ''} · ${u.unit_number}`);
        }
      }
    } else {
      // Live mode: read from Supabase
      try {
        const { data: p, error: pErr } = await supabase
          .from('payment_records')
          .select('*')
          .eq('id', paymentId)
          .single();
        if (pErr || !p) { setError('Payment not found'); return; }
        setPayment(p);
        if (p.evidence_url) { setDone(true); return; }

        const { data: l } = await supabase
          .from('leases')
          .select('id, monthly_rent, unit_id')
          .eq('id', p.lease_id)
          .single();
        if (l) {
          setLease(l);
          const { data: u } = await supabase
            .from('units')
            .select('unit_number, community_id')
            .eq('id', l.unit_id)
            .single();
          if (u) {
            const { data: c } = await supabase
              .from('communities')
              .select('name')
              .eq('id', u.community_id)
              .single();
            setUnitInfo(`${c?.name || ''} · ${u.unit_number}`);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load payment');
      }
    }
  };

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      if (isMockDatabase) {
        // Mock mode: convert to data URL and save to localStorage
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const payments: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
        const idx = payments.findIndex(x => x.id === paymentId);
        if (idx !== -1) {
          payments[idx].evidence_url = dataUrl;
          payments[idx].status = 'pending_review';
          localStorage.setItem('ez_payments', JSON.stringify(payments));
        }
      } else {
        // Live mode: upload to Supabase Storage, then update DB
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `evidence/${paymentId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('unit-media')
          .upload(path, file, { upsert: true });
        if (uploadErr) { setError(uploadErr.message); setUploading(false); return; }

        const { data: urlData } = supabase.storage.from('unit-media').getPublicUrl(path);
        const url = urlData?.publicUrl;
        if (!url) { setError('Failed to get upload URL'); setUploading(false); return; }

        const { error: dbErr } = await supabase
          .from('payment_records')
          .update({ evidence_url: url, status: 'pending_review' })
          .eq('id', paymentId);
        if (dbErr) { setError(dbErr.message); setUploading(false); return; }
      }

      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (error && !payment) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D1117', color: '#C9D1E0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D1117', color: '#C9D1E0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(59,130,246,0.4)' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>Ez</span>
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F0F6FF', marginBottom: 6 }}>
            {done ? '上传成功' : '上传转账凭证'}
          </h1>
          {!done && <p style={{ fontSize: '0.82rem', color: '#6B7A99' }}>请上传您的转账截图，房东确认后即完成缴费。</p>}
        </div>

        {/* Payment info card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.78rem', color: '#6B7A99' }}>账期</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F0F6FF' }}>{payment ? formatMonth(payment.billing_month) : '—'}</span>
          </div>
          {lease && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.78rem', color: '#6B7A99' }}>月租</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#3B82F6' }}>RM {lease.monthly_rent.toLocaleString()}</span>
            </div>
          )}
          {unitInfo && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#6B7A99' }}>房源</span>
              <span style={{ fontSize: '0.88rem', color: '#F0F6FF' }}>{unitInfo}</span>
            </div>
          )}
        </div>

        {/* Upload area or success */}
        {done ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={36} style={{ color: '#10B981' }} />
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#F0F6FF', marginBottom: 8 }}>上传成功！</p>
            <p style={{ fontSize: '0.82rem', color: '#6B7A99' }}>请返回电脑查看，房东将在 24 小时内审核。</p>
          </div>
        ) : (
          <div>
            <label
              htmlFor="file-input"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: '40px 20px', borderRadius: 14, cursor: 'pointer',
                border: '2px dashed rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.06)',
                transition: 'all 0.2s',
              }}
            >
              {uploading ? (
                <>
                  <div style={{ width: 36, height: 36, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '0.88rem', color: '#6B7A99' }}>上传中…</span>
                </>
              ) : (
                <>
                  <Camera size={36} style={{ color: '#3B82F6' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F0F6FF' }}>选择转账截图</span>
                  <span style={{ fontSize: '0.75rem', color: '#6B7A99' }}>支持 JPG / PNG，从相册或拍照</span>
                </>
              )}
            </label>
             <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle size={15} style={{ color: '#EF4444', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: '#EF4444' }}>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, fontSize: '0.7rem', color: '#6B7A99' }}>
          Malaysia Ez Rent · AI 智能租房系统
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
