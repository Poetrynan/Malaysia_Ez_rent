'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTenantData } from '@/lib/TenantDataContext';
import { useApp } from '@/lib/ThemeProvider';
import { isMockDatabase } from '@/lib/supabase';
import { compressImageToDataUrl, compressDataUrl, REN_TAG_PRESET } from '@/utils/compressImage';
import {
  User, CreditCard, GraduationCap, Globe, Camera, CheckCircle2,
  AlertCircle, Save, LogOut, Shield, Phone, Building2, BookOpen, Briefcase
} from 'lucide-react';

const IDENTITY_OPTIONS = [
  { id: 'malaysian', icon: CreditCard, labelZh: '马来西亚公民', labelEn: 'Malaysian Citizen' },
  { id: 'international_student', icon: GraduationCap, labelZh: '国际留学生', labelEn: 'International Student' },
  { id: 'international_other', icon: Globe, labelZh: '其他国际人士', labelEn: 'International Other' },
];

export default function MobileProfilePage() {
  const { role, logout } = useAuth();
  const ctx = useTenantData();
  const { lang } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [company, setCompany] = useState('');
  const [identityType, setIdentityType] = useState<string | null>(null);
  const [icNumber, setIcNumber] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [icFrontUrl, setIcFrontUrl] = useState<string | null>(null);
  const [icBackUrl, setIcBackUrl] = useState<string | null>(null);
  const [passportPhotoUrl, setPassportPhotoUrl] = useState<string | null>(null);
  const [studentCardUrl, setStudentCardUrl] = useState<string | null>(null);
  const [workPermitUrl, setWorkPermitUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Sync from TenantDataContext (populated by useTenantDataLoader in layout)
  useEffect(() => {
    if (!ctx.profileLoaded) return; // Wait for context to load
    setName(ctx.profileName || '');
    setPhone(ctx.profilePhone || '');
    setSchool(ctx.profileSchool || '');
    setCompany(ctx.profileCompany || '');
    setIdentityType(ctx.profileIdentityType || null);
    setIcNumber(ctx.profileLocalId || '');
    setPassportNumber(ctx.profilePassport || '');
    setIcFrontUrl(ctx.icFrontUrl || null);
    setIcBackUrl(ctx.icBackUrl || null);
    setPassportPhotoUrl(ctx.passportPhotoUrl || null);
    setStudentCardUrl(ctx.profileStudentCardUrl || null);
    setWorkPermitUrl(ctx.workPermitUrl || null);
    setLoaded(true);
  }, [ctx.profileLoaded, ctx.profileName, ctx.profilePhone, ctx.profileSchool, ctx.profileCompany,
      ctx.profileIdentityType, ctx.profileLocalId, ctx.profilePassport,
      ctx.icFrontUrl, ctx.icBackUrl, ctx.passportPhotoUrl, ctx.profileStudentCardUrl, ctx.workPermitUrl]);

  const handleImageUpload = useCallback(async (file: File, setter: (url: string) => void) => {
    try {
      const dataUrl = await compressImageToDataUrl(file, REN_TAG_PRESET);
      setter(dataUrl);
    } catch { showToast('error', lang === 'zh' ? '图片压缩失败' : 'Image compression failed'); }
  }, [lang, showToast]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { showToast('error', lang === 'zh' ? '请填写姓名' : 'Please enter your name'); return; }
    if (!identityType) { showToast('error', lang === 'zh' ? '请选择身份类型' : 'Please select identity type'); return; }
    if (identityType === 'malaysian' && (!icNumber || icNumber.length !== 12 || !/^\d{12}$/.test(icNumber))) {
      showToast('error', lang === 'zh' ? 'IC 号码必须为12位数字' : 'IC must be 12 digits'); return;
    }
    if (identityType !== 'malaysian' && !passportNumber) {
      showToast('error', lang === 'zh' ? '请填写护照号码' : 'Please enter passport number'); return;
    }

    setSaving(true);
    try {
      if (isMockDatabase) {
        const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
        const myId = localStorage.getItem('ez_tenant_id');
        const idx = users.findIndex((u: any) => u.id === myId);
        const updates = {
          full_name: name, phone, school, company, identity_type: identityType,
          local_id_number: identityType === 'malaysian' ? icNumber : '',
          passport_number: identityType !== 'malaysian' ? passportNumber : '',
          ic_photo_front_url: icFrontUrl, ic_photo_back_url: icBackUrl,
          passport_photo_url: passportPhotoUrl, student_card_url: studentCardUrl,
          work_permit_photo_url: workPermitUrl,
        };
        if (idx >= 0) users[idx] = { ...users[idx], ...updates };
        else users.push({ id: myId, ...updates });
        localStorage.setItem('ez_users', JSON.stringify(users));
        ctx.setProfileIdentityType(identityType as any);
        showToast('success', lang === 'zh' ? '保存成功' : 'Saved successfully');
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const uploadDoc = async (dataUrl: string | null, path: string): Promise<string | null> => {
          if (!dataUrl || dataUrl.startsWith('http')) return dataUrl;
          const blob = await compressDataUrl(dataUrl, REN_TAG_PRESET);
          const { data } = await client.storage.from('unit-media').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
          return data ? client.storage.from('unit-media').getPublicUrl(data.path).data.publicUrl : null;
        };

        const ts = Date.now();
        const [icFront, icBack, passport, studentCard, workPermit] = await Promise.all([
          uploadDoc(icFrontUrl, `tenant-docs/ic/front_${ts}.jpg`),
          uploadDoc(icBackUrl, `tenant-docs/ic/back_${ts}.jpg`),
          uploadDoc(passportPhotoUrl, `tenant-docs/passport/${ts}.jpg`),
          uploadDoc(studentCardUrl, `tenant-docs/student-id/${ts}.jpg`),
          uploadDoc(workPermitUrl, `tenant-docs/work-permit/${ts}.jpg`),
        ]);

        await client.from('users').upsert({
          id: user.id, full_name: name, phone, school, company, identity_type: identityType,
          local_id_number: identityType === 'malaysian' ? icNumber : null,
          passport_number: identityType !== 'malaysian' ? passportNumber : null,
          ic_photo_front_url: icFront, ic_photo_back_url: icBack,
          passport_photo_url: passport, student_card_url: studentCard,
          work_permit_photo_url: workPermit,
        });

        await client.auth.updateUser({ data: { identity_type: identityType, full_name: name } });
        // Sync context
        ctx.setProfileName(name);
        ctx.setProfilePhone(phone);
        ctx.setProfileSchool(school);
        ctx.setProfileCompany(company);
        ctx.setProfileIdentityType(identityType as any);
        ctx.setProfileLocalId(identityType === 'malaysian' ? icNumber : '');
        ctx.setProfilePassport(identityType !== 'malaysian' ? passportNumber : '');
        ctx.setIcFrontUrl(icFront);
        ctx.setIcBackUrl(icBack);
        ctx.setPassportPhotoUrl(passport);
        ctx.setProfileStudentCardUrl(studentCard);
        ctx.setWorkPermitUrl(workPermit);
        showToast('success', lang === 'zh' ? '保存成功' : 'Saved successfully');
      }
    } catch (e: any) {
      showToast('error', e.message || (lang === 'zh' ? '保存失败' : 'Save failed'));
    } finally { setSaving(false); }
  }, [name, phone, school, company, identityType, icNumber, passportNumber, icFrontUrl, icBackUrl, passportPhotoUrl, studentCardUrl, workPermitUrl, lang, showToast, ctx]);

  if (!loaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const isMalaysian = identityType === 'malaysian';
  const isStudent = identityType === 'international_student';
  const needsIdentity = !identityType;

  return (
    <div style={{ paddingBottom: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 12,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(220,38,38,0.95)',
          border: 'none',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          animation: 'slideDown 0.3s ease-out',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} style={{ color: 'white' }} /> : <AlertCircle size={16} style={{ color: 'white' }} />}
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{toast.msg}</span>
        </div>
      )}
      <style>{`@keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>

      {/* Title */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 4 }}>
        {lang === 'zh' ? '个人资料' : 'Profile'}
      </h2>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20 }}>
        {lang === 'zh' ? '管理您的个人信息和身份验证' : 'Manage your info and identity verification'}
      </p>

      {/* Onboarding banner */}
      {needsIdentity && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(13,148,136,0.08), rgba(217,119,6,0.06))',
          border: '1px solid var(--glass-border)', borderRadius: 14, padding: '16px',
          marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <Shield size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 4 }}>
              {lang === 'zh' ? '👋 欢迎！请先完成身份验证' : '👋 Welcome! Please complete identity verification'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
              {lang === 'zh'
                ? '选择身份类型并上传对应证件后，才能使用找房、租房等完整功能。您的证件信息受 RLS 加密保护。'
                : 'Select your identity type and upload documents to unlock all features. Your documents are protected by RLS encryption.'}
            </div>
          </div>
        </div>
      )}

      {/* Basic info */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 16,
        padding: '16px', marginBottom: 16,
      }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={16} style={{ color: 'var(--primary)' }} />
          {lang === 'zh' ? '基本信息' : 'Basic Info'}
        </div>
        <Field label={lang === 'zh' ? '姓名 *' : 'Name *'} icon={<User size={14} />} value={name} onChange={setName} />
        <Field label={lang === 'zh' ? '电话' : 'Phone'} icon={<Phone size={14} />} value={phone} onChange={setPhone} type="tel" />
        <Field label={lang === 'zh' ? '学校' : 'School'} icon={<BookOpen size={14} />} value={school} onChange={setSchool} />
        <Field label={lang === 'zh' ? '公司' : 'Company'} icon={<Briefcase size={14} />} value={company} onChange={setCompany} />
      </div>

      {/* Identity type */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 16,
        padding: '16px', marginBottom: 16,
      }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} style={{ color: 'var(--primary)' }} />
          {lang === 'zh' ? '身份类型 *' : 'Identity Type *'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {IDENTITY_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const selected = identityType === opt.id;
            return (
              <button key={opt.id} onClick={() => setIdentityType(opt.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                background: selected ? 'var(--primary-light)' : 'var(--glass-bg)',
                border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--glass-border)'}`,
                color: selected ? 'var(--primary)' : 'var(--text-body)',
                transition: 'all 0.2s ease', fontSize: '0.7rem', fontWeight: selected ? 700 : 500,
              }}>
                <Icon size={20} />
                <span>{lang === 'zh' ? opt.labelZh : opt.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Identity documents */}
      {identityType && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 16,
          padding: '16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={16} style={{ color: 'var(--primary)' }} />
            {lang === 'zh' ? '证件信息' : 'Documents'}
          </div>

          {isMalaysian ? (
            <>
              <Field label={lang === 'zh' ? 'IC 号码 (12位) *' : 'IC Number (12 digits) *'} icon={<CreditCard size={14} />} value={icNumber} onChange={setIcNumber} maxLength={12} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <ImageUpload label={lang === 'zh' ? 'IC 正面 *' : 'IC Front *'} url={icFrontUrl} onUpload={(f) => handleImageUpload(f, setIcFrontUrl)} onClear={() => setIcFrontUrl(null)} />
                <ImageUpload label={lang === 'zh' ? 'IC 背面 *' : 'IC Back *'} url={icBackUrl} onUpload={(f) => handleImageUpload(f, setIcBackUrl)} onClear={() => setIcBackUrl(null)} />
              </div>
            </>
          ) : (
            <>
              <Field label={lang === 'zh' ? '护照号码 *' : 'Passport Number *'} icon={<CreditCard size={14} />} value={passportNumber} onChange={setPassportNumber} />
              <ImageUpload label={lang === 'zh' ? '护照照片页 *' : 'Passport Photo Page *'} url={passportPhotoUrl} onUpload={(f) => handleImageUpload(f, setPassportPhotoUrl)} onClear={() => setPassportPhotoUrl(null)} />
              {isStudent && (
                <ImageUpload label={lang === 'zh' ? '学生证 (选填)' : 'Student ID (optional)'} url={studentCardUrl} onUpload={(f) => handleImageUpload(f, setStudentCardUrl)} onClear={() => setStudentCardUrl(null)} />
              )}
              {identityType === 'international_other' && (
                <ImageUpload label={lang === 'zh' ? '工作签证 (选填)' : 'Work Permit (optional)'} url={workPermitUrl} onUpload={(f) => handleImageUpload(f, setWorkPermitUrl)} onClear={() => setWorkPermitUrl(null)} />
              )}
            </>
          )}
        </div>
      )}

      {/* Save button */}
      <button onClick={handleSave} disabled={saving} style={{
        width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
        background: 'var(--gradient-primary)', color: 'white', fontSize: '0.9rem', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 4px 14px var(--primary-glow)', opacity: saving ? 0.7 : 1, marginBottom: 16,
      }}>
        <Save size={18} />
        {saving ? (lang === 'zh' ? '保存中...' : 'Saving...') : (lang === 'zh' ? '保存' : 'Save')}
      </button>

      {/* Logout */}
      <button onClick={logout} style={{
        width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
        background: 'transparent', border: '1px solid var(--glass-border)',
        color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <LogOut size={16} />
        {lang === 'zh' ? '退出登录' : 'Logout'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        Malaysia Ez Rent · AI {lang === 'zh' ? '智能租房系统' : 'Smart Rental System'}
      </div>
    </div>
  );
}

function Field({ label, icon, value, onChange, type = 'text', maxLength }: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; type?: string; maxLength?: number;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon} {label}
      </label>
      <input type={type} value={value} maxLength={maxLength} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: '0.85rem',
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-h)',
        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
      }} onFocus={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'} />
    </div>
  );
}

function ImageUpload({ label, url, onUpload, onClear }: {
  label: string; url: string | null; onUpload: (file: File) => void; onClear: () => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{label}</label>
      {url ? (
        <div style={{ position: 'relative' }}>
          <img src={url} alt={label} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
          <button onClick={onClear} style={{
            position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
          }}>×</button>
        </div>
      ) : (
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: 100, borderRadius: 10, cursor: 'pointer',
          border: '2px dashed var(--primary-glow)', background: 'var(--primary-light)',
          transition: 'all 0.2s',
        }}>
          <Camera size={20} style={{ color: 'var(--primary)', marginBottom: 4 }} />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</span>
          <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  );
}
