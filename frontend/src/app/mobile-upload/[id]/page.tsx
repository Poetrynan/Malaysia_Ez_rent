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
  const [paymentModeTab, setPaymentModeTab] = useState<'qr' | 'bank'>('qr');
  const [copiedBankInfo, setCopiedBankInfo] = useState(false);

  const handleCopyBankInfo = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedBankInfo(true);
      setTimeout(() => setCopiedBankInfo(false), 2000);
    });
  };

  useEffect(() => {
    if (mobileInfo) {
      const isFirstMonth = mobileInfo.is_first_month;
      const qrToShow = isFirstMonth ? mobileInfo.admin_qr_code : (mobileInfo.landlord_qr_code || null);
      if (!qrToShow && mobileInfo.landlord_bank_info) {
        setPaymentModeTab('bank');
      }
    }
  }, [mobileInfo]);

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
          <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, marginBottom: 24, boxShadow: 'var(--glass-shadow)', textAlign: 'center', transition: 'all 0.3s' }}>
            {mobileInfo.is_first_month ? (
              <span style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '5px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, marginBottom: 14 }}>
                {lang === 'zh' ? '中介收款 (首月定金/押金)' : 'Agent Payment (Deposit & 1st Month Rent)'}
              </span>
            ) : (
              <span style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '5px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, marginBottom: 14 }}>
                {lang === 'zh' ? '房东收款 (第2个月及以后租金)' : 'Landlord Payment (Rent from 2nd Month)'}
              </span>
            )}

            <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', marginBottom: 16, lineHeight: 1.45 }}>
              {mobileInfo.is_first_month 
                ? (lang === 'zh' ? '请扫码或汇款支付款项给中介：' : 'Please scan or transfer payment to Agent:')
                : (lang === 'zh' ? '请选择下方方式支付月租给房东：' : 'Please choose a method to pay monthly rent to Landlord:')
              }
            </div>

            {/* Payment Segment Tab Switcher if both options are available */}
            {!mobileInfo.is_first_month && mobileInfo.landlord_qr_code && mobileInfo.landlord_bank_info && (
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 10,
                padding: 3,
                marginBottom: 16,
                border: '1px solid var(--glass-border)'
              }}>
                <button
                  type="button"
                  onClick={() => setPaymentModeTab('qr')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    background: paymentModeTab === 'qr' ? 'var(--primary)' : 'transparent',
                    color: paymentModeTab === 'qr' ? 'white' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {lang === 'zh' ? '🔍 扫码支付' : 'Scan QR'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModeTab('bank')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    background: paymentModeTab === 'bank' ? 'var(--primary)' : 'transparent',
                    color: paymentModeTab === 'bank' ? 'white' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {lang === 'zh' ? '🏦 银行转账' : 'Bank Transfer'}
                </button>
              </div>
            )}

            {/* QR Code display */}
            {(() => {
              const isFirstMonth = mobileInfo.is_first_month;
              const qrToShow = isFirstMonth ? mobileInfo.admin_qr_code : (mobileInfo.landlord_qr_code || null);
              const showQr = qrToShow && (isFirstMonth || paymentModeTab === 'qr' || !mobileInfo.landlord_bank_info);
              const noLandlordInfo = (!isFirstMonth && !mobileInfo.landlord_qr_code && !mobileInfo.landlord_bank_info);

              return (
                <>
                  {showQr ? (
                    <div style={{ background: 'white', padding: 12, borderRadius: 14, display: 'inline-block', margin: '0 auto 12px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <img src={qrToShow || ''} alt="Payment QR" style={{ width: 150, height: 150, objectFit: 'contain', display: 'block' }} />
                      <p style={{ fontSize: '0.62rem', color: '#9CA3AF', margin: '8px 0 0 0', fontWeight: 500 }}>{lang === 'zh' ? '💡 长按可保存二维码' : '💡 Long-press to save QR'}</p>
                    </div>
                  ) : isFirstMonth ? (
                    <div style={{ padding: '24px 10px', borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 12 }}>
                      {lang === 'zh' ? '⚠️ 中介收款二维码尚未上传，请联系中介。' : '⚠️ Agent QR code not uploaded. Please contact agent.'}
                    </div>
                  ) : null}

                  {noLandlordInfo && (
                    <div style={{ padding: '24px 12px', borderRadius: 12, border: '1px dashed rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', color: '#F59E0B', fontSize: '0.78rem', marginBottom: 12, lineHeight: 1.45 }}>
                      {lang === 'zh' ? '房东暂未上传收款码或银行账户信息，请联系管理员。' : 'Landlord payment QR code or bank info is not set up yet. Please contact admin.'}
                    </div>
                  )}

                  {!isFirstMonth && mobileInfo.landlord_bank_info && (paymentModeTab === 'bank' || !mobileInfo.landlord_qr_code) && (
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      color: 'var(--text-body)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid var(--glass-border)', paddingBottom: 6 }}>
                        <strong style={{ color: 'var(--text-h)' }}>
                          {lang === 'zh' ? '房东银行转账账户：' : 'Landlord Bank Account:'}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopyBankInfo(mobileInfo.landlord_bank_info || '')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: copiedBankInfo ? 'rgba(16, 185, 129, 0.15)' : 'var(--primary-light)',
                            color: copiedBankInfo ? '#10B981' : 'var(--primary)',
                            border: '1px solid ' + (copiedBankInfo ? 'rgba(16, 185, 129, 0.3)' : 'var(--primary-glow)'),
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {copiedBankInfo ? (lang === 'zh' ? '✓ 已复制' : '✓ Copied') : (lang === 'zh' ? '📋 复制' : 'Copy')}
                        </button>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.55 }}>
                        {mobileInfo.landlord_bank_info}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Upload area or success */}
        {done ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'var(--bg-surface-solid)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--glass-shadow)',
            animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 16px var(--success-glow)',
              animation: 'bounceScale 0.6s ease infinite alternate'
            }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)' }} />
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
              {lang === 'zh' ? '🎉 上传凭证成功！' : '🎉 Upload Successful!'}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
              {lang === 'zh' ? '您的转账凭证已提交给系统。请返回电脑浏览器查看，我们将在 24 小时内完成审核并更新账单状态。' : 'Your payment evidence has been submitted. Please check back on your PC; we will review it within 24 hours.'}
            </p>

            {/* Nice contact WhatsApp shortcut card */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(22, 163, 74, 0.06)',
              border: '1px solid rgba(22, 163, 74, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#16A34A',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.05)'
            }}
              onClick={() => {
                window.open(`https://wa.me/60123456789?text=Hello,%20I%20have%20uploaded%20my%20payment%20evidence%20for%20bill%20${paymentId}.`, '_blank');
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(22, 163, 74, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(22, 163, 74, 0.06)'; }}
            >
              💬 {lang === 'zh' ? 'WhatsApp 催办快速审核' : 'Nudge Agent via WhatsApp'}
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="file-input"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: '40px 20px', borderRadius: 16, cursor: 'pointer',
                border: '2px dashed var(--primary-glow)', background: 'var(--primary-light)',
                transition: 'all 0.2s',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)',
                position: 'relative'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--primary-glow)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
            >
              {uploading ? (
                <>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'zh' ? '凭证上传中…' : 'Uploading…'}</span>
                </>
              ) : (
                <>
                  <Camera size={36} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 2px 8px var(--primary-glow))' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-h)' }}>{lang === 'zh' ? '选择或拍照转账截图' : 'Choose or Take Photo'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '支持 JPG / PNG / JPEG 格式凭证' : 'Supports JPG / PNG / JPEG'}</span>
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
                <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Malaysia Ez Rent · AI 智能租房系统
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounceScale {
          0% { transform: scale(1); }
          100% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
