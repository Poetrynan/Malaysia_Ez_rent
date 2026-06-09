'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAdminDataLoader } from '@/lib/useAdminDataLoader';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { compressImageToDataUrl, compressImageFile, UNIT_IMAGE_PRESET, QR_IMAGE_PRESET } from '@/utils/compressImage';
import {
  Camera, ChevronLeft, ChevronRight, Check, X, Loader2,
  Building2, ImageIcon, Video, Trash2, Upload
} from 'lucide-react';

const ROOM_TYPES = ['Studio', 'Master Room', 'Medium Room', 'Small Room', 'Ensuite', 'Whole Unit'];
const AMENITIES_LIST = ['gym', 'pool', 'laundry', 'study', 'parking', 'security', 'wifi', 'mart'];

const AMENITY_LABELS: Record<string, { zh: string; en: string }> = {
  gym: { zh: '健身房', en: 'Gym' },
  pool: { zh: '泳池', en: 'Pool' },
  laundry: { zh: '洗衣房', en: 'Laundry' },
  study: { zh: '自习室', en: 'Study Room' },
  parking: { zh: '停车位', en: 'Parking' },
  security: { zh: '安保', en: 'Security' },
  wifi: { zh: 'WiFi', en: 'WiFi' },
  mart: { zh: '便利店', en: 'Mart' },
};

export default function MobileUpload() {
  const { lang } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { units, communities, isLoaded, setCommunities, setUnits, setIsLoaded } = useAdminDataLoader();

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Community + Room Type
  const [communityId, setCommunityId] = useState('');
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityAddress, setNewCommunityAddress] = useState('');
  const [roomType, setRoomType] = useState('Studio');

  // Step 2: Pricing & Capacity
  const [rent, setRent] = useState('');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [area, setArea] = useState('');
  const [maxOccupants, setMaxOccupants] = useState('1');
  const [availableFrom, setAvailableFrom] = useState('');

  // Step 3: Media
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [mediaVideo, setMediaVideo] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState('');

  // Step 4: Description & Payment
  const [description, setDescription] = useState('');
  const [landlordBankInfo, setLandlordBankInfo] = useState('');
  const [landlordQrCode, setLandlordQrCode] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<string[]>([]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Load existing unit data if editing
  useEffect(() => {
    if (editId && isLoaded) {
      const unit = units.find((u: any) => u.id === editId);
      if (unit) {
        setCommunityId(unit.community_id || '');
        setRoomType(unit.room_type || 'Studio');
        setRent(String(unit.rent || ''));
        setBedrooms(String(unit.bedrooms || '1'));
        setBathrooms(String(unit.bathrooms || '1'));
        setArea(String(unit.area || ''));
        setMaxOccupants(String(unit.max_occupants || '1'));
        setAvailableFrom(unit.available_from || '');
        setDescription(unit.description || '');
        setLandlordBankInfo(unit.landlord_bank_info || '');
        if (unit.media_urls) setMediaImages(unit.media_urls);
        if (unit.landlord_qr_code) setLandlordQrCode(unit.landlord_qr_code);
        if (unit.amenities) setAmenities(unit.amenities);
      }
    }
  }, [editId, isLoaded, units]);

  // Image compression handler
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 9 - mediaImages.length;
    if (remaining <= 0) {
      setError(lang === 'zh' ? '最多上传9张图片' : 'Maximum 9 images');
      return;
    }

    setCompressing(true);
    setError('');
    try {
      const newImages: string[] = [];
      const toProcess = Array.from(files).slice(0, remaining);
      for (let i = 0; i < toProcess.length; i++) {
        setCompressProgress(`${lang === 'zh' ? '压缩中' : 'Compressing'} ${i + 1}/${toProcess.length}...`);
        const dataUrl = await compressImageToDataUrl(toProcess[i], UNIT_IMAGE_PRESET);
        newImages.push(dataUrl);
      }
      setMediaImages(prev => [...prev, ...newImages]);
    } catch (err) {
      setError(lang === 'zh' ? '图片压缩失败' : 'Image compression failed');
    } finally {
      setCompressing(false);
      setCompressProgress('');
      e.target.value = '';
    }
  }, [mediaImages.length, lang]);

  // Video handler
  const handleVideoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 150 * 1024 * 1024) {
      setError(lang === 'zh' ? '视频不能超过150MB' : 'Video must be under 150MB');
      return;
    }
    setCompressing(true);
    setCompressProgress(lang === 'zh' ? '处理视频中...' : 'Processing video...');
    try {
      const url = URL.createObjectURL(file);
      setMediaVideo(url);
    } catch {
      setError(lang === 'zh' ? '视频处理失败' : 'Video processing failed');
    } finally {
      setCompressing(false);
      setCompressProgress('');
    }
  }, [lang]);

  // QR code handler
  const handleQrSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const dataUrl = await compressImageToDataUrl(file, QR_IMAGE_PRESET);
      setLandlordQrCode(dataUrl);
    } catch {
      setError(lang === 'zh' ? 'QR码压缩失败' : 'QR compression failed');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  }, [lang]);

  // Step validation
  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return (communityId || newCommunityName.trim()) && roomType;
      case 2: return rent && Number(rent) > 0;
      case 3: return mediaImages.length > 0 || mediaVideo;
      case 4: return true;
      default: return false;
    }
  }, [step, communityId, newCommunityName, roomType, rent, mediaImages, mediaVideo]);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { supabase, isMockDatabase } = await import('@/lib/supabase');
      const mock = isMockDatabase;

      // Resolve community
      let resolvedCommunityId = communityId;
      if (!communityId && newCommunityName.trim()) {
        const newComm = {
          id: 'comm_' + Date.now(),
          name: newCommunityName.trim(),
          address: newCommunityAddress.trim(),
          amenities: [],
          lat: 0, lng: 0,
          created_at: new Date().toISOString(),
        };
        if (mock) {
          const existing = JSON.parse(localStorage.getItem('ez_communities') || '[]');
          existing.push(newComm);
          localStorage.setItem('ez_communities', JSON.stringify(existing));
        } else {
          const { createClient } = await import('@/utils/supabase/client');
          const client = createClient();
          const { data } = await client.from('communities').insert({
            name: newComm.name,
            address: newComm.address,
            amenities: [],
          }).select().single();
          if (data) newComm.id = data.id;
        }
        resolvedCommunityId = newComm.id;
        setCommunities(prev => [...prev, newComm]);
      }

      // Compress images for upload
      const compressedBlobs: { blob: Blob; index: number }[] = [];
      for (let i = 0; i < mediaImages.length; i++) {
        if (mediaImages[i].startsWith('data:') || mediaImages[i].startsWith('http')) {
          try {
            const { compressDataUrl } = await import('@/utils/compressImage');
            const blob = await compressDataUrl(mediaImages[i], UNIT_IMAGE_PRESET);
            compressedBlobs.push({ blob, index: i });
          } catch {
            // Use original if compression fails
          }
        }
      }

      const unitId = editId || ('unit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
      let mediaUrls: string[] = [];

      if (mock) {
        // Mock mode: store as data URLs
        mediaUrls = mediaImages;
      } else {
        // Live mode: upload to Supabase Storage
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();

        for (let i = 0; i < mediaImages.length; i++) {
          const compressed = compressedBlobs.find(c => c.index === i);
          const blobToUpload = compressed?.blob || await (async () => {
            const res = await fetch(mediaImages[i]);
            return res.blob();
          })();

          const fileName = `${unitId}/${Date.now()}_${i}.jpg`;
          const { error: uploadErr } = await client.storage
            .from('unit-media')
            .upload(fileName, blobToUpload, { contentType: 'image/jpeg', upsert: true });
          if (!uploadErr) {
            const { data: urlData } = client.storage.from('unit-media').getPublicUrl(fileName);
            mediaUrls.push(urlData.publicUrl);
          } else {
            // Fallback to data URL
            mediaUrls.push(mediaImages[i]);
          }
        }

        // Upload video if present
        if (mediaVideo && mediaVideo.startsWith('blob:')) {
          try {
            const videoRes = await fetch(mediaVideo);
            const videoBlob = await videoRes.blob();
            const videoFileName = `${unitId}/walkthrough.mp4`;
            await client.storage.from('unit-media').upload(videoFileName, videoBlob, { upsert: true });
          } catch {}
        }

        // Upload landlord QR
        if (landlordQrCode && (landlordQrCode.startsWith('data:') || landlordQrCode.startsWith('http'))) {
          try {
            const { compressDataUrl } = await import('@/utils/compressImage');
            const qrBlob = await compressDataUrl(landlordQrCode, QR_IMAGE_PRESET);
            const qrFileName = `${unitId}/landlord_qr_${Date.now()}.jpg`;
            await client.storage.from('unit-media').upload(qrFileName, qrBlob, { contentType: 'image/jpeg', upsert: true });
          } catch {}
        }
      }

      // Build unit payload
      const unitPayload: any = {
        community_id: resolvedCommunityId,
        room_type: roomType,
        rent: Number(rent),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        area: area ? Number(area) : null,
        max_occupants: Number(maxOccupants),
        available_from: availableFrom || null,
        description: description.trim(),
        landlord_bank_info: landlordBankInfo.trim(),
        media_urls: mediaUrls,
        amenities,
        status: editId ? undefined : 'available', // Don't overwrite status on edit
      };

      if (mock) {
        const existing = JSON.parse(localStorage.getItem('ez_units') || '[]');
        if (editId) {
          const idx = existing.findIndex((u: any) => u.id === editId);
          if (idx >= 0) existing[idx] = { ...existing[idx], ...unitPayload };
        } else {
          unitPayload.id = unitId;
          unitPayload.created_at = new Date().toISOString();
          unitPayload.agent_id = 'mock_agent';
          existing.push(unitPayload);
        }
        localStorage.setItem('ez_units', JSON.stringify(existing));
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        if (editId) {
          await client.from('units').update(unitPayload).eq('id', editId);
        } else {
          const { data: { user } } = await client.auth.getUser();
          unitPayload.agent_id = user?.id || null;
          await client.from('units').insert(unitPayload);
        }
      }

      // Refresh data
      setIsLoaded(false);
      setSaved(true);
      setTimeout(() => router.push('/m/properties'), 1500);
    } catch (err: any) {
      setError(err.message || (lang === 'zh' ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{
          width: 32, height: 32, border: '3px solid var(--glass-border)',
          borderTopColor: 'var(--primary)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {lang === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--success-light)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Check size={28} style={{ color: 'var(--success)' }} />
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
          {lang === 'zh' ? '保存成功！' : 'Saved successfully!'}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {lang === 'zh' ? '正在返回房源列表...' : 'Returning to listings...'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-h)',
          marginBottom: 4, letterSpacing: '-0.025em', fontFamily: 'var(--font-display)',
        }}>
          {editId
            ? (lang === 'zh' ? '编辑房源' : 'Edit Listing')
            : (lang === 'zh' ? '上传房源' : 'Upload Listing')}
        </h1>
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24,
        padding: '0 4px',
      }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <React.Fragment key={i}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700,
              background: i + 1 <= step ? 'var(--gradient-primary)' : 'var(--glass-bg)',
              color: i + 1 <= step ? 'white' : 'var(--text-muted)',
              border: i + 1 <= step ? 'none' : '1px solid var(--glass-border)',
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }}>
              {i + 1 < step ? <Check size={14} /> : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div style={{
                flex: 1, height: 2, borderRadius: 1,
                background: i + 1 < step ? 'var(--primary)' : 'var(--glass-border)',
                transition: 'background 0.3s ease',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 20,
        padding: '0 0',
      }}>
        {[
          { zh: '基本信息', en: 'Basic' },
          { zh: '价格', en: 'Price' },
          { zh: '照片', en: 'Photos' },
          { zh: '详情', en: 'Details' },
        ].map((label, i) => (
          <div key={i} style={{
            fontSize: '0.68rem', fontWeight: i + 1 === step ? 700 : 500,
            color: i + 1 === step ? 'var(--primary)' : 'var(--text-muted)',
            textAlign: 'center', flex: 1,
          }}>
            {lang === 'zh' ? label.zh : label.en}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--danger-light)', border: '1px solid var(--danger)',
        }}>
          <X size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {/* Compressing indicator */}
      {compressing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--info-light)', border: '1px solid var(--info)',
        }}>
          <Loader2 size={15} style={{ color: 'var(--info)', flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--info)' }}>{compressProgress}</span>
        </div>
      )}

      {/* Step content */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14,
        padding: '20px 16px',
        marginBottom: 20,
      }}>
        {/* STEP 1: Community + Room Type */}
        {step === 1 && (
          <div>
            {/* Community select */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? '选择社区 *' : 'Select Community *'}
              </label>
              <select
                value={communityId}
                onChange={e => { setCommunityId(e.target.value); if (e.target.value) setNewCommunityName(''); }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem',
                  color: 'var(--text-h)', fontFamily: 'var(--font-body)',
                }}
              >
                <option value="">{lang === 'zh' ? '-- 选择已有社区 --' : '-- Select community --'}</option>
                {communities.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Or create new community */}
            {!communityId && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    {lang === 'zh' ? '新社区名称 *' : 'New Community Name *'}
                  </label>
                  <input
                    type="text"
                    value={newCommunityName}
                    onChange={e => setNewCommunityName(e.target.value)}
                    placeholder={lang === 'zh' ? '例如：Sunway Geo Residences' : 'e.g. Sunway Geo Residences'}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem',
                      color: 'var(--text-h)', fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    {lang === 'zh' ? '地址' : 'Address'}
                  </label>
                  <input
                    type="text"
                    value={newCommunityAddress}
                    onChange={e => setNewCommunityAddress(e.target.value)}
                    placeholder={lang === 'zh' ? '街道地址' : 'Street address'}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem',
                      color: 'var(--text-h)', fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>
              </>
            )}

            {/* Room type */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? '房型 *' : 'Room Type *'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ROOM_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setRoomType(type)}
                    style={{
                      padding: '10px 8px', borderRadius: 10,
                      border: roomType === type ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                      background: roomType === type ? 'var(--primary-light)' : 'var(--glass-bg)',
                      color: roomType === type ? 'var(--primary)' : 'var(--text-body)',
                      fontSize: '0.82rem', fontWeight: roomType === type ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Pricing & Capacity */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? '月租 (RM) *' : 'Monthly Rent (RM) *'}
              </label>
              <input
                type="number"
                value={rent}
                onChange={e => setRent(e.target.value)}
                placeholder="2500"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem',
                  color: 'var(--text-h)', fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {lang === 'zh' ? '卧室' : 'Bedrooms'}
                </label>
                <input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} min="0"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {lang === 'zh' ? '浴室' : 'Bathrooms'}
                </label>
                <input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} min="0"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {lang === 'zh' ? '面积 (sqft)' : 'Area (sqft)'}
                </label>
                <input type="number" value={area} onChange={e => setArea(e.target.value)} placeholder="800"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {lang === 'zh' ? '最大人数' : 'Max Occupants'}
                </label>
                <input type="number" value={maxOccupants} onChange={e => setMaxOccupants(e.target.value)} min="1"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? '可入住日期' : 'Available From'}
              </label>
              <input type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Photos & Video */}
        {step === 3 && (
          <div>
            {/* Image upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? `房源照片 * (${mediaImages.length}/9)` : `Property Photos * (${mediaImages.length}/9)`}
              </label>

              {/* Image grid */}
              {mediaImages.length > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12,
                }}>
                  {mediaImages.map((img, i) => (
                    <div key={i} style={{
                      position: 'relative', aspectRatio: '1', borderRadius: 10,
                      overflow: 'hidden', background: 'var(--bg-base)',
                    }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => setMediaImages(prev => prev.filter((_, idx) => idx !== i))}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', border: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={12} style={{ color: 'white' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {mediaImages.length < 9 && (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '28px 20px', borderRadius: 14,
                  border: '2px dashed var(--primary-glow)',
                  background: 'var(--primary-light)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  opacity: compressing ? 0.6 : 1,
                  pointerEvents: compressing ? 'none' : 'auto',
                }}>
                  <Camera size={28} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)' }}>
                    {lang === 'zh' ? '拍照或选择图片' : 'Take photo or select images'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {lang === 'zh' ? '自动压缩，最多9张' : 'Auto-compressed, max 9'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* Video upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? '视频 (可选)' : 'Video (optional)'}
              </label>
              {mediaVideo ? (
                <div style={{
                  position: 'relative', borderRadius: 10, overflow: 'hidden',
                  background: 'var(--bg-base)', padding: 8,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Video size={20} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-body)', flex: 1 }}>
                    {lang === 'zh' ? '视频已选择' : 'Video selected'}
                  </span>
                  <button
                    onClick={() => { if (mediaVideo.startsWith('blob:')) URL.revokeObjectURL(mediaVideo); setMediaVideo(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px', borderRadius: 10,
                  border: '1px dashed var(--glass-border)',
                  background: 'var(--glass-bg)',
                  cursor: 'pointer',
                }}>
                  <Upload size={18} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {lang === 'zh' ? '选择视频 (最大150MB)' : 'Select video (max 150MB)'}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Description & Payment */}
        {step === 4 && (
          <div>
            {/* Amenities */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                {lang === 'zh' ? '设施配套' : 'Amenities'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AMENITIES_LIST.map(a => {
                  const active = amenities.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => setAmenities(prev => active ? prev.filter(x => x !== a) : [...prev, a])}
                      style={{
                        padding: '6px 12px', borderRadius: 9999,
                        border: active ? '1.5px solid var(--primary)' : '1px solid var(--glass-border)',
                        background: active ? 'var(--primary-light)' : 'var(--glass-bg)',
                        color: active ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: '0.78rem', fontWeight: active ? 700 : 500,
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      {AMENITY_LABELS[a]?.[lang as 'zh' | 'en'] || a}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? '房源描述' : 'Description'}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={lang === 'zh' ? '描述房源亮点...' : 'Describe the property highlights...'}
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem',
                  color: 'var(--text-h)', fontFamily: 'var(--font-body)',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Landlord bank info */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? '房东收款信息' : 'Landlord Payment Info'}
              </label>
              <textarea
                value={landlordBankInfo}
                onChange={e => setLandlordBankInfo(e.target.value)}
                placeholder={lang === 'zh' ? '银行名称、账号、户名...' : 'Bank name, account number, holder name...'}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem',
                  color: 'var(--text-h)', fontFamily: 'var(--font-body)',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Landlord QR */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {lang === 'zh' ? '房东收款QR码 (可选)' : 'Landlord QR Code (optional)'}
              </label>
              {landlordQrCode ? (
                <div style={{
                  position: 'relative', display: 'inline-block',
                  borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)',
                }}>
                  <img src={landlordQrCode} alt="QR" style={{ width: 120, height: 120, objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={() => setLandlordQrCode(null)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={12} style={{ color: 'white' }} />
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 10,
                  border: '1px dashed var(--glass-border)',
                  background: 'var(--glass-bg)',
                  cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)',
                }}>
                  <Camera size={16} />
                  {lang === 'zh' ? '上传QR码' : 'Upload QR'}
                  <input type="file" accept="image/*" onChange={handleQrSelect} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)', color: 'var(--text-body)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'var(--font-body)',
            }}
          >
            <ChevronLeft size={16} />
            {lang === 'zh' ? '上一步' : 'Back'}
          </button>
        )}
        {step < totalSteps ? (
          <button
            onClick={() => canProceed && setStep(s => s + 1)}
            disabled={!canProceed}
            style={{
              flex: 2, padding: '12px', borderRadius: 10, border: 'none',
              background: canProceed ? 'var(--gradient-primary)' : 'var(--glass-border)',
              color: canProceed ? 'white' : 'var(--text-muted)',
              fontSize: '0.85rem', fontWeight: 600, cursor: canProceed ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: canProceed ? '0 4px 14px var(--primary-glow)' : 'none',
              fontFamily: 'var(--font-body)',
            }}
          >
            {lang === 'zh' ? '下一步' : 'Next'}
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || compressing}
            style={{
              flex: 2, padding: '12px', borderRadius: 10, border: 'none',
              background: saving ? 'var(--glass-border)' : 'var(--gradient-primary)',
              color: 'white', fontSize: '0.85rem', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 14px var(--primary-glow)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {saving ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                {lang === 'zh' ? '保存中...' : 'Saving...'}
              </>
            ) : (
              <>
                <Check size={16} />
                {lang === 'zh' ? '保存' : 'Save'}
              </>
            )}
          </button>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', marginTop: 20, fontSize: '0.72rem', color: 'var(--text-muted)',
      }}>
        Malaysia Ez Rent · {lang === 'zh' ? 'AI 智能租房系统' : 'AI Smart Rental System'}
      </div>
    </div>
  );
}
