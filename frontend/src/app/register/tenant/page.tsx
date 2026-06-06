'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, Eye, EyeOff, User, GraduationCap, Briefcase, FileText, Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { compressImageFile, compressImageToDataUrl } from '@/utils/compressImage';
import VerificationInput from '@/components/VerificationInput';

type IdentityType = 'malaysian' | 'international_student' | 'international_other';

export default function TenantRegisterPage() {
  const { lang, t } = useApp();
  const router = useRouter();

  // Multi-step progress: 1 = Identity Selection, 2 = Form Details, 3 = Document Upload
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identityType, setIdentityType] = useState<IdentityType>('malaysian');

  // Step 2 Form details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Identity verification (OTP)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Identity-specific inputs
  const [localIdNumber, setLocalIdNumber] = useState(''); // IC format
  const [passportNumber, setPassportNumber] = useState('');
  const [school, setSchool] = useState('');
  const [company, setCompany] = useState('');

  // Step 3 Document uploads
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
    document.title = `${lang === 'zh' ? '租客注册' : 'Tenant Registration'} | Malaysia Ez Rent`;
  }, [lang]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError(lang === 'zh' ? '请输入有效的电子邮箱' : 'Please enter a valid email address');
      return;
    }
    setError('');
    setSendingOtp(true);

    try {
      if (isMockDatabase) {
        console.log('[Mock OTP] Code generated for:', email);
        showToast(lang === 'zh' ? '验证码发送成功（开发模式）' : 'Verification code sent (Dev Mode)', 'success');
        setOtpSent(true);
        setOtpCountdown(60);
      } else {
        const res = await fetch('/api/send-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim() })
        });
        const data = await res.json();
        if (data.success) {
          showToast(lang === 'zh' ? '验证码已发送至您的邮箱' : 'Verification code sent to your email', 'success');
          setOtpSent(true);
          setOtpCountdown(60);
        } else {
          setError(data.error || (lang === 'zh' ? '发送验证码失败' : 'Failed to send verification code'));
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error sending OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setError(lang === 'zh' ? '请输入6位验证码' : 'Please enter 6-digit code');
      return;
    }
    setError('');
    setVerifyingOtp(true);

    try {
      if (isMockDatabase) {
        setOtpVerified(true);
        showToast(lang === 'zh' ? '邮箱验证成功！' : 'Email verified successfully!', 'success');
      } else {
        const res = await fetch('/api/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim(), code: otpCode.trim() })
        });
        const data = await res.json();
        if (data.valid) {
          setOtpVerified(true);
          showToast(lang === 'zh' ? '邮箱验证成功！' : 'Email verified successfully!', 'success');
        } else {
          setError(
            data.error === 'wrong_code' ? (lang === 'zh' ? '验证码错误' : 'Incorrect code') :
            data.error === 'expired' ? (lang === 'zh' ? '验证码已过期，请重新发送' : 'Code expired, please resend') :
            (lang === 'zh' ? '验证失败' : 'Verification failed')
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error verifying OTP');
    } finally {
      setVerifyingOtp(false);
    }
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

  const validateStep2 = () => {
    if (!fullName.trim()) return lang === 'zh' ? '请输入您的姓名' : 'Please enter your name';
    if (!email.trim() || !email.includes('@')) return lang === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email';
    if (!otpVerified) return lang === 'zh' ? '请先验证邮箱' : 'Please verify your email first';
    
    // Normalize phone format
    const digits = phone.replace(/\D/g, '');
    if (!digits) return lang === 'zh' ? '请输入手机号' : 'Please enter your phone number';

    if (!password) return lang === 'zh' ? '请输入密码' : 'Please enter a password';
    if (password.length < 6) return lang === 'zh' ? '密码长度不能少于 6 位' : 'Password must be at least 6 characters';
    if (password !== confirmPassword) return lang === 'zh' ? '两次输入的密码不一致' : 'Passwords do not match';

    // Identity-specific validations
    if (identityType === 'malaysian') {
      const cleanedIc = localIdNumber.replace(/[^0-9]/g, '');
      if (cleanedIc.length !== 12) return lang === 'zh' ? '身份证号码格式不正确（12位数字）' : 'Invalid IC number (12 digits required)';
    } else {
      if (!passportNumber.trim()) return lang === 'zh' ? '请输入护照号码' : 'Please enter passport number';
    }

    return null;
  };

  const handleStep2Next = () => {
    const validationErr = validateStep2();
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setError('');
    setStep(3);
  };

  const handleRegisterSubmit = async () => {
    setError('');

    // Step 3 validation
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
        // Mock save
        const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
        const mockUserId = `tenant-${Date.now()}`;
        const newTenant = {
          id: mockUserId,
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
        users.push(newTenant);
        localStorage.setItem('ez_users', JSON.stringify(users));

        // Auto-login details
        localStorage.setItem('ez_user_email', email.toLowerCase().trim());
        localStorage.setItem('ez_user_role', 'student');
        localStorage.setItem('ez_tenant_id', mockUserId);
        localStorage.setItem('ez_logged_in', '1');
        document.cookie = 'ez_logged_in=1; path=/; max-age=31536000';

        showToast(lang === 'zh' ? '注册成功！' : 'Registration successful!', 'success');
        setTimeout(() => router.push('/listings'), 1500);
      } else {
        // Real Supabase Flow
        // 1. Sign up user via supabase auth
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              role: 'student',
              full_name: fullName.trim(),
              identity_type: identityType
            }
          }
        });

        if (signUpErr) throw signUpErr;
        if (!signUpData?.user) throw new Error('Sign up failed: User object empty');

        const userId = signUpData.user.id;

        // 2. Upload images to Storage
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

        // 3. Update public.users record
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

        showToast(lang === 'zh' ? '注册成功，正在登录...' : 'Registration successful! Logging in...', 'success');
        
        // Auto sign in to verify session and set cookies
        await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });
        
        document.cookie = 'ez_logged_in=1; path=/; max-age=31536000';
        setTimeout(() => router.push('/listings'), 1500);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 6px' }}>
          {lang === 'zh' ? '租客账户注册' : 'Tenant Registration'}
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          {lang === 'zh' ? '请选择您的身份，并提供真实信息完成实名验证' : 'Choose your identity and provide info to complete verification'}
        </p>
      </div>

      {/* Steps indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', margin: '0 10px' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'var(--glass-border)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, width: `${(step - 1) * 50}%`, height: 2, background: 'var(--primary)', zIndex: 0, transition: 'all 0.3s ease' }} />
        
        {[1, 2, 3].map(num => (
          <div key={num} style={{
            width: 28, height: 28, borderRadius: '50%', zIndex: 1, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.3s ease',
            background: step >= num ? 'var(--primary)' : 'var(--bg-base)',
            color: step >= num ? 'white' : 'var(--text-muted)',
            border: `2px solid ${step >= num ? 'var(--primary)' : 'var(--glass-border)'}`,
          }}>
            {num}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {/* Step 1: Select Identity Type */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { id: 'malaysian', title: '马来西亚公民', titleEn: 'Malaysian Citizen', desc: '需要提供大马身份证（MyKad）正反面照片进行实名验证', descEn: 'MyKad ID card photos required for identity verification' },
            { id: 'international_student', title: '国际留学生', titleEn: 'International Student', desc: '需要提供护照个人信息页及录取通知书或学生证照片验证', descEn: 'Passport and student card/admission offer photo required' },
            { id: 'international_other', title: '其他外籍人士', titleEn: 'International Worker / Other', desc: '需提供护照照片，以及工作许可证/就业准证照片进行验证', descEn: 'Passport and work permit/visa documentation required' }
          ].map(opt => (
            <div
              key={opt.id}
              onClick={() => setIdentityType(opt.id as IdentityType)}
              style={{
                padding: '16px 20px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s ease',
                background: identityType === opt.id ? 'var(--primary-light)' : 'var(--glass-bg)',
                border: `2px solid ${identityType === opt.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                boxShadow: identityType === opt.id ? '0 4px 12px rgba(13, 148, 136, 0.1)' : 'none'
              }}
            >
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: identityType === opt.id ? 'var(--primary)' : 'var(--text-h)', margin: '0 0 4px' }}>
                {lang === 'zh' ? opt.title : opt.titleEn}
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {lang === 'zh' ? opt.desc : opt.descEn}
              </p>
            </div>
          ))}

          <button
            onClick={() => setStep(2)}
            className="flex-center"
            style={{
              padding: '12px', borderRadius: 10, background: 'var(--primary)', color: 'white',
              fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 10, gap: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {lang === 'zh' ? '下一步' : 'Next Step'} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Form inputs */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '真实姓名' : 'Full Name'} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder={lang === 'zh' ? '请输入您的真实姓名' : 'Enter your full name'}
                style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Email + Verification */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '电子邮箱' : 'Email Address'} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" name="email" autoComplete="username" className="form-input" value={email} onChange={e => { setEmail(e.target.value); setOtpVerified(false); setOtpSent(false); }}
                  placeholder="yourname@email.com" disabled={otpVerified}
                  style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
              </div>
              {!otpVerified && (
                <button
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpCountdown > 0 || !email}
                  style={{
                    padding: '0 14px', borderRadius: 10, border: 'none', background: 'var(--primary)',
                    color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', opacity: (sendingOtp || otpCountdown > 0 || !email) ? 0.6 : 1
                  }}
                >
                  {sendingOtp ? <Loader2 size={14} className="animate-spin" /> :
                   otpCountdown > 0 ? `${otpCountdown}s` :
                   otpSent ? (lang === 'zh' ? '重发' : 'Resend') : (lang === 'zh' ? '发送验证码' : 'Send OTP')}
                </button>
              )}
            </div>

            {/* OTP Verification Input */}
            {otpSent && !otpVerified && (
              <div style={{ marginTop: 12, background: 'var(--glass-bg)', padding: 14, borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
                  {lang === 'zh' ? '请输入发送至您邮箱的 6 位数验证码' : 'Enter the 6-digit code sent to your email'}
                </p>
                <VerificationInput value={otpCode} onChange={setOtpCode} />
                <button
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpCode.length < 6}
                  style={{
                    width: '100%', marginTop: 12, padding: '8px', borderRadius: 8, border: 'none',
                    background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: '0.82rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  {verifyingOtp ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {lang === 'zh' ? '验证邮箱' : 'Verify Email'}
                </button>
              </div>
            )}

            {otpVerified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--success)', fontSize: '0.78rem' }}>
                <CheckCircle2 size={14} />
                <span>{lang === 'zh' ? '邮箱已成功验证' : 'Email verified successfully'}</span>
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '手机号码' : 'Phone Number'} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+60123456789"
                style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '设置密码' : 'Password'} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type={showPassword ? 'text' : 'password'} name="new-password" autoComplete="new-password" className="form-input" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={lang === 'zh' ? '至少6位字符' : 'At least 6 characters'}
                style={{ width: '100%', paddingLeft: 36, paddingRight: 36, boxSizing: 'border-box' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={15} style={{ color: 'var(--text-muted)' }} /> : <Eye size={15} style={{ color: 'var(--text-muted)' }} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              {lang === 'zh' ? '确认密码' : 'Confirm Password'} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="password" autoComplete="new-password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder={lang === 'zh' ? '再次输入密码' : 'Re-enter password'}
                style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Identity Type Specific Details */}
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
                  placeholder="E.g. A1234567"
                  style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
              </div>

              {identityType === 'international_student' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    {lang === 'zh' ? '就读院校' : 'School / University'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <GraduationCap size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" value={school} onChange={e => setSchool(e.target.value)}
                      placeholder="E.g. Sunway University"
                      style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    {lang === 'zh' ? '工作单位/公司' : 'Employer / Company'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="E.g. Google Malaysia"
                      style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button
              onClick={() => setStep(1)}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, background: 'none',
                color: 'var(--text-body)', border: '1px solid var(--glass-border)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <ArrowLeft size={16} /> {lang === 'zh' ? '上一步' : 'Back'}
            </button>
            <button
              onClick={handleStep2Next}
              style={{
                flex: 2, padding: '12px', borderRadius: 10, background: 'var(--primary)',
                color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {lang === 'zh' ? '下一步' : 'Next Step'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Document uploads */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 10, background: 'rgba(13, 148, 136, 0.08)', border: '1px solid var(--primary-glow)' }}>
            <ShieldAlert size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-body)', margin: 0, lineHeight: 1.4 }}>
              {lang === 'zh'
                ? '提示：我们承诺仅将您的身份证明文件用于租约审核与防欺诈，数据通过高级加密存储。文件大小不超过 8MB。'
                : 'Notice: We promise to only use your identity documents for lease verification and anti-fraud purposes. Data is stored with high-level encryption. Max 8MB.'}
            </p>
          </div>

          {identityType === 'malaysian' && (
            <>
              {/* Front of IC */}
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

              {/* Back of IC */}
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

              {/* Identity specific optional documents */}
              {identityType === 'international_student' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    {lang === 'zh' ? '学生证或录取通知书（选填）' : 'Student Card or Offer Letter (Optional)'}
                  </label>
                  {studentCardPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={studentCardPreview} alt="Student ID" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
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

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button
              onClick={() => setStep(2)}
              disabled={submitting}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, background: 'none',
                color: 'var(--text-body)', border: '1px solid var(--glass-border)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <ArrowLeft size={16} /> {lang === 'zh' ? '上一步' : 'Back'}
            </button>
            <button
              onClick={handleRegisterSubmit}
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
                  {lang === 'zh' ? '提交注册中...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {lang === 'zh' ? '确认并完成注册' : 'Register Now'}
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
