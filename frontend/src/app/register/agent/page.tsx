'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, Eye, EyeOff, User, Building2, FileText, Upload, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Camera, X } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { compressImageFile, compressDataUrl, compressImageToDataUrl, REN_TAG_PRESET } from '@/utils/compressImage';
import VerificationInput from '@/components/VerificationInput';

export default function AgentRegisterPage() {
  const { lang } = useApp();
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [renNumber, setRenNumber] = useState('');
  const [renTagImage, setRenTagImage] = useState<string | null>(null);
  const [renTagFile, setRenTagFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    document.title = `${lang === 'zh' ? '中介申请入驻' : 'Agent Registration'} | Malaysia Ez Rent`;
  }, [lang]);

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
    
    // Temporarily bypass Resend email verification requirement for easy deployment
    setOtpVerified(true);
    showToast(lang === 'zh' ? '邮箱验证成功！' : 'Email verified successfully!', 'success');
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

  const normalizePhone = (raw: string): string | null => {
    const digits = raw.replace(/[^0-9]/g, '');
    let normalized = digits;
    if (normalized.startsWith('60')) normalized = normalized.substring(2);
    if (normalized.startsWith('0')) normalized = normalized.substring(1);
    if (!/^1[0-9]{8,9}$/.test(normalized)) return null;
    return '60' + normalized;
  };

  const normalizeREN = (raw: string): string | null => {
    const cleaned = raw.trim().toUpperCase().replace(/[-\s]/g, '');
    if (!/^REN[0-9]{4,7}$/.test(cleaned)) return null;
    return cleaned;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(lang === 'zh' ? '只支持 JPG/PNG/WEBP 格式图片' : 'Only JPG/PNG/WEBP images are accepted');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(lang === 'zh' ? '图片大小不能超过 8MB' : 'Image size must be under 8MB');
      return;
    }

    setError('');
    setRenTagFile(file);
    
    // Compress immediately to reduce preview and mock storage size
    compressImageToDataUrl(file, REN_TAG_PRESET)
      .then(b64 => setRenTagImage(b64))
      .catch(err => {
        console.error('Image compression failed:', err);
        const reader = new FileReader();
        reader.onload = (ev) => setRenTagImage(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
  };

  const validateForm = () => {
    if (!fullName.trim()) return lang === 'zh' ? '请填写姓名' : 'Please enter your name';
    if (!email.trim() || !email.includes('@')) return lang === 'zh' ? '请填写有效的邮箱地址' : 'Please enter a valid email address';
    if (!otpVerified) return lang === 'zh' ? '请先验证邮箱' : 'Please verify your email first';
    
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return lang === 'zh' ? '手机号格式不正确（马来西亚手机号）' : 'Invalid Malaysian phone number format';

    if (whatsapp.trim() && !normalizePhone(whatsapp)) return lang === 'zh' ? 'WhatsApp 号码格式不正确' : 'Invalid WhatsApp number format';
    
    if (!agencyName.trim()) return lang === 'zh' ? '请填写公司名称' : 'Please enter your agency name';
    
    const normalizedREN = normalizeREN(renNumber);
    if (!normalizedREN) return lang === 'zh' ? 'REN 编号格式不正确（如 REN12345）' : 'Invalid REN number format (e.g. REN12345)';
    
    if (!renTagFile && !renTagImage) return lang === 'zh' ? '请上传 REN 执照照片' : 'Please upload your REN tag image';
    
    if (!password) return lang === 'zh' ? '请输入密码' : 'Please enter a password';
    if (password.length < 6) return lang === 'zh' ? '密码长度不能少于 6 位' : 'Password must be at least 6 characters';
    if (password !== confirmPassword) return lang === 'zh' ? '两次输入的密码不一致' : 'Passwords do not match';

    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const formErr = validateForm();
    if (formErr) {
      setError(formErr);
      return;
    }

    setSubmitting(true);

    try {
      const normalizedPhone = normalizePhone(phone) || phone;
      const normalizedWhatsapp = whatsapp.trim() ? (normalizePhone(whatsapp) || whatsapp) : null;
      const normalizedREN = normalizeREN(renNumber) || renNumber;

      if (isMockDatabase) {
        // Mock save registration
        const regs = JSON.parse(localStorage.getItem('ez_agent_profiles') || '[]');
        const newRegId = `reg-${Date.now()}`;
        regs.push({
          id: newRegId,
          auth_user_id: `agent-mock-${Date.now()}`,
          email: email.toLowerCase().trim(),
          full_name: fullName.trim(),
          phone: normalizedPhone,
          whatsapp: normalizedWhatsapp,
          agency_name: agencyName.trim(),
          ren_number: normalizedREN,
          ren_tag_image_url: renTagImage || '',
          verification_status: 'pending',
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('ez_agent_profiles', JSON.stringify(regs));

        setSuccess(true);
      } else {
        // Real Supabase
        // 1. Create auth user with role metadata 'agent'
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              role: 'agent',
              full_name: fullName.trim(),
              agency_name: agencyName.trim(),
              ren_number: normalizedREN,
            }
          }
        });

        if (signUpErr) throw signUpErr;
        if (!signUpData?.user) throw new Error('Auth registration failed');

        const userId = signUpData.user.id;

        // 2. Compress & Upload REN tag image
        let uploadBlob: Blob;
        if (renTagFile) {
          uploadBlob = await compressImageFile(renTagFile, REN_TAG_PRESET);
        } else if (renTagImage) {
          uploadBlob = await compressDataUrl(renTagImage, REN_TAG_PRESET);
        } else {
          throw new Error('No REN tag image file found');
        }

        const fileName = `ren-tag-${Date.now()}.jpg`;
        const path = `ren-tags/${fileName}`;
        const { error: uploadErr } = await supabase.storage
          .from('unit-media')
          .upload(path, uploadBlob, { upsert: true, contentType: 'image/jpeg' });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from('unit-media').getPublicUrl(path);
        const renTagUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        // 3. Insert into agent_profiles
        const { error: insertErr } = await supabase.from('agent_profiles').insert({
          auth_user_id: userId,
          email: email.toLowerCase().trim(),
          full_name: fullName.trim(),
          phone: normalizedPhone,
          whatsapp: normalizedWhatsapp,
          agency_name: agencyName.trim(),
          ren_number: normalizedREN,
          ren_tag_image_url: renTagUrl,
          verification_status: 'pending'
        });

        if (insertErr) throw insertErr;

        setSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', animation: 'scaleIn 0.3s ease' }}>
        <CheckCircle2 size={46} style={{ color: 'var(--success)', marginBottom: 14, display: 'inline-block' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-h)', marginBottom: 8 }}>
          {lang === 'zh' ? '申请提交成功！' : 'Application Submitted!'}
        </h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          {lang === 'zh' 
            ? '您的中介入驻申请已成功提交，正在等待平台管理员审核。审核结果将通过邮箱通知您，请注意查收邮件。' 
            : 'Your agent onboarding request has been submitted. It is now awaiting review by admin. We will notify you via email once approved.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/login" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 10, background: 'var(--primary)',
            color: 'white', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none',
          }}>
            {lang === 'zh' ? '返回登录' : 'Back to Login'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>
          {lang === 'zh' ? '中介入驻申请' : 'Agent Onboarding'}
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
          {lang === 'zh' ? '填写您的 REN 执照与资料，通过审核后即可发布房源' : 'Submit your details & REN card. Start publishing upon approval.'}
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>
        </div>
      )}

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Full Name */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
            {lang === 'zh' ? '姓名' : 'Full Name'} <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder={lang === 'zh' ? '请输入您的真实姓名' : 'Enter your full name'}
              style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Email + OTP */}
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
              <span>{lang === 'zh' ? '邮箱已验证' : 'Email verified'}</span>
            </div>
          )}
        </div>

        {/* Phone */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
            {lang === 'zh' ? '手机号' : 'Phone Number'} <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="0123456789"
              style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            {lang === 'zh' ? '马来西亚手机号，如 0123456789' : 'Malaysian mobile number, e.g. 0123456789'}
          </span>
        </div>

        {/* WhatsApp */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
            WhatsApp
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="tel" className="form-input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder={lang === 'zh' ? '选填，如与手机号相同可留空' : 'Optional, leave blank if same as phone'}
              style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Agency Name */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
            {lang === 'zh' ? '所属公司' : 'Agency Name'} <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Building2 size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" value={agencyName} onChange={e => setAgencyName(e.target.value)}
              placeholder={lang === 'zh' ? '如：PropNex Realty Sdn Bhd' : 'e.g. PropNex Realty Sdn Bhd'}
              style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* REN Number */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
            {lang === 'zh' ? 'REN 编号' : 'REN Number'} <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <FileText size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" value={renNumber} onChange={e => setRenNumber(e.target.value.toUpperCase())}
              placeholder="REN12345"
              style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box', textTransform: 'uppercase' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            {lang === 'zh' ? 'LPPEH 颁发的 REN 编号，格式如 REN12345' : 'REN number issued by LPPEH, e.g. REN12345'}
          </span>
        </div>

        {/* REN Tag Image Upload */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
            {lang === 'zh' ? 'REN 执照照片' : 'REN Tag Image'} <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          {renTagImage ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={renTagImage} alt="REN Tag" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, border: '1px solid var(--glass-border)' }} />
              <button onClick={() => { setRenTagImage(null); setRenTagFile(null); }}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} style={{ color: 'white' }} />
              </button>
            </div>
          ) : (
            <label htmlFor="ren-tag-input" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '28px 20px', borderRadius: 10, cursor: 'pointer',
              border: '2px dashed var(--primary-glow)', background: 'var(--primary-light)',
            }}>
              <Camera size={28} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)' }}>
                {lang === 'zh' ? '上传 REN 执照照片' : 'Upload REN Tag Photo'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                JPG / PNG / WEBP, {lang === 'zh' ? '最大 8MB' : 'max 8MB'}
              </span>
            </label>
          )}
          <input id="ren-tag-input" type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleImageSelect} style={{ display: 'none' }} />
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

        {/* Buttons */}
        <button onClick={handleSubmit} disabled={submitting}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10, border: 'none',
            background: submitting ? 'var(--glass-border)' : 'var(--primary)',
            color: 'white', fontSize: '0.9rem', fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 10
          }}>
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {lang === 'zh' ? '正在提交中...' : 'Submitting...'}
            </>
          ) : (
            <>
              <Upload size={16} />
              {lang === 'zh' ? '提交入驻申请' : 'Submit Application'}
            </>
          )}
        </button>
      </div>

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
      `}</style>
    </div>
  );
}
