'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/ThemeProvider';
import { useAuth } from '@/lib/AuthContext';
import { compressImageToDataUrl, REN_TAG_PRESET } from '@/utils/compressImage';
import {
  User, Camera, Save, Loader2, CheckCircle2, X,
  Phone, MessageCircle, Building2, LogOut
} from 'lucide-react';

export default function MobileProfile() {
  const { lang } = useApp();
  const { role } = useAuth();

  const [profile, setProfile] = useState({
    display_name: '',
    phone: '',
    whatsapp: '',
    wechat_id: '',
    email: '',
    avatar_url: '',
    job_title: '',
    agency_name: '',
    agency_license: '',
    agency_address: '',
    bio: '',
    experience_years: 0,
    experience_months: 0,
    area_expertise: '',
    property_types: '',
    ren_number: '',
    ren_tag_url: '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Load profile (with sessionStorage cache to avoid re-fetch on tab switch)
  useEffect(() => {
    const cached = sessionStorage.getItem('m_profile_cache');
    if (cached) {
      try {
        setProfile(prev => ({ ...prev, ...JSON.parse(cached) }));
        setLoading(false);
        return;
      } catch {}
    }

    const loadProfile = async () => {
      try {
        const { supabase, isMockDatabase } = await import('@/lib/supabase');
        if (isMockDatabase) {
          const stored = JSON.parse(localStorage.getItem('ez_admin_profile') || 'null');
          if (stored) {
            setProfile(prev => ({ ...prev, ...stored }));
            sessionStorage.setItem('m_profile_cache', JSON.stringify(stored));
          } else {
            const fallback = { display_name: 'Nick Chan', phone: '+6012-345 6789', email: 'admin@ezrent.my', agency_name: 'VIVAHOMES REALTY SDN. BHD' };
            setProfile(prev => ({ ...prev, ...fallback }));
            sessionStorage.setItem('m_profile_cache', JSON.stringify(fallback));
          }
        } else {
          const { createClient } = await import('@/utils/supabase/client');
          const client = createClient();
          const { data: { user } } = await client.auth.getUser();
          if (user) {
            const { data } = await client.from('admin_users').select('*').eq('id', user.id).maybeSingle();
            if (data) {
              const profileData = { ...data, email: user.email || data.email || '' };
              setProfile(prev => ({ ...prev, ...profileData }));
              sessionStorage.setItem('m_profile_cache', JSON.stringify(profileData));
            } else {
              setProfile(prev => ({ ...prev, email: user.email || '' }));
            }
          }
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxWidth: 300, maxHeight: 300, quality: 0.85 });
      setAvatarPreview(dataUrl);
    } catch {
      setError(lang === 'zh' ? '头像压缩失败' : 'Avatar compression failed');
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!profile.display_name.trim()) {
      setError(lang === 'zh' ? '请输入姓名' : 'Please enter your name');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { supabase, isMockDatabase } = await import('@/lib/supabase');
      let avatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (avatarPreview && !isMockDatabase) {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const client = createClient();
          const { data: { user } } = await client.auth.getUser();
          if (user) {
            const res = await fetch(avatarPreview);
            const blob = await res.blob();
            const fileName = `avatars/${user.id}.jpg`;
            await client.storage.from('unit-media').upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });
            const { data: urlData } = client.storage.from('unit-media').getPublicUrl(fileName);
            avatarUrl = urlData.publicUrl;
          }
        } catch {}
      } else if (avatarPreview && isMockDatabase) {
        avatarUrl = avatarPreview;
      }

      const profileData = {
        display_name: profile.display_name.trim(),
        phone: profile.phone.trim(),
        whatsapp: profile.whatsapp.trim(),
        wechat_id: profile.wechat_id.trim(),
        job_title: profile.job_title.trim(),
        agency_name: profile.agency_name.trim(),
        agency_license: profile.agency_license.trim(),
        agency_address: profile.agency_address.trim(),
        bio: profile.bio.trim(),
        experience_years: Number(profile.experience_years) || 0,
        experience_months: Number(profile.experience_months) || 0,
        area_expertise: profile.area_expertise.trim(),
        property_types: profile.property_types.trim(),
        avatar_url: avatarUrl,
      };

      if (isMockDatabase) {
        localStorage.setItem('ez_admin_profile', JSON.stringify({ ...profile, ...profileData }));
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          await client.from('admin_users').update(profileData).eq('id', user.id);
        }
      }

      setProfile(prev => ({ ...prev, ...profileData, avatar_url: avatarUrl }));
      sessionStorage.setItem('m_profile_cache', JSON.stringify({ ...profile, ...profileData, avatar_url: avatarUrl }));
      setAvatarPreview(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || (lang === 'zh' ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { supabase, isMockDatabase } = await import('@/lib/supabase');
      if (isMockDatabase) {
        localStorage.removeItem('ez_logged_in');
        localStorage.removeItem('ez_user_role');
        window.location.href = '/login';
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        await client.auth.signOut();
        window.location.href = '/login';
      }
    } catch {}
  };

  const updateField = (field: string, value: string | number) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-h)',
          marginBottom: 4, letterSpacing: '-0.025em', fontFamily: 'var(--font-display)',
        }}>
          {lang === 'zh' ? '个人资料' : 'Profile'}
        </h1>
      </div>

      {/* Error / Success */}
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
      {saved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
        }}>
          <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
            {lang === 'zh' ? '保存成功！' : 'Saved!'}
          </span>
        </div>
      )}

      {/* Avatar section */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14,
        padding: '24px 16px',
        marginBottom: 14,
        textAlign: 'center',
      }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: avatarPreview || profile.avatar_url
              ? `url(${avatarPreview || profile.avatar_url}) center/cover`
              : 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid var(--glass-border)',
          }}>
            {!avatarPreview && !profile.avatar_url && (
              <User size={32} style={{ color: 'white' }} />
            )}
          </div>
          <label style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--primary)', border: '2px solid var(--bg-surface-solid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Camera size={12} style={{ color: 'white' }} />
            <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
          </label>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {lang === 'zh' ? '点击更换头像' : 'Tap to change avatar'}
        </div>
      </div>

      {/* Basic Info */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 14,
      }}>
        <h3 style={{
          fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)',
          marginBottom: 14,
        }}>
          {lang === 'zh' ? '基本信息' : 'Basic Info'}
        </h3>

        {/* Display name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            {lang === 'zh' ? '姓名 *' : 'Name *'}
          </label>
          <input value={profile.display_name} onChange={e => updateField('display_name', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Job title */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            {lang === 'zh' ? '职位' : 'Job Title'}
          </label>
          <input value={profile.job_title} onChange={e => updateField('job_title', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            <Phone size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {lang === 'zh' ? '电话' : 'Phone'}
          </label>
          <input value={profile.phone} onChange={e => updateField('phone', e.target.value)}
            placeholder="+6012-345 6789"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* WhatsApp */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            <MessageCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            WhatsApp
          </label>
          <input value={profile.whatsapp} onChange={e => updateField('whatsapp', e.target.value)}
            placeholder="60123456789"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Email (read-only) */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Email
          </label>
          <input value={profile.email} disabled
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', opacity: 0.7 }}
          />
        </div>
      </div>

      {/* Agency Info */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 14,
      }}>
        <h3 style={{
          fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)',
          marginBottom: 14,
        }}>
          <Building2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {lang === 'zh' ? '公司信息' : 'Agency Info'}
        </h3>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            {lang === 'zh' ? '公司名称' : 'Agency Name'}
          </label>
          <input value={profile.agency_name} onChange={e => updateField('agency_name', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            {lang === 'zh' ? 'REN 编号' : 'REN Number'}
          </label>
          <input value={profile.ren_number} disabled
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', opacity: 0.7 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            {lang === 'zh' ? '执照编号' : 'License No.'}
          </label>
          <input value={profile.agency_license} onChange={e => updateField('agency_license', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-h)', fontFamily: 'var(--font-body)' }}
          />
        </div>
      </div>

      {/* Bio */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 14,
      }}>
        <h3 style={{
          fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)',
          marginBottom: 14,
        }}>
          {lang === 'zh' ? '个人简介' : 'Bio'}
        </h3>
        <textarea
          value={profile.bio}
          onChange={e => updateField('bio', e.target.value)}
          rows={4}
          placeholder={lang === 'zh' ? '介绍一下自己...' : 'Tell us about yourself...'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem',
            color: 'var(--text-h)', fontFamily: 'var(--font-body)',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: '14px', borderRadius: 10, border: 'none',
          background: saving ? 'var(--glass-border)' : 'var(--gradient-primary)',
          color: 'white', fontSize: '0.875rem', fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 14px var(--primary-glow)',
          marginBottom: 14,
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
            <Save size={16} />
            {lang === 'zh' ? '保存资料' : 'Save Profile'}
          </>
        )}
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%', padding: '12px', borderRadius: 10,
          border: '1px solid var(--danger)',
          background: 'transparent',
          color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginBottom: 20,
          fontFamily: 'var(--font-body)',
        }}
      >
        <LogOut size={16} />
        {lang === 'zh' ? '退出登录' : 'Logout'}
      </button>

      {/* Footer */}
      <div style={{
        textAlign: 'center', marginTop: 20, fontSize: '0.72rem', color: 'var(--text-muted)',
      }}>
        Malaysia Ez Rent · {lang === 'zh' ? 'AI 智能租房系统' : 'AI Smart Rental System'}
      </div>
    </div>
  );
}
