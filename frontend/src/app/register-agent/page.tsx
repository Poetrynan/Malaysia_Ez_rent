'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, Sun, Moon, Globe, ArrowLeft, Camera, X, Bell } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { supabase, isMockDatabase } from '@/lib/supabase';
import { compressImageFile, REN_TAG_PRESET } from '@/utils/compressImage';

export default function RegisterAgentPage() {
  const { lang, setLang, theme, toggleTheme } = useApp();

  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [renNumber, setRenNumber] = useState('');
  const [renTagImage, setRenTagImage] = useState<string | null>(null);
  const [renTagFile, setRenTagFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [existingStatus, setExistingStatus] = useState('');
  const [realtimeBanner, setRealtimeBanner] = useState<{ type: 'approved' | 'rejected'; message: string } | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    checkAuth();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Subscribe to Realtime for status changes (live mode only)
  useEffect(() => {
    if (isMockDatabase || !userId || !alreadySubmitted) return;

    const setupRealtime = async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabaseClient = createClient();

      const channel = supabaseClient
        .channel('agent-reg-status')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_registrations',
          filter: `auth_user_id=eq.${userId}`,
        }, (payload: any) => {
          const newStatus = payload.new?.verification_status;
          if (newStatus && newStatus !== existingStatus) {
            setExistingStatus(newStatus);
            if (newStatus === 'approved') {
              setRealtimeBanner({
                type: 'approved',
                message: lang === 'zh'
                  ? '恭喜！您的中介申请已通过审核，请重新登录以访问中介管理后台。'
                  : 'Congratulations! Your agent application has been approved. Please log in again to access the admin panel.',
              });
              // Save notification to localStorage for sidebar dot
              localStorage.setItem('ez_agent_approved', 'true');
            } else if (newStatus === 'rejected') {
              setRealtimeBanner({
                type: 'rejected',
                message: lang === 'zh'
                  ? '很抱歉，您的中介申请未通过审核。请联系管理员了解详情。'
                  : 'Sorry, your agent application was not approved. Please contact admin for details.',
              });
            }
          }
        })
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, alreadySubmitted]);

  const checkAuth = async () => {
    // Restore saved form draft if exists
    const draft = localStorage.getItem('ez_agent_draft');
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.email) setUserEmail(d.email);
        if (d.fullName) setFullName(d.fullName);
        if (d.phone) setPhone(d.phone);
        if (d.whatsapp) setWhatsapp(d.whatsapp);
        if (d.agencyName) setAgencyName(d.agencyName);
        if (d.renNumber) setRenNumber(d.renNumber);
        if (d.renTagImage) { setRenTagImage(d.renTagImage); }
      } catch {}
      localStorage.removeItem('ez_agent_draft');
    }

    if (isMockDatabase) {
      const loggedIn = localStorage.getItem('ez_logged_in');
      if (!loggedIn) {
        setAuthChecked(true);
        return;
      }
      setUserId(localStorage.getItem('ez_tenant_id') || 'tenant-123');
      setUserEmail(localStorage.getItem('ez_user_email') || '');
      // Check existing registration
      const regs = JSON.parse(localStorage.getItem('ez_agent_registrations') || '[]');
      const existing = regs.find((r: any) => r.auth_user_id === (localStorage.getItem('ez_tenant_id') || 'tenant-123'));
      if (existing) {
        setAlreadySubmitted(true);
        setExistingStatus(existing.verification_status);
      }
      setAuthChecked(true);
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabaseClient = createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
          setAuthChecked(true);
          return;
        }
        setUserId(user.id);
        setUserEmail(user.email || '');
        // Check existing registration
        const { data: existing } = await supabaseClient
          .from('agent_registrations')
          .select('verification_status')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (existing) {
          setAlreadySubmitted(true);
          setExistingStatus(existing.verification_status);
        }
        setAuthChecked(true);
      } catch {
        setAuthChecked(true);
      }
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(lang === 'zh' ? '只支持 JPG/PNG/WEBP 格式图片' : 'Only JPG/PNG/WEBP images are accepted');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(lang === 'zh' ? '图片大小不能超过 5MB' : 'Image size must be under 5MB');
      return;
    }

    setError('');
    setRenTagFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setRenTagImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError('');
    console.log('[Agent Reg] Submit started', { userId, userEmail, renTagFile: !!renTagFile, renTagImage: !!renTagImage });

    if (!userEmail.trim() || !userEmail.includes('@')) { setError(lang === 'zh' ? '请填写有效的邮箱地址' : 'Please enter a valid email address'); return; }
    if (!fullName.trim()) { setError(lang === 'zh' ? '请填写姓名' : 'Please enter your name'); return; }
    if (!phone.trim()) { setError(lang === 'zh' ? '请填写手机号' : 'Please enter your phone number'); return; }
    if (!agencyName.trim()) { setError(lang === 'zh' ? '请填写公司名称' : 'Please enter your agency name'); return; }
    if (!renNumber.trim()) { setError(lang === 'zh' ? '请填写 REN 编号' : 'Please enter your REN number'); return; }
    if (!renTagFile && !renTagImage) { setError(lang === 'zh' ? '请上传 REN 执照照片' : 'Please upload your REN tag image'); return; }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) { setError(lang === 'zh' ? '手机号格式不正确（马来西亚手机号）' : 'Invalid Malaysian phone number format'); return; }

    const normalizedWhatsapp = whatsapp.trim() ? normalizePhone(whatsapp) : null;
    if (whatsapp.trim() && !normalizedWhatsapp) { setError(lang === 'zh' ? 'WhatsApp 号码格式不正确' : 'Invalid WhatsApp number format'); return; }

    const normalizedREN = normalizeREN(renNumber);
    if (!normalizedREN) { setError(lang === 'zh' ? 'REN 编号格式不正确（如 REN12345）' : 'Invalid REN number format (e.g. REN12345)'); return; }

    // Must be logged in
    if (!userId) {
      setError(lang === 'zh' ? '请先登录后再提交' : 'Please log in before submitting');
      return;
    }

    setSubmitting(true);

    try {
      let renTagUrl = '';

      if (isMockDatabase) {
        // Mock: store as data URL
        renTagUrl = renTagImage || '';
        const regs = JSON.parse(localStorage.getItem('ez_agent_registrations') || '[]');
        regs.push({
          id: `reg-${Date.now()}`,
          auth_user_id: userId,
          email: userEmail,
          full_name: fullName.trim(),
          phone: normalizedPhone,
          whatsapp: normalizedWhatsapp,
          agency_name: agencyName.trim(),
          ren_number: normalizedREN,
          ren_tag_image_url: renTagUrl,
          verification_status: 'pending',
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('ez_agent_registrations', JSON.stringify(regs));
        console.log('[Agent Reg] Mock: saved to localStorage', regs.length, 'records');
      } else {
        // Upload REN tag image
        const { createClient } = await import('@/utils/supabase/client');
        const supabaseClient = createClient();

        let uploadBlob: Blob;
        if (renTagFile) {
          console.log('[Agent Reg] Compressing REN tag image...');
          uploadBlob = await compressImageFile(renTagFile, REN_TAG_PRESET);
        } else if (renTagImage) {
          console.log('[Agent Reg] Converting data URL to blob...');
          const res = await fetch(renTagImage);
          uploadBlob = await res.blob();
        } else {
          throw new Error('No REN tag image');
        }

        const fileName = `ren-tag-${Date.now()}.jpg`;
        const path = `ren-tags/${fileName}`;
        console.log('[Agent Reg] Uploading to Storage:', path);

        const { error: uploadErr } = await supabaseClient.storage
          .from('unit-media')
          .upload(path, uploadBlob, { upsert: true, contentType: 'image/jpeg' });

        if (uploadErr) {
          console.error('[Agent Reg] Upload error:', uploadErr);
          throw new Error(`Upload failed: ${uploadErr.message}`);
        }

        const { data: urlData } = supabaseClient.storage.from('unit-media').getPublicUrl(path);
        renTagUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        console.log('[Agent Reg] Upload success, URL:', renTagUrl);

        // Insert registration
        console.log('[Agent Reg] Inserting into agent_registrations...');
        const { error: insertErr } = await supabaseClient.from('agent_registrations').insert({
          auth_user_id: userId,
          email: userEmail,
          full_name: fullName.trim(),
          phone: normalizedPhone,
          whatsapp: normalizedWhatsapp,
          agency_name: agencyName.trim(),
          ren_number: normalizedREN,
          ren_tag_image_url: renTagUrl,
        });

        if (insertErr) {
          console.error('[Agent Reg] Insert error:', insertErr);
          throw new Error(`Database error: ${insertErr.message}`);
        }
        console.log('[Agent Reg] Insert success!');
      }

      setSuccess(true);
      setToast({ msg: lang === 'zh' ? '✅ 申请提交成功！' : '✅ Application submitted!', type: 'success' });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      console.error('[Agent Reg] Submission failed:', err);
      setError(err.message || 'Submission failed');
      setToast({ msg: `❌ ${err.message || '提交失败'}`, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // No login gate — form is always visible. Login is required only on submit.

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20, position: 'relative',
    }}>
      {/* Top bar */}
      <div className="topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', borderBottom: 'none', padding: '16px 24px' }}>
        <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none', marginRight: 'auto' }}>
          <ArrowLeft size={14} /> {lang === 'zh' ? '返回登录' : 'Back to Login'}
        </a>
        <button className={`topbar-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
        <button className="topbar-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          <Globe size={13} />
        </button>
      </div>

      <div style={{
        background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
        borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 440,
        boxShadow: 'var(--glass-shadow)', marginTop: 40,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="Malaysia Ez Rent" style={{ width: 72, height: 72, objectFit: 'contain', display: 'inline-block', marginBottom: 12 }} />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 4px' }}>
            {lang === 'zh' ? '申请成为中介' : 'Apply as Agent'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            {lang === 'zh' ? '填写以下信息，审核通过后即可发布房源' : 'Fill in your details. After approval you can publish listings.'}
          </p>
        </div>

        {/* Realtime notification banner */}
        {realtimeBanner && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 10,
            marginBottom: 16, animation: 'scaleIn 0.3s ease',
            background: realtimeBanner.type === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${realtimeBanner.type === 'approved' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}>
            <Bell size={18} style={{ color: realtimeBanner.type === 'approved' ? 'var(--success)' : 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: realtimeBanner.type === 'approved' ? 'var(--success)' : 'var(--danger)', marginBottom: 4 }}>
                {realtimeBanner.type === 'approved'
                  ? (lang === 'zh' ? '审核已通过！' : 'Application Approved!')
                  : (lang === 'zh' ? '审核未通过' : 'Application Rejected')}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>{realtimeBanner.message}</p>
              {realtimeBanner.type === 'approved' && (
                <a href="/login" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
                  padding: '8px 16px', borderRadius: 8, background: 'var(--success)', color: 'white',
                  fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none',
                }}>
                  <ArrowLeft size={13} /> {lang === 'zh' ? '重新登录' : 'Log in again'}
                </a>
              )}
            </div>
            <button onClick={() => setRealtimeBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        )}

        {/* Already submitted */}
        {alreadySubmitted && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {existingStatus === 'pending' && (
              <>
                <Loader2 size={36} style={{ color: 'var(--warning)', marginBottom: 12 }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
                  {lang === 'zh' ? '审核中' : 'Under Review'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {lang === 'zh' ? '您的申请正在审核中，请耐心等待。' : 'Your application is being reviewed. Please wait.'}
                </p>
              </>
            )}
            {existingStatus === 'approved' && (
              <>
                <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: 12 }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
                  {lang === 'zh' ? '已通过审核' : 'Approved'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {lang === 'zh' ? '恭喜！请重新登录以访问中介管理后台。' : 'Congratulations! Please log in again to access the agent portal.'}
                </p>
              </>
            )}
            {existingStatus === 'rejected' && (
              <>
                <AlertCircle size={36} style={{ color: 'var(--danger)', marginBottom: 12 }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
                  {lang === 'zh' ? '申请被拒绝' : 'Application Rejected'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {lang === 'zh' ? '很抱歉，您的申请未通过审核。请联系管理员了解详情。' : 'Sorry, your application was not approved. Please contact admin for details.'}
                </p>
              </>
            )}
          </div>
        )}

        {/* Success */}
        {success && !alreadySubmitted && (
          <div style={{ textAlign: 'center', padding: '20px 0', animation: 'scaleIn 0.3s ease' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
              {lang === 'zh' ? '申请已提交！' : 'Application Submitted!'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              {lang === 'zh'
                ? '您的中介注册申请已成功提交，审核通过后将自动移入中介管理端。'
                : 'Your agent registration has been submitted. After approval, you will be moved to the agent portal.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="/" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 10, background: 'var(--primary)',
                color: 'white', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none',
              }}>
                {lang === 'zh' ? '查看租客端' : 'View Tenant Portal'}
              </a>
              <a href="/login" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 10,
                border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
                color: 'var(--text-body)', fontSize: '0.88rem', fontWeight: 500, textDecoration: 'none',
              }}>
                {lang === 'zh' ? '稍后登录' : 'Login Later'}
              </a>
            </div>
          </div>
        )}

        {/* Form */}
        {!alreadySubmitted && !success && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
                <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                {lang === 'zh' ? '谷歌邮箱' : 'Google Email'} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="email" className="form-input" value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                placeholder={lang === 'zh' ? 'yourname@gmail.com' : 'yourname@gmail.com'}
                style={{ width: '100%', boxSizing: 'border-box' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {lang === 'zh' ? '审核通过后，此邮箱将用于登录中介管理后台' : 'After approval, this email will be used to access the agent portal.'}
              </span>
            </div>

            {/* Full Name */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                {lang === 'zh' ? '姓名' : 'Full Name'} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder={lang === 'zh' ? '请输入您的姓名' : 'Enter your full name'}
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                {lang === 'zh' ? '手机号' : 'Phone Number'} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="0123456789"
                style={{ width: '100%', boxSizing: 'border-box' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {lang === 'zh' ? '马来西亚手机号，如 0123456789' : 'Malaysian mobile number, e.g. 0123456789'}
              </span>
            </div>

            {/* WhatsApp */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                WhatsApp
              </label>
              <input type="tel" className="form-input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder={lang === 'zh' ? '选填，如与手机号相同可留空' : 'Optional, leave blank if same as phone'}
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Agency Name */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                {lang === 'zh' ? '公司名称' : 'Agency Name'} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="text" className="form-input" value={agencyName} onChange={e => setAgencyName(e.target.value)}
                placeholder={lang === 'zh' ? '如：PropNex Realty Sdn Bhd' : 'e.g. PropNex Realty Sdn Bhd'}
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* REN Number */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                {lang === 'zh' ? 'REN 编号' : 'REN Number'} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="text" className="form-input" value={renNumber}
                onChange={e => setRenNumber(e.target.value.toUpperCase())}
                placeholder="REN12345"
                style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {lang === 'zh'
                  ? 'LPPEH 颁发的 REN 编号，格式如 REN12345'
                  : 'REN number issued by LPPEH, format: REN12345'}
              </span>
            </div>

            {/* REN Tag Image */}
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
                    JPG / PNG / WEBP, {lang === 'zh' ? '最大 5MB' : 'max 5MB'}
                  </span>
                </label>
              )}
              <input id="ren-tag-input" type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageSelect} style={{ display: 'none' }} />
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 10, border: 'none',
                background: submitting ? 'var(--glass-border)' : 'var(--primary)',
                color: 'white', fontSize: '0.9rem', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4,
              }}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {lang === 'zh' ? '提交中...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  {lang === 'zh' ? '提交申请' : 'Submit Application'}
                </>
              )}
            </button>
          </div>
        )}
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
