'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';
import { compressImageFile, compressImageToDataUrl, EVIDENCE_IMAGE_PRESET } from '@/utils/compressImage';

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
  room_type: string;
  community_id: string;
}

interface Community {
  id: string;
  name: string;
}

interface MobileUploadInfo {
  id: string;
  lease_id: string;
  billing_month: string;
  paid: boolean;
  evidence_url: string | null;
  status: string | null;
  monthly_rent: number | null;
  room_type: string | null;
  community_name: string | null;
  admin_qr_code: string | null;
  landlord_qr_code?: string | null;
  landlord_bank_info?: string | null;
  is_first_month?: boolean | null;
}

export default function MobileUploadPage() {
  const { lang } = useApp();
  const routerParams = useParams();
  const paymentId = (routerParams?.id as string) || '';
  const [payment, setPayment] = useState<Payment | null>(null);
  const [lease, setLease] = useState<Lease | null>(null);
  const [unitInfo, setUnitInfo] = useState('');
  const [mobileInfo, setMobileInfo] = useState<MobileUploadInfo | null>(null);
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
        const units: any[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
        const communities: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
        const u = units.find(x => x.id === l.unit_id);
        
        let cName = '';
        let roomT = '';
        let landQr = null;
        let landBank = null;
        if (u) {
          const c = communities.find(x => x.id === u.community_id);
          cName = c?.name || '';
          roomT = u.room_type || '';
          landQr = u.landlord_qr_code || null;
          landBank = u.landlord_bank_info || null;
          setUnitInfo(`${cName} · ${roomT}`);
        }

        const sortedLeasePayments = payments
          .filter(x => x.lease_id === p.lease_id)
          .sort((a, b) => a.billing_month.localeCompare(b.billing_month));
        const isFirst = sortedLeasePayments.length > 0 && p.id === sortedLeasePayments[0].id;

        const infoObj: MobileUploadInfo = {
          id: p.id,
          lease_id: p.lease_id,
          billing_month: p.billing_month,
          paid: p.paid,
          evidence_url: p.evidence_url || null,
          status: p.status || null,
          monthly_rent: l.monthly_rent,
          room_type: roomT,
          community_name: cName,
          admin_qr_code: localStorage.getItem('ez_admin_qr_code') || null,
          landlord_qr_code: landQr,
          landlord_bank_info: landBank,
          is_first_month: isFirst
        };
        setMobileInfo(infoObj);
      }
    } else {
      // Live mode: read via SECURITY DEFINER RPC so the unauthenticated mobile browser bypasses RLS
      try {
        const { data, error: rpcErr } = await supabase
          .rpc('get_mobile_upload_info', { p_payment_id: paymentId });

        if (rpcErr) {
          setError(lang === 'zh'
            ? `读取账单失败：${rpcErr.message}。请刷新页面重试，或联系房东确认二维码。`
            : `Failed to load payment: ${rpcErr.message}. Please refresh or contact the landlord.`);
          return;
        }

        const info = data as MobileUploadInfo | null;
        if (!info) {
          // UUIDs are 36 characters with dashes; mock IDs from the offline simulator (e.g. "p1-uuid") are shorter
          const looksLikeMockId = paymentId.length < 36 || paymentId.includes('mock');
          if (looksLikeMockId) {
            setError(lang === 'zh'
              ? '您扫描的二维码是在"离线模拟器"下生成的测试账单（如 p1-uuid 等），该账单 ID 在云端数据库中不存在。请在 AI 助手右上角显示为绿色的"已连接"状态下生成真实账单后再扫码。'
              : 'The scanned QR was generated in the "Offline Simulator". This payment ID does not exist in the live database. Please generate a real cloud bill (AI agent status must be green "Connected") and re-scan.');
          } else {
            setError(lang === 'zh'
              ? '未找到该账单记录，请检查 ID 是否正确。'
              : 'Payment record not found. Please verify the billing ID.');
          }
          return;
        }

        const p: Payment = {
          id: info.id,
          lease_id: info.lease_id,
          billing_month: info.billing_month,
          paid: info.paid,
          evidence_url: info.evidence_url,
          status: info.status || undefined,
        };
        setPayment(p);
        setMobileInfo(info);
        if (info.evidence_url) { setDone(true); return; }

        if (info.monthly_rent != null) {
          setLease({ id: info.lease_id, monthly_rent: Number(info.monthly_rent), unit_id: '' });
        }
        if (info.community_name || info.room_type) {
          setUnitInfo(`${info.community_name || ''} · ${info.room_type || ''}`.replace(/^ · | · $/g, '').trim());
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
        const dataUrl = await compressImageToDataUrl(file, EVIDENCE_IMAGE_PRESET);
        const payments: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
        const idx = payments.findIndex(x => x.id === paymentId);
        if (idx !== -1) {
          payments[idx].evidence_url = dataUrl;
          payments[idx].status = 'pending_review';
          localStorage.setItem('ez_payments', JSON.stringify(payments));
        }
      } else {
        const compressed = await compressImageFile(file, EVIDENCE_IMAGE_PRESET);
        const path = `evidence/${paymentId}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('unit-media')
          .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
        if (uploadErr) { setError(uploadErr.message); setUploading(false); return; }

        const { data: urlData } = supabase.storage.from('unit-media').getPublicUrl(path);
        const url = urlData?.publicUrl;
        if (!url) { setError('Failed to get upload URL'); setUploading(false); return; }

        // Cache-bust so reviewers always see the latest screenshot when upsert overwrites the same path
        const evidenceUrl = `${url}?t=${Date.now()}`;

        const { error: rpcErr } = await supabase
          .rpc('submit_mobile_payment_evidence', {
            p_payment_id: paymentId,
            p_evidence_url: evidenceUrl,
          });
        if (rpcErr) { setError(rpcErr.message); setUploading(false); return; }
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: 16 }} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-body)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo.png"
            alt="Malaysia Ez Rent"
            style={{ width: 72, height: 72, objectFit: 'contain', display: 'inline-block', marginBottom: 12 }}
          />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
            {done ? '上传成功' : '上传转账凭证'}
          </h1>
          {!done && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>请上传您的转账截图，房东确认后即完成缴费。</p>}
        </div>

        {/* Payment info card */}
        <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 24, boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>账期</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>{payment ? formatMonth(payment.billing_month) : '—'}</span>
          </div>
          {lease && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>月租</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary)' }}>RM {lease.monthly_rent.toLocaleString()}</span>
            </div>
          )}
          {unitInfo && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>房源</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-h)' }}>{unitInfo}</span>
            </div>
          )}
        </div>

        {/* Payment QR / Bank info section */}
        {mobileInfo && !done && (
          <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 24, boxShadow: 'var(--glass-shadow)', textAlign: 'center' }}>
            {mobileInfo.is_first_month ? (
              <span style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, marginBottom: 12 }}>
                {lang === 'zh' ? '中介收款 (首月定金/押金)' : 'Agent Payment (Deposit & 1st Month Rent)'}
              </span>
            ) : (
              <span style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, marginBottom: 12 }}>
                {lang === 'zh' ? '房东收款 (第2个月及以后租金)' : 'Landlord Payment (Rent from 2nd Month)'}
              </span>
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', marginBottom: 12, lineHeight: 1.4 }}>
              {mobileInfo.is_first_month 
                ? (lang === 'zh' ? '请扫码支付款项给中介：' : 'Please scan and pay to Agent:')
                : (lang === 'zh' ? '请扫码或转账支付月租给房东：' : 'Please scan or transfer monthly rent to Landlord:')
              }
            </div>

            {/* QR Code display */}
            {(() => {
              const isFirstMonth = mobileInfo.is_first_month;
              const qrToShow = isFirstMonth ? mobileInfo.admin_qr_code : (mobileInfo.landlord_qr_code || null);
              const noLandlordInfo = (!isFirstMonth && !mobileInfo.landlord_qr_code && !mobileInfo.landlord_bank_info);

              return (
                <>
                  {qrToShow ? (
                    <div style={{ background: 'white', padding: 10, borderRadius: 12, display: 'inline-block', margin: '0 auto 12px', border: '1px solid var(--border)' }}>
                      <img src={qrToShow} alt="Payment QR" style={{ width: 140, height: 140, objectFit: 'contain', display: 'block' }} />
                      <p style={{ fontSize: '0.62rem', color: '#9CA3AF', margin: '6px 0 0 0' }}>{lang === 'zh' ? '长按可保存二维码' : 'Long-press to save QR'}</p>
                    </div>
                  ) : isFirstMonth ? (
                    <div style={{ padding: '20px 10px', borderRadius: 10, border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 12 }}>
                      {lang === 'zh' ? '中介收款二维码未上传' : 'Agent QR code not uploaded'}
                    </div>
                  ) : null}

                  {noLandlordInfo && (
                    <div style={{ padding: '20px 10px', borderRadius: 10, border: '1px dashed rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', color: '#F59E0B', fontSize: '0.75rem', marginBottom: 12 }}>
                      {lang === 'zh' ? '房东暂未上传收款码或银行账户信息，请联系管理员。' : 'Landlord payment QR code or bank info is not set up yet. Please contact admin.'}
                    </div>
                  )}

                  {!isFirstMonth && mobileInfo.landlord_bank_info && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-body)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                       <strong style={{ color: 'var(--text-h)' }}>{lang === 'zh' ? '房东银行账户转账信息：' : 'Landlord Bank Info:'}</strong><br/>
                       {mobileInfo.landlord_bank_info}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Upload area or success */}
        {done ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)' }} />
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 8 }}>上传成功！</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>请返回电脑查看，房东将在 24 小时内审核。</p>
          </div>
        ) : (
          <div>
            <label
              htmlFor="file-input"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: '40px 20px', borderRadius: 14, cursor: 'pointer',
                border: '2px dashed var(--primary-glow)', background: 'var(--primary-light)',
                transition: 'all 0.2s',
              }}
            >
              {uploading ? (
                <>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>上传中…</span>
                </>
              ) : (
                <>
                  <Camera size={36} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-h)' }}>选择转账截图</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>支持 JPG / PNG，从相册或拍照</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
                <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Malaysia Ez Rent · AI 智能租房系统
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
