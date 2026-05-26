'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Camera, CheckCircle2, AlertCircle, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';
import { compressImageFile, compressImageToDataUrl, UNIT_IMAGE_PRESET } from '@/utils/compressImage';

export default function MobilePropertyUploadPage() {
  const { lang } = useApp();
  const routerParams = useParams();
  const sessionId = (routerParams?.id as string) || '';
  
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    loadSession();
  }, [sessionId]);

  // Load existing uploaded files in this session
  const loadSession = async () => {
    try {
      if (isMockDatabase) {
        const stored = localStorage.getItem(`ez_mobile_upload_session_${sessionId}`);
        if (stored) {
          setUploadedUrls(JSON.parse(stored));
        }
      } else {
        const { data, error: selectErr } = await supabase
          .from('mobile_upload_sessions')
          .select('media_urls')
          .eq('id', sessionId)
          .maybeSingle();

        if (selectErr) {
          setError(lang === 'zh' ? '获取上传会话失败' : 'Failed to fetch upload session');
          return;
        }

        if (data && data.media_urls) {
          setUploadedUrls(data.media_urls);
        } else {
          // If session doesn't exist, create it
          const { error: insertErr } = await supabase
            .from('mobile_upload_sessions')
            .insert({ id: sessionId, media_urls: [] });
          if (insertErr) {
            console.error('Error creating session row:', insertErr);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading session');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      const newUrls: string[] = [...uploadedUrls];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (isMockDatabase) {
          // In mock mode, compress to data url (base64)
          const dataUrl = await compressImageToDataUrl(file, UNIT_IMAGE_PRESET);
          newUrls.push(dataUrl);
        } else {
          // In live mode, compress and upload to supabase storage
          const compressed = await compressImageFile(file, UNIT_IMAGE_PRESET);
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
          const path = `property/${sessionId}/${fileName}`;
          
          const { error: uploadErr } = await supabase.storage
            .from('unit-media')
            .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
            
          if (uploadErr) {
            throw new Error(`Upload failed: ${uploadErr.message}`);
          }

          const { data: urlData } = supabase.storage.from('unit-media').getPublicUrl(path);
          const url = urlData?.publicUrl;
          if (!url) {
            throw new Error('Failed to obtain public URL');
          }
          
          newUrls.push(`${url}?t=${Date.now()}`);
        }
      }

      // Update state
      setUploadedUrls(newUrls);

      // Save to DB or localStorage
      if (isMockDatabase) {
        localStorage.setItem(`ez_mobile_upload_session_${sessionId}`, JSON.stringify(newUrls));
      } else {
        const { error: updateErr } = await supabase
          .from('mobile_upload_sessions')
          .update({ media_urls: newUrls })
          .eq('id', sessionId);

        if (updateErr) {
          throw new Error(`Database sync failed: ${updateErr.message}`);
        }
      }

      setSuccessMsg(
        lang === 'zh'
          ? `成功上传了 ${files.length} 张照片！`
          : `Successfully uploaded ${files.length} photo(s)!`
      );
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (indexToDelete: number) => {
    const updated = uploadedUrls.filter((_, idx) => idx !== indexToDelete);
    setUploadedUrls(updated);
    setSuccessMsg('');

    try {
      if (isMockDatabase) {
        localStorage.setItem(`ez_mobile_upload_session_${sessionId}`, JSON.stringify(updated));
      } else {
        const { error: updateErr } = await supabase
          .from('mobile_upload_sessions')
          .update({ media_urls: updated })
          .eq('id', sessionId);
        if (updateErr) {
          setError(updateErr.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update database after delete');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-body)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/logo.png"
            alt="Malaysia Ez Rent"
            style={{ width: 64, height: 64, objectFit: 'contain', display: 'inline-block', marginBottom: 12 }}
          />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-h)', marginBottom: 6 }}>
            {lang === 'zh' ? '房源图片上传助手' : 'Property Image Uploader'}
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {lang === 'zh' 
              ? '请在手机相册选择房源照片，上传后电脑端表单会自动同步。' 
              : 'Select property photos from your gallery, and they will automatically sync to your computer.'}
          </p>
        </div>

        {/* Upload status / counters */}
        <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {lang === 'zh' ? '当前已上传' : 'Uploaded'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
              {uploadedUrls.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-body)', fontWeight: 500 }}>/ 9</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {uploadedUrls.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                <CheckCircle2 size={12} /> {lang === 'zh' ? '电脑端已同步' : 'Synced to PC'}
              </span>
            )}
          </div>
        </div>

        {/* Upload Slot */}
        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="media-file-input"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: '48px 20px', borderRadius: 14, cursor: 'pointer',
              border: '2px dashed var(--primary-glow)', background: 'var(--primary-light)',
              transition: 'all 0.2s', opacity: uploadedUrls.length >= 9 ? 0.6 : 1,
              pointerEvents: uploadedUrls.length >= 9 || uploading ? 'none' : 'auto'
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)' }}>
                  {lang === 'zh' ? '正在压缩并上传照片…' : 'Compressing & uploading…'}
                </span>
              </>
            ) : (
              <>
                <Camera size={36} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-h)' }}>
                  {lang === 'zh' ? '选择照片或拍照' : 'Choose Photos / Take Pic'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {lang === 'zh' ? '支持多选，每次最多 9 张' : 'Supports multi-select, max 9'}
                </span>
              </>
            )}
          </label>
          <input
            id="media-file-input"
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading || uploadedUrls.length >= 9}
            style={{ display: 'none' }}
          />
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

        {/* Preview Grid */}
        {uploadedUrls.length > 0 && (
          <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={16} style={{ color: 'var(--primary)' }} />
              {lang === 'zh' ? '已上传照片预览' : 'Uploaded Photos'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {uploadedUrls.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={url} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => handleDelete(idx)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'rgba(239, 68, 68, 0.85)', border: 'none',
                      color: 'white', width: 22, height: 22, borderRadius: '50%',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    title={lang === 'zh' ? '删除' : 'Delete'}
                  >
                    <Trash2 size={12} />
                  </button>
                  <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: '0.62rem', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 3 }}>
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Malaysia Ez Rent · AI 智能租房系统
        </div>
      </div>
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
