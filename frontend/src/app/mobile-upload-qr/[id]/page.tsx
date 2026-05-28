'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, QrCode, Loader2 } from 'lucide-react';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';
import { compressImageFile, compressImageToDataUrl, QR_IMAGE_PRESET } from '@/utils/compressImage';

export default function MobileQRUploadPage() {
  const { lang } = useApp();
  const routerParams = useParams();
  const sessionId = (routerParams?.id as string) || '';

  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      if (isMockDatabase) {
        const stored = localStorage.getItem(`ez_qr_upload_${sessionId}`);
        if (stored) setUploadedUrl(stored);
      } else {
        const { data } = await supabase
          .from('mobile_upload_sessions')
          .select('media_urls')
          .eq('id', sessionId)
          .maybeSingle();
        if (data?.media_urls?.[0]) {
          setUploadedUrl(data.media_urls[0]);
        } else {
          // Create session if not exists
          await supabase.from('mobile_upload_sessions').insert({ id: sessionId, media_urls: [] });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      let url: string;

      if (isMockDatabase) {
        url = await compressImageToDataUrl(file, QR_IMAGE_PRESET);
        localStorage.setItem(`ez_qr_upload_${sessionId}`, url);
      } else {
        const compressed = await compressImageFile(file, QR_IMAGE_PRESET);
        const fileName = `qr-${Date.now()}.jpg`;
        const path = `qr/${sessionId}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('unit-media')
          .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });

        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

        const { data: urlData } = supabase.storage.from('unit-media').getPublicUrl(path);
        url = `${urlData.publicUrl}?t=${Date.now()}`;

        await supabase
          .from('mobile_upload_sessions')
          .update({ media_urls: [url] })
          .eq('id', sessionId);
      }

      setUploadedUrl(url);
      setSuccessMsg(lang === 'zh' ? '收款码上传成功！电脑端已同步。' : 'QR code uploaded! Synced to your computer.');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReplace = () => {
    setUploadedUrl(null);
    setSuccessMsg('');
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-body)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="Malaysia Ez Rent" style={{ width: 64, height: 64, objectFit: 'contain', display: 'inline-block', marginBottom: 12 }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-h)', marginBottom: 6 }}>
            {lang === 'zh' ? '收款码上传助手' : 'Payment QR Code Uploader'}
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {lang === 'zh'
              ? '从手机相册选择您的收款二维码（微信/支付宝/银行），上传后电脑端会自动同步。'
              : 'Select your payment QR code (WeChat / Alipay / Bank) from your gallery. It will sync to your computer automatically.'}
          </p>
        </div>

        {/* Messages */}
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>{successMsg}</span>
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
            <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        {/* Preview or Upload */}
        {uploadedUrl ? (
          <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: 'white', padding: 12, borderRadius: 12, border: '1px solid var(--glass-border)', marginBottom: 16 }}>
              <img src={uploadedUrl} alt="QR Code" style={{ width: 200, height: 200, objectFit: 'contain', display: 'block' }} />
            </div>
            <div>
              <button onClick={handleReplace} style={{
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10,
                padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                color: 'var(--text-body)', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                {lang === 'zh' ? '重新上传' : 'Replace'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="qr-file-input" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: '48px 20px', borderRadius: 14, cursor: 'pointer',
              border: '2px dashed var(--primary-glow)', background: 'var(--primary-light)',
              transition: 'all 0.2s', pointerEvents: uploading ? 'none' : 'auto',
            }}>
              {uploading ? (
                <>
                  <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>
                    {lang === 'zh' ? '正在压缩并上传…' : 'Compressing & uploading…'}
                  </span>
                </>
              ) : (
                <>
                  <QrCode size={36} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-h)' }}>
                    {lang === 'zh' ? '选择收款码图片' : 'Choose QR Code Image'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {lang === 'zh' ? '从相册选择或拍照' : 'From gallery or camera'}
                  </span>
                </>
              )}
            </label>
            <input id="qr-file-input" type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Malaysia Ez Rent · AI 智能租房系统
        </div>
      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
