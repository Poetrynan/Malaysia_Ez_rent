'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { isMockDatabase } from '@/lib/supabase';
import { Mail, CheckCircle2, ArrowRight, Sun, Moon, Globe, AlertTriangle, Home, User, Building2, ArrowLeft, Shield, Clock, CreditCard } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import LegalContent from '@/components/LegalContent';

export default function LoginPage() {
  const { lang, setLang, theme, toggleTheme } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mockModal, setMockModal] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [roleView, setRoleView] = useState<'choose' | 'student' | 'agent'>('choose');

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
    if (!email.trim()) return;
    setErrorMsg(null);
    setLoading(true);

    if (isMockDatabase) {
      const role = email.trim().toLowerCase() === 'admin@ezrent.my' ? 'admin' : 'student';
      localStorage.setItem('ez_user_email', email.trim());
      localStorage.setItem('ez_user_role', role);
      localStorage.setItem('ez_tenant_id', role === 'admin' ? 'admin-999' : 'tenant-123');
      setLoading(false);
      setMagicLinkSent(true);
      setTimeout(() => {
        localStorage.setItem('ez_logged_in', '1');
        document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
        window.location.href = '/';
      }, 2000);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    setLoading(false);
    if (error) setErrorMsg(error.message); else setMagicLinkSent(true);
  };

  const handleMockLogin = (role: 'student' | 'admin') => {
    localStorage.setItem('ez_user_email', email.trim() || (role === 'admin' ? 'admin@ezrent.my' : 'tenant@ezrent.my'));
    localStorage.setItem('ez_user_role', role);
    localStorage.setItem('ez_logged_in', '1');
    localStorage.setItem('ez_tenant_id', role === 'admin' ? 'admin-999' : 'tenant-123');
    document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
    window.location.href = '/';
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
      window.location.href = '/';
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20, position: 'relative',
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      {/* ── TOP BAR ── */}
      <div className="topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', borderBottom: 'none', padding: '16px 24px' }}>
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

      <div style={cardStyle}>
        {/* ── LOGO ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="Malaysia Ez Rent"
            style={{ width: 72, height: 72, objectFit: 'contain', display: 'inline-block', marginBottom: 12 }} />
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-h)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Malaysia Ez Rent
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {lang === 'zh' ? 'AI 智能租房助手' : 'AI Smart Housing Assistant'}
          </div>
        </div>

        {magicLinkSent ? (
          /* ── SUCCESS STATE ── */
          <div style={{ textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={28} style={{ color: 'var(--success)' }} />
            </div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-h)', marginBottom: 8, fontWeight: 700 }}>
              {isMockDatabase ? (lang === 'zh' ? '登录中...' : 'Logging in...') : (lang === 'zh' ? '请检查您的邮箱' : 'Check your email')}
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 20 }}>
              {isMockDatabase ? (
                lang === 'zh' ? <>已模拟向 <strong style={{ color: 'var(--primary)' }}>{email}</strong> 发送登录链接</> : <>Simulated link sent to <strong style={{ color: 'var(--primary)' }}>{email}</strong></>
              ) : (
                lang === 'zh' ? <>我们已向 <strong style={{ color: 'var(--primary)' }}>{email}</strong> 发送了登录链接<br />请点击邮件内的链接登录</> : <>We sent a login link to <strong style={{ color: 'var(--primary)' }}>{email}</strong></>
              )}
            </div>
            {!isMockDatabase && (
              <div style={{
                marginBottom: 16, padding: '10px 12px', borderRadius: 8,
                background: 'var(--warning-light)', border: '1px solid var(--warning)',
                color: 'var(--warning)', fontSize: '0.75rem', display: 'flex', gap: 8,
                alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.4,
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  {lang === 'zh' ? <><strong>收不到邮件？</strong>请检查垃圾邮件箱，或使用 Google 登录</> : <><strong>Not receiving?</strong>Check spam folder, or use Google login</>}
                </div>
              </div>
            )}
            {!isMockDatabase && (
              <button onClick={() => setMagicLinkSent(false)} style={{ ...secondaryBtnStyle, marginBottom: 0 }}>
                <ArrowLeft size={15} /> {lang === 'zh' ? '返回' : 'Back'}
              </button>
            )}
          </div>
        ) : roleView === 'choose' ? (
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
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={20} style={{ color: 'var(--primary)' }} />
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
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={20} style={{ color: 'var(--primary)' }} />
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
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <User size={22} style={{ color: 'var(--primary)' }} />
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
                <input id="student-email" type="email" required placeholder="name@university.edu.my" value={email}
                  onChange={e => setEmail(e.target.value)} style={inputStyle}
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
                {loading ? <Spinner /> : <><span>{lang === 'zh' ? '获取邮箱登录链接' : 'Get Magic Link'}</span><ArrowRight size={15} /></>}
              </button>
            </form>
          </div>
        ) : (
          /* ── AGENT LOGIN ── */
          <div>
            <button onClick={() => { setRoleView('choose'); setErrorMsg(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontFamily: 'inherit', padding: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-h)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <ArrowLeft size={14} /> {lang === 'zh' ? '返回选择身份' : 'Back to role selection'}
            </button>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Building2 size={22} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-h)' }}>
                {lang === 'zh' ? '中介登录' : 'Agent Login'}
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
              <label htmlFor="agent-email" style={labelStyle}>{lang === 'zh' ? '邮箱地址' : 'Email address'}</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="agent-email" type="email" required placeholder="name@agency.com" value={email}
                  onChange={e => setEmail(e.target.value)} style={inputStyle}
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
                {loading ? <Spinner /> : <><span>{lang === 'zh' ? '获取邮箱登录链接' : 'Get Magic Link'}</span><ArrowRight size={15} /></>}
              </button>
            </form>

            {/* Register link - PROMINENT */}
            <div style={{ marginTop: 16, padding: '14px', borderRadius: 10, background: 'var(--primary-light)', border: '1px dashed var(--primary)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginBottom: 6 }}>
                {lang === 'zh' ? '还没有中介账号？' : 'Don\'t have an agent account?'}
              </div>
              <a href="/register-agent" style={{
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
