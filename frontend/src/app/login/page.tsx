'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { isMockDatabase } from '@/lib/supabase';
import { Mail, CheckCircle2, ArrowRight, Sun, Moon, Globe, AlertTriangle, Home, User, Building2, ArrowLeft, Shield, Clock, CreditCard, ShieldCheck, Camera, BadgeDollarSign, Brain, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import LegalContent from '@/components/LegalContent';

// Floating multilingual greetings for the ambient background (mirrors the landing page)
const HELLO_WORDS = [
  { word: 'こんにちは', x: '6%', y: '14%', rotate: -12, size: '1.5rem', delay: 0.5 },
  { word: '你好', x: '4%', y: '60%', rotate: 8, size: '2rem', delay: 0.9 },
  { word: 'Hola', x: '88%', y: '18%', rotate: -6, size: '1.6rem', delay: 0.7 },
  { word: '안녕하세요', x: '85%', y: '66%', rotate: 10, size: '1.2rem', delay: 1.1 },
  { word: 'Bonjour', x: '7%', y: '84%', rotate: -4, size: '1.3rem', delay: 1.3 },
  { word: 'مرحبا', x: '90%', y: '42%', rotate: 5, size: '1.5rem', delay: 0.6 },
  { word: 'नमस्ते', x: '13%', y: '32%', rotate: -8, size: '1.1rem', delay: 1.0 },
  { word: 'Selamat Datang', x: '74%', y: '86%', rotate: -3, size: '1rem', delay: 1.4 },
  { word: 'สวัสดี', x: '92%', y: '8%', rotate: 7, size: '1.3rem', delay: 0.8 },
  { word: 'Ciao', x: '15%', y: '92%', rotate: -10, size: '1.4rem', delay: 1.2 },
];

export default function LoginPage() {
  const { lang, setLang, theme, toggleTheme } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockModal, setMockModal] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [roleView, setRoleView] = useState<'choose' | 'student' | 'agent'>('choose');

  React.useEffect(() => { document.title = `${lang === 'zh' ? '登录' : 'Login'} | Malaysia Ez Rent`; }, [lang]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      const isWeChat = ua.includes('micromessenger');
      const isQQ = ua.includes('mqqbrowser') || ua.includes('qq/');
      const isWeibo = ua.includes('weibo');
      const isFeishu = ua.includes('lark') || ua.includes('feishu');
      const isDingTalk = ua.includes('dingtalk');
      const isWebview = ua.includes('webview') || ua.includes('fbav') || ua.includes('instagram') || (ua.includes('android') && ua.includes('wv'));

      if (isWeChat || isQQ || isWeibo || isFeishu || isDingTalk || isWebview) {
        setIsInAppBrowser(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setErrorMsg(null);
    setLoading(true);

    if (isMockDatabase) {
      const isAgent = roleView === 'agent';
      const emailLower = email.trim().toLowerCase();
      
      if (isAgent) {
        const regs = JSON.parse(localStorage.getItem('ez_agent_profiles') || '[]');
        const myReg = regs.find((r: any) => r.email === emailLower);
        const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
        const isAdmin = admins.some((a: any) => a.email === emailLower);

        if (myReg && myReg.verification_status !== 'approved') {
          setLoading(false);
          setErrorMsg(lang === 'zh' ? '您的中介申请正在审核中，请耐心等待。' : 'Your agent registration is under review. Please wait.');
          return;
        }
        if (!isAdmin && !myReg) {
          setLoading(false);
          setErrorMsg(lang === 'zh' ? '该账号不存在，请先申请入驻。' : 'Account does not exist. Please apply first.');
          return;
        }
        
        localStorage.setItem('ez_user_email', emailLower);
        localStorage.setItem('ez_user_role', 'admin');
        localStorage.setItem('ez_tenant_id', isAdmin ? admins.find((a: any) => a.email === emailLower).id : (myReg.auth_user_id || 'agent-123'));
        localStorage.setItem('ez_logged_in', '1');
        document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
        setLoading(false);
        window.location.href = '/admin/properties';
        return;
      } else {
        const isMockAdmin = emailLower === 'admin@ezrent.my';
        localStorage.setItem('ez_user_email', emailLower);
        localStorage.setItem('ez_user_role', isMockAdmin ? 'admin' : 'student');
        localStorage.setItem('ez_tenant_id', isMockAdmin ? 'admin-999' : 'tenant-123');
        localStorage.setItem('ez_logged_in', '1');
        document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
        setLoading(false);
        window.location.href = isMockAdmin ? '/admin/properties' : '/listings';
        return;
      }
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    const user = data.user;
    if (!user) {
      setLoading(false);
      setErrorMsg('No user found');
      return;
    }

    const metadataRole = user.user_metadata?.role;

    if (roleView === 'agent') {
      if (metadataRole && metadataRole !== 'agent') {
        await supabase.auth.signOut();
        setLoading(false);
        setErrorMsg(lang === 'zh' ? '此账号非中介账号' : 'This account is not an agent account');
        return;
      }
      
      const { data: profile } = await supabase
        .from('agent_profiles')
        .select('verification_status')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.auth.signOut();
        setLoading(false);
        setErrorMsg(lang === 'zh' ? '未找到您的中介申请，请先申请入驻。' : 'No agent profile found. Please apply first.');
        return;
      }

      if (profile.verification_status === 'pending') {
        await supabase.auth.signOut();
        setLoading(false);
        setErrorMsg(lang === 'zh' ? '您的中介申请正在审核中，请耐心等待。' : 'Your agent registration is under review. Please wait.');
        return;
      }

      if (profile.verification_status === 'rejected') {
        await supabase.auth.signOut();
        setLoading(false);
        setErrorMsg(lang === 'zh' ? '很抱歉，您的中介申请未通过审核。' : 'Sorry, your agent registration was rejected.');
        return;
      }

      document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
      setLoading(false);
      window.location.href = '/admin/properties';
    } else {
      if (metadataRole && metadataRole !== 'student') {
        await supabase.auth.signOut();
        setLoading(false);
        setErrorMsg(lang === 'zh' ? '此账号非租客账号' : 'This account is not a tenant account');
        return;
      }

      const { data: dbUser } = await supabase
        .from('users')
        .select('identity_type')
        .eq('id', user.id)
        .maybeSingle();

      document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
      setLoading(false);
      if (!dbUser || !dbUser.identity_type) {
        window.location.href = '/profile';
      } else {
        window.location.href = '/listings';
      }
    }
  };

  const handleMockLogin = (role: 'student' | 'admin') => {
    localStorage.setItem('ez_user_email', email.trim() || (role === 'admin' ? 'admin@ezrent.my' : 'tenant@ezrent.my'));
    localStorage.setItem('ez_user_role', role);
    localStorage.setItem('ez_logged_in', '1');
    localStorage.setItem('ez_tenant_id', role === 'admin' ? 'admin-999' : 'tenant-123');
    document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
    window.location.href = role === 'admin' ? '/admin/properties' : '/listings';
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    if (isMockDatabase) {
      const tenantId = 'tenant-123';
      const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
      const isAdmin = admins.some((a: any) => a.id === tenantId);
      localStorage.setItem('ez_user_email', 'google-user@gmail.com');
      localStorage.setItem('ez_user_role', isAdmin ? 'admin' : 'student');
      localStorage.setItem('ez_tenant_id', tenantId);
      localStorage.setItem('ez_logged_in', '1');
      document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
      window.location.href = isAdmin ? '/admin/properties' : '/listings';
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/listings` },
    });
    if (error) setErrorMsg(error.message);
  };



  // ---- Styles (design system tokens) ----
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
    borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 420,
    boxShadow: 'var(--glass-shadow)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    transition: 'all 0.3s ease',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)',
    marginBottom: 6, letterSpacing: '0.01em',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10,
    border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
    color: 'var(--text-h)', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease', boxSizing: 'border-box' as const,
  };
  const primaryBtnStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none',
    background: 'var(--primary)', color: 'white', fontFamily: 'inherit',
    fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.2s ease',
  };
  const secondaryBtnStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1px solid var(--glass-border)', background: 'var(--bg-surface-solid)',
    color: 'var(--text-h)', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 500,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'all 0.2s ease',
  };

  return (
    <div className="login-shell">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="login-aurora" aria-hidden="true" />
      <div className="login-blob login-blob-1" aria-hidden="true" />
      <div className="login-blob login-blob-2" aria-hidden="true" />
      {HELLO_WORDS.map((h, i) => (
        <div key={i} aria-hidden="true" style={{ position: 'absolute', left: h.x, top: h.y, transform: `rotate(${h.rotate}deg)`, fontSize: h.size, fontWeight: 300, color: 'var(--primary)', animation: `helloFloatIn 1s ${h.delay}s cubic-bezier(0.16, 1, 0.3, 1) both`, pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '0.02em', zIndex: 0 }}>
          {h.word}
        </div>
      ))}

      {/* ── TOP BAR ── */}
      <div className="topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', borderBottom: 'none', padding: '16px 24px', zIndex: 10 }}>
        <div style={{ marginRight: 'auto' }} />
        <button className={`topbar-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? (lang === 'zh' ? '浅色模式' : 'Light') : (lang === 'zh' ? '深色模式' : 'Dark')}
        </button>
        <button className="topbar-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} style={{ cursor: 'pointer' }}>
          <Globe size={13} />
          {lang === 'zh' ? 'English' : '中文'}
        </button>
      </div>

      <div className="login-split">
        {/* ── BRAND PANEL (desktop only) ── */}
        <div className="login-brand-panel login-brand-anim">
          <div className="flag-wordmark" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', lineHeight: 1.1 }}>
            Malaysia Ez Rent
          </div>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-body)', lineHeight: 1.7, margin: 0, maxWidth: 380 }}>
            {lang === 'zh'
              ? '马来西亚留学生专属的 AI 智能租房平台——找房、签约、缴费、报修，一站式安全完成。'
              : 'The AI-powered rental platform built for students in Malaysia — search, sign, pay and maintain, all in one secure place.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { Icon: Brain, zh: 'AI 智能找房', en: 'AI-Powered Search', dzh: '告诉 AI 你的预算和位置，秒推合适房源', den: 'Tell AI your budget & location, get instant matches' },
              { Icon: ShieldCheck, zh: '平台全程保障', en: 'Fully Protected', dzh: '实名认证中介、正规租约、资金可追溯', den: 'Verified agents, real leases, traceable payments' },
              { Icon: Sparkles, zh: '一站式服务', en: 'All-in-One', dzh: '找房、签约、缴费、报修全部在线搞定', den: 'Search, sign, pay & maintain — all online' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', boxShadow: '0 6px 16px -6px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.Icon size={20} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-h)' }}>{lang === 'zh' ? s.zh : s.en}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>{lang === 'zh' ? s.dzh : s.den}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Schools strip */}
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 18 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 10 }}>
              {lang === 'zh' ? '深受这些大学的留学生信赖' : 'Trusted by students from'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
              {['Monash', "Taylor's", 'Sunway', 'UPM', 'INTI', 'UCSI'].map((s) => (
                <span key={s} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)', opacity: 0.7 }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

      <div className="login-card-anim" style={cardStyle}>
        {/* ── LOGO ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo.png" alt="Malaysia Ez Rent"
            style={{ width: 72, height: 72, objectFit: 'contain', display: 'block', margin: '0 auto 12px' }} />
          <div className="flag-wordmark" style={{ fontSize: '1.7rem', lineHeight: 1.15 }}>
            Malaysia Ez Rent
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
            {lang === 'zh' ? 'AI 智能租房助手' : 'AI Smart Housing Assistant'}
          </div>
          {/* Trust pills — consistent with the landing page */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14 }}>
            {[
              { Icon: ShieldCheck, zh: '实名认证', en: 'Verified' },
              { Icon: Camera, zh: '真实房源', en: 'Real Photos' },
              { Icon: BadgeDollarSign, zh: '资金安全', en: 'Secure' },
            ].map((p, i) => (
              <span key={i} className="guest-trust-pill" style={{ padding: '5px 11px', fontSize: '0.72rem' }}>
                <p.Icon size={12} style={{ color: 'var(--primary)' }} />
                {lang === 'zh' ? p.zh : p.en}
              </span>
            ))}
          </div>
        </div>

        {roleView === 'choose' ? (
          /* ── ROLE SELECTION ── */
          <div>
            {isInAppBrowser && (
              <div style={{
                marginBottom: 16, padding: '12px 14px', borderRadius: 10,
                background: 'var(--danger-light)', border: '1px solid var(--danger)',
                color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', gap: 8,
                alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.4,
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: 2 }}>{lang === 'zh' ? '内置浏览器受限' : 'Embedded Browser Restricted'}</strong>
                  {lang === 'zh' ? '请点击右上角菜单，选择「在浏览器中打开」' : 'Tap menu → Open in Safari/Chrome'}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>
              {lang === 'zh' ? '请选择您的身份' : 'Choose your role'}
            </div>

            {/* Student Card */}
            <button onClick={() => setRoleView('student')} style={{
              ...secondaryBtnStyle, marginBottom: 10, padding: '16px', justifyContent: 'flex-start', gap: 14,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'var(--bg-surface-solid)'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', boxShadow: '0 6px 16px -6px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={20} style={{ color: '#fff' }} />
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-h)' }}>
                  {lang === 'zh' ? '我是租客' : 'I\'m a Tenant'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {lang === 'zh' ? '找房、缴租、报修' : 'Find rooms, pay rent, maintenance'}
                </div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            </button>

            {/* Agent Card */}
            <button onClick={() => setRoleView('agent')} style={{
              ...secondaryBtnStyle, marginBottom: 16, padding: '16px', justifyContent: 'flex-start', gap: 14,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'var(--bg-surface-solid)'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', boxShadow: '0 6px 16px -6px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={20} style={{ color: '#fff' }} />
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-h)' }}>
                  {lang === 'zh' ? '我是中介' : 'I\'m an Agent'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {lang === 'zh' ? '管理房源、租约、收租' : 'Manage listings, leases, payments'}
                </div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            </button>

            {/* Quick links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--glass-border)', paddingTop: 14 }}>
              <a href="/calculator" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', transition: 'opacity 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <CreditCard size={13} /> {lang === 'zh' ? '租金押金计算器（无需登录）' : 'Rent Calculator (No login)'}
              </a>
            </div>
          </div>
        ) : roleView === 'student' ? (
          /* ── STUDENT LOGIN ── */
          <div>
            <button onClick={() => { setRoleView('choose'); setErrorMsg(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontFamily: 'inherit', padding: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-h)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <ArrowLeft size={14} /> {lang === 'zh' ? '返回选择身份' : 'Back to role selection'}
            </button>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', boxShadow: '0 6px 16px -6px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <User size={22} style={{ color: '#fff' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-h)' }}>
                {lang === 'zh' ? '租客登录' : 'Tenant Login'}
              </div>
            </div>

            {/* Google Login */}
            <button onClick={handleGoogleLogin} style={secondaryBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'var(--bg-surface-solid)'; }}>
              <GoogleIcon /> {lang === 'zh' ? '使用 Google 账号登录' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{lang === 'zh' ? '或' : 'OR'}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleLogin}>
              <label htmlFor="student-email" style={labelStyle}>{lang === 'zh' ? '邮箱地址' : 'Email address'}</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="student-email" name="email" type="email" required autoComplete="username" placeholder="name@university.edu.my" value={email}
                  onChange={e => setEmail(e.target.value)} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <label htmlFor="student-password" style={labelStyle}>{lang === 'zh' ? '密码' : 'Password'}</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Shield size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="student-password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--primary-hover)'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--primary)'; }}>
                {loading ? <Spinner /> : <><span>{lang === 'zh' ? '登录' : 'Login'}</span><ArrowRight size={15} /></>}
              </button>
            </form>

            {/* Tenant Register Link */}
            <div style={{ marginTop: 16, padding: '14px', borderRadius: 10, background: 'var(--primary-light)', border: '1px dashed var(--primary)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginBottom: 6 }}>
                {lang === 'zh' ? '还没有租客账号？' : "Don't have a tenant account?"}
              </div>
              <a href="/register/tenant" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px',
                borderRadius: 8, background: 'var(--primary)', color: '#fff', textDecoration: 'none',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}>
                <User size={14} /> {lang === 'zh' ? '注册成为租客' : 'Register as Tenant'}
              </a>
            </div>
          </div>
        ) : (
          /* ── AGENT LOGIN ── */
          <div>
            <button onClick={() => { setRoleView('choose'); setErrorMsg(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontFamily: 'inherit', padding: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-h)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <ArrowLeft size={14} /> {lang === 'zh' ? '返回选择身份' : 'Back to role selection'}
            </button>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', boxShadow: '0 6px 16px -6px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Building2 size={22} style={{ color: '#fff' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-h)' }}>
                {lang === 'zh' ? '中介登录' : 'Agent Login'}
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleLogin}>
              <label htmlFor="agent-email" style={labelStyle}>{lang === 'zh' ? '邮箱地址' : 'Email address'}</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="agent-email" name="email" type="email" required autoComplete="username" placeholder="name@agency.com" value={email}
                  onChange={e => setEmail(e.target.value)} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <label htmlFor="agent-password" style={labelStyle}>{lang === 'zh' ? '密码' : 'Password'}</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Shield size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="agent-password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--primary-hover)'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--primary)'; }}>
                {loading ? <Spinner /> : <><span>{lang === 'zh' ? '登录' : 'Login'}</span><ArrowRight size={15} /></>}
              </button>
            </form>

            {/* Register link - PROMINENT */}
            <div style={{ marginTop: 16, padding: '14px', borderRadius: 10, background: 'var(--primary-light)', border: '1px dashed var(--primary)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginBottom: 6 }}>
                {lang === 'zh' ? '还没有中介账号？' : 'Don\'t have an agent account?'}
              </div>
              <a href="/register/agent" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px',
                borderRadius: 8, background: 'var(--primary)', color: '#fff', textDecoration: 'none',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}>
                <Shield size={14} /> {lang === 'zh' ? '申请成为中介' : 'Apply as Agent'}
              </a>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>
                <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                {lang === 'zh' ? '需提交 REN 牌照，经审核后开通' : 'Requires REN license, reviewed by admin'}
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          {lang === 'zh' ? '登录即代表您同意我们的 ' : 'By logging in you agree to our '}
          <span onClick={() => setLegalModal('terms')} style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
            {lang === 'zh' ? '服务条款' : 'Terms of Service'}
          </span>
          {lang === 'zh' ? ' 与 ' : ' & '}
          <span onClick={() => setLegalModal('privacy')} style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
            {lang === 'zh' ? '隐私政策' : 'Privacy Policy'}
          </span>
        </p>
      </div>
      </div>

      {/* ── MOCK ROLE MODAL ── */}
      {mockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
          onClick={() => setMockModal(false)}>
          <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: '32px 28px', maxWidth: 360, width: '100%', boxShadow: 'var(--glass-shadow)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-h)', marginBottom: 4 }}>
                {lang === 'zh' ? '选择登录角色' : 'Choose Role'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lang === 'zh' ? '快速体验不同角色' : 'Quick role preview'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleMockLogin('student')} style={{ flex: 1, padding: '14px 10px', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-h)', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}>
                <User size={20} style={{ color: 'var(--primary)' }} />
                {lang === 'zh' ? '租客' : 'Tenant'}
              </button>
              <button onClick={() => handleMockLogin('admin')} style={{ flex: 1, padding: '14px 10px', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-h)', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}>
                <Shield size={20} style={{ color: 'var(--primary)' }} />
                {lang === 'zh' ? '管理员' : 'Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEGAL CONTENT MODAL ── */}
      {legalModal && (
        <LegalContent type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
