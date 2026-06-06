'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, User, GraduationCap, Briefcase, FileText, Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { compressImageFile, compressImageToDataUrl } from '@/utils/compressImage';

type IdentityType = 'malaysian' | 'international_student' | 'international_other';

export default function CompleteProfilePage() {
  const { lang } = useApp();
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [identityType, setIdentityType] = useState<IdentityType>('malaysian');

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [localIdNumber, setLocalIdNumber] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [school, setSchool] = useState('');
  const [company, setCompany] = useState('');

  // Document uploads
  const [icFrontFile, setIcFrontFile] = useState<File | null>(null);
  const [icFrontPreview, setIcFrontPreview] = useState<string | null>(null);
  const [icBackFile, setIcBackFile] = useState<File | null>(null);
  const [icBackPreview, setIcBackPreview] = useState<string | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [studentCardFile, setStudentCardFile] = useState<File | null>(null);
  const [studentCardPreview, setStudentCardPreview] = useState<string | null>(null);
  const [workPermitFile, setWorkPermitFile] = useState<File | null>(null);
  const [workPermitPreview, setWorkPermitPreview] = useState<string | null>(null);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    document.title = `${lang === 'zh' ? '完善个人资料' : 'Complete Profile'} | Malaysia Ez Rent`;
    checkUser();
  }, [lang]);

  const checkUser = async () => {
    try {
      if (isMockDatabase) {
        const mockEmail = localStorage.getItem('ez_user_email') || 'google-tenant@gmail.com';
        setEmail(mockEmail);
        setFullName('Google User');
        setLoadingUser(false);
      } else {
        const { data: { user }, error: uErr } = await supabase.auth.getUser();
        if (uErr || !user) {
          router.push('/login');
          return;
        }
        setEmail(user.email || '');
        setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        setLoadingUser(false);
      }
    } catch (err) {
      console.error(err);
      router.push('/login');
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast(lang === 'zh' ? '仅支持 JPG/PNG/WEBP 格式' : 'Only JPG, PNG, and WEBP are supported', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast(lang === 'zh' ? '文件大小不能超过 8MB' : 'File must be under 8MB', 'error');
      return;
    }

    // Set file object immediately for live storage flow
    if (field === 'icFront') setIcFrontFile(file);
    else if (field === 'icBack') setIcBackFile(file);
    else if (field === 'passport') setPassportFile(file);
    else if (field === 'studentCard') setStudentCardFile(file);
    else if (field === 'workPermit') setWorkPermitFile(file);

    // Compress immediately to optimize preview and mock storage
    compressImageToDataUrl(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
      .then(b64 => {
        if (field === 'icFront') setIcFrontPreview(b64);
        else if (field === 'icBack') setIcBackPreview(b64);
        else if (field === 'passport') setPassportPreview(b64);
        else if (field === 'studentCard') setStudentCardPreview(b64);
        else if (field === 'workPermit') setWorkPermitPreview(b64);
      })
      .catch(err => {
        console.error('Image compression failed:', err);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          if (field === 'icFront') setIcFrontPreview(result);
          else if (field === 'icBack') setIcBackPreview(result);
          else if (field === 'passport') setPassportPreview(result);
          else if (field === 'studentCard') setStudentCardPreview(result);
          else if (field === 'workPermit') setWorkPermitPreview(result);
        };
        reader.readAsDataURL(file);
      });
  };

  const validateStep1 = () => {
    if (!fullName.trim()) return lang === 'zh' ? '请输入您的姓名' : 'Please enter your name';
    if (!phone.trim()) return lang === 'zh' ? '请输入手机号' : 'Please enter your phone number';

    // Identity-specific validations
    if (identityType === 'malaysian') {
      const cleanedIc = localIdNumber.replace(/[^0-9]/g, '');
      if (cleanedIc.length !== 12) return lang === 'zh' ? '身份证号码格式不正确（12位数字）' : 'Invalid IC number (12 digits required)';
    } else {
      if (!passportNumber.trim()) return lang === 'zh' ? '请输入护照号码' : 'Please enter passport number';
    }

    return null;
  };

  const handleStep1Next = () => {
    const validationErr = validateStep1();
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    setError('');

    // Step 2 document validations
    if (identityType === 'malaysian') {
      if (!icFrontFile || !icBackFile) {
        setError(lang === 'zh' ? '请上传身份证正反面照片' : 'Please upload both front and back IC photos');
        return;
      }
    } else {
      if (!passportFile) {
        setError(lang === 'zh' ? '请上传护照照片页' : 'Please upload passport photo page');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (isMockDatabase) {
        // Mock profile completion
        const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
        const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
        
        const existingIdx = users.findIndex((u: any) => u.id === tenantId || u.email === email);
        const updatedUser = {
          id: tenantId,
          email: email.toLowerCase().trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${fullName}`,
          identity_type: identityType,
          local_id_number: localIdNumber ? localIdNumber.replace(/[^0-9]/g, '') : null,
          passport_number: passportNumber ? passportNumber.toUpperCase().trim() : null,
          school: school.trim() || null,
          company: company.trim() || null,
          ic_photo_front_url: icFrontPreview || null,
          ic_photo_back_url: icBackPreview || null,
          passport_photo_url: passportPreview || null,
          student_card_url: studentCardPreview || null,
          work_permit_photo_url: workPermitPreview || null,
          created_at: new Date().toISOString()
        };

        if (existingIdx !== -1) {
          users[existingIdx] = updatedUser;
        } else {
          users.push(updatedUser);
        }

        localStorage.setItem('ez_users', JSON.stringify(users));
        localStorage.setItem('ez_user_role', 'student');
        localStorage.setItem('ez_logged_in', '1');
        document.cookie = 'ez_logged_in=1; path=/; max-age=31536000';

        showToast(lang === 'zh' ? '资料完善成功！' : 'Profile completed successfully!', 'success');
        setTimeout(() => router.push('/listings'), 1500);
      } else {
        // Real Supabase Flow
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User session not found');

        const userId = user.id;

        // 1. Upload documents
        let icFrontUrl = '';
        let icBackUrl = '';
        let passportUrl = '';
        let studentCardUrl = '';
        let workPermitUrl = '';

        const uploadHelper = async (file: File, path: string) => {
          const compressed = await compressImageFile(file, { quality: 0.85, maxWidth: 1600 });
          const { error: uploadErr } = await supabase.storage
            .from('unit-media')
            .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
          if (uploadErr) throw uploadErr;
          
          const { data } = supabase.storage.from('unit-media').getPublicUrl(path);
          return data.publicUrl;
        };

        if (identityType === 'malaysian') {
          if (icFrontFile) icFrontUrl = await uploadHelper(icFrontFile, `tenant-docs/ic/${userId}-front.jpg`);
          if (icBackFile) icBackUrl = await uploadHelper(icBackFile, `tenant-docs/ic/${userId}-back.jpg`);
        } else {
          if (passportFile) passportUrl = await uploadHelper(passportFile, `tenant-docs/passport/${userId}.jpg`);
          if (identityType === 'international_student' && studentCardFile) {
            studentCardUrl = await uploadHelper(studentCardFile, `tenant-docs/student-id/${userId}.jpg`);
          }
          if (identityType === 'international_other' && workPermitFile) {
            workPermitUrl = await uploadHelper(workPermitFile, `tenant-docs/work-permit/${userId}.jpg`);
          }
        }

        // 2. Update user metadata role & identity_type
        const { error: metaErr } = await supabase.auth.updateUser({
          data: {
            role: 'student',
            identity_type: identityType,
            full_name: fullName.trim()
          }
        });
        if (metaErr) throw metaErr;

        // 3. Upsert user row in users table
        const profileUpdate: any = {
          id: userId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          identity_type: identityType,
          ic_photo_front_url: icFrontUrl || null,
          ic_photo_back_url: icBackUrl || null,
          passport_photo_url: passportUrl || null,
          student_card_url: studentCardUrl || null,
          work_permit_photo_url: workPermitUrl || null,
          local_id_number: localIdNumber ? localIdNumber.replace(/[^0-9]/g, '') : null,
          passport_number: passportNumber ? passportNumber.toUpperCase().trim() : null,
          school: school.trim() || null,
          company: company.trim() || null,
        };

        const { error: updateErr } = await supabase.from('users').upsert(profileUpdate);
        if (updateErr) throw updateErr;

        showToast(lang === 'zh' ? '资料已完善！' : 'Profile completed!', 'success');
        setTimeout(() => router.push('/listings'), 1500);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete profile');
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
        <Loader2 size={30} className="animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 6px' }}>
          {lang === 'zh' ? '完善个人资料' : 'Complete Profile'}
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          {lang === 'zh' ? '为了租房安全，请提供您的真实信息以完成实名核验' : 'For rental safety, verify your identity details'}
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {/* Step 1: Selection & Text form details */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Identity Selection */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '身份类型' : 'Identity Type'} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'malaysian', label: '🇲🇾 马来西亚本地人', labelEn: 'Malaysian Citizen' },
                { id: 'international_student', label: '🌍 国际留学生', labelEn: 'International Student' },
                { id: 'international_other', label: '🌐 其他外籍人士', labelEn: 'International Other' }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setIdentityType(opt.id as IdentityType)}
                  style={{
                    padding: '12px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s ease',
                    background: identityType === opt.id ? 'var(--primary-light)' : 'var(--glass-bg)',
                    border: `1px solid ${identityType === opt.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                  }}
                >
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: identityType === opt.id ? 'var(--primary)' : 'var(--text-h)' }}>
                    {lang === 'zh' ? opt.label : opt.labelEn}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '真实姓名' : 'Full Name'} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder={lang === 'zh' ? '真实姓名' : 'Full Name'}
                style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Email (readonly) */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '电子邮箱' : 'Email'}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="email" className="form-input" value={email} disabled
                style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box', opacity: 0.6 }} />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '手机号码' : 'Phone Number'} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+60123456789"
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>

          {/* Identity Specific */}
          {identityType === 'malaysian' ? (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                {lang === 'zh' ? '身份证号码' : 'IC Number'} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="text" className="form-input" value={localIdNumber}
                onChange={e => setLocalIdNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="yymmddxxxxxx" maxLength={12}
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  {lang === 'zh' ? '护照号码' : 'Passport Number'} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input type="text" className="form-input" value={passportNumber}
                  onChange={e => setPassportNumber(e.target.value.toUpperCase())}
                  placeholder="Passport No."
                  style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
              </div>

              {identityType === 'international_student' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    {lang === 'zh' ? '就读院校' : 'School / University'}
                  </label>
                  <input type="text" className="form-input" value={school} onChange={e => setSchool(e.target.value)}
                    placeholder="E.g. Taylor's University"
                    style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    {lang === 'zh' ? '工作单位/公司' : 'Employer / Company'}
                  </label>
                  <input type="text" className="form-input" value={company} onChange={e => setCompany(e.target.value)}
                    placeholder="E.g. Shopee Malaysia"
                    style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              )}
            </>
          )}

          {/* Next button */}
          <button
            onClick={handleStep1Next}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, background: 'var(--primary)',
              color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10
            }}
          >
            {lang === 'zh' ? '下一步' : 'Next Step'} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Document upload */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 10, background: 'rgba(13, 148, 136, 0.08)', border: '1px solid var(--primary-glow)' }}>
            <ShieldAlert size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-body)', margin: 0, lineHeight: 1.4 }}>
              {lang === 'zh'
                ? '提示：证件信息仅供平台实名安全审查使用，信息已加密，仅有权管理者在签约审核时可阅。大小上限 8MB。'
                : 'Notice: Info only used for safety check, encrypted storage, accessible by authorized agents upon lease draft. Max 8MB.'}
            </p>
          </div>

          {identityType === 'malaysian' && (
            <>
              {/* MyKad Front */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  {lang === 'zh' ? '身份证正面照片' : 'IC Photo (Front)'} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                {icFrontPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={icFrontPreview} alt="IC Front" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
                    <button onClick={() => { setIcFrontFile(null); setIcFrontPreview(null); }}
                      style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>
                      {lang === 'zh' ? '重选' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <label className="drag-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 16px', border: '2px dashed var(--glass-border)', borderRadius: 10, cursor: 'pointer', background: 'var(--glass-bg)' }}>
                    <Upload size={22} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{lang === 'zh' ? '点击上传身份证正面' : 'Upload front photo'}</span>
                    <input type="file" accept="image/*" onChange={e => handleImageSelect(e, 'icFront')} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* MyKad Back */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  {lang === 'zh' ? '身份证背面照片' : 'IC Photo (Back)'} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                {icBackPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={icBackPreview} alt="IC Back" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
                    <button onClick={() => { setIcBackFile(null); setIcBackPreview(null); }}
                      style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>
                      {lang === 'zh' ? '重选' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <label className="drag-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 16px', border: '2px dashed var(--glass-border)', borderRadius: 10, cursor: 'pointer', background: 'var(--glass-bg)' }}>
                    <Upload size={22} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{lang === 'zh' ? '点击上传身份证背面' : 'Upload back photo'}</span>
                    <input type="file" accept="image/*" onChange={e => handleImageSelect(e, 'icBack')} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </>
          )}

          {identityType !== 'malaysian' && (
            <>
              {/* Passport Photo */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  {lang === 'zh' ? '护照照片页' : 'Passport Information Page'} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                {passportPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={passportPreview} alt="Passport" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
                    <button onClick={() => { setPassportFile(null); setPassportPreview(null); }}
                      style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>
                      {lang === 'zh' ? '重选' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <label className="drag-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 16px', border: '2px dashed var(--glass-border)', borderRadius: 10, cursor: 'pointer', background: 'var(--glass-bg)' }}>
                    <Upload size={22} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{lang === 'zh' ? '点击上传护照信息页' : 'Upload passport info page'}</span>
                    <input type="file" accept="image/*" onChange={e => handleImageSelect(e, 'passport')} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {identityType === 'international_student' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    {lang === 'zh' ? '学生证或录取函（选填）' : 'Student ID or Offer Letter (Optional)'}
                  </label>
                  {studentCardPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={studentCardPreview} alt="Student Card" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
                      <button onClick={() => { setStudentCardFile(null); setStudentCardPreview(null); }}
                        style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>
                        {lang === 'zh' ? '重选' : 'Change'}
                      </button>
                    </div>
                  ) : (
                    <label className="drag-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 16px', border: '2px dashed var(--glass-border)', borderRadius: 10, cursor: 'pointer', background: 'var(--glass-bg)' }}>
                      <Upload size={22} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{lang === 'zh' ? '点击上传学生证/录取函' : 'Upload student card/offer'}</span>
                      <input type="file" accept="image/*" onChange={e => handleImageSelect(e, 'studentCard')} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    {lang === 'zh' ? '工作准证/Employment Permit（选填）' : 'Work Permit / Visa (Optional)'}
                  </label>
                  {workPermitPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={workPermitPreview} alt="Work Permit" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
                      <button onClick={() => { setWorkPermitFile(null); setWorkPermitPreview(null); }}
                        style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>
                        {lang === 'zh' ? '重选' : 'Change'}
                      </button>
                    </div>
                  ) : (
                    <label className="drag-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 16px', border: '2px dashed var(--glass-border)', borderRadius: 10, cursor: 'pointer', background: 'var(--glass-bg)' }}>
                      <Upload size={22} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{lang === 'zh' ? '点击上传工作准证' : 'Upload work permit'}</span>
                      <input type="file" accept="image/*" onChange={e => handleImageSelect(e, 'workPermit')} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              )}
            </>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button
              onClick={() => setStep(1)}
              disabled={submitting}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, background: 'none',
                color: 'var(--text-body)', border: '1px solid var(--glass-border)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <ArrowLeft size={16} /> {lang === 'zh' ? '返回上一步' : 'Back'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 2, padding: '12px', borderRadius: 10, background: 'var(--primary)',
                color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {lang === 'zh' ? '保存中...' : 'Saving...'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {lang === 'zh' ? '保存并进入系统' : 'Complete Onboarding'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 24px', borderRadius: 10, zIndex: 999,
          background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', fontSize: '0.88rem', fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'scaleIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .drag-upload:hover { border-color: var(--primary) !important; background: var(--primary-light) !important; }
      `}</style>
    </div>
  );
}
