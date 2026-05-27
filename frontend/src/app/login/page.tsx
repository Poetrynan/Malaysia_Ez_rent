'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { isMockDatabase } from '@/lib/supabase';
import { Mail, CheckCircle2, ArrowRight, Sun, Moon, Globe, AlertTriangle } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

export default function LoginPage() {
  const { lang, setLang, theme, toggleTheme } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mockModal, setMockModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

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
    localStorage.setItem('ez_user_email', email.trim() || (role === 'admin' ? 'admin@ezrent.my' : 'student@ezrent.my'));
    localStorage.setItem('ez_user_role', role);
    localStorage.setItem('ez_logged_in', '1');
    localStorage.setItem('ez_tenant_id', role === 'admin' ? 'admin-999' : 'tenant-123');
    document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
    window.location.href = '/';
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    if (isMockDatabase) {
      localStorage.setItem('ez_user_email', 'google-user@gmail.com');
      localStorage.setItem('ez_user_role', 'student');
      localStorage.setItem('ez_tenant_id', 'tenant-123');
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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20, position: 'relative',
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      {/* ── TOP BAR (right-aligned theme + lang toggles) ── */}
      <div className="topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', borderBottom: 'none', padding: '16px 24px' }}>
        <div style={{ marginRight: 'auto' }} />
        {/* Theme toggle */}
        <button className={`topbar-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? (lang === 'zh' ? '浅色模式' : 'Light Mode') : (lang === 'zh' ? '深色模式' : 'Dark Mode')}
        </button>

        {/* Language toggle */}
        <button className="topbar-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          <Globe size={13} />
          {lang === 'zh' ? 'English' : '中文'}
        </button>
      </div>

      <div style={{
        background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
        borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400,
        boxShadow: 'var(--glass-shadow)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo.png"
            alt="Malaysia Ez Rent"
            style={{ width: 88, height: 88, objectFit: 'contain', display: 'inline-block', marginBottom: 14 }}
          />
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-h)', lineHeight: 1.2 }}>
            Malaysia Ez Rent
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {lang === 'zh' ? 'AI 智能留学生租房助手' : 'AI Smart Housing Assistant'}
          </div>
        </div>

        {magicLinkSent ? (
          <div style={{ textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-h)', marginBottom: 8, fontWeight: 600 }}>
              {isMockDatabase ? (lang === 'zh' ? '登录中…' : 'Logging in…') : (lang === 'zh' ? '请检查您的邮箱' : 'Check your email')}
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 20 }}>
              {isMockDatabase ? (
                lang === 'zh' ? (
                  <>已模拟向 <strong style={{ color: 'var(--primary)' }}>{email}</strong> 发送登录链接，正在跳转...</>
                ) : (
                  <>Simulated Magic Link sent to <strong style={{ color: 'var(--primary)' }}>{email}</strong>, redirecting…</>
                )
              ) : (
                lang === 'zh' ? (
                  <>我们已向 <strong style={{ color: 'var(--primary)' }}>{email}</strong> 发送了登录链接。<br />请点击邮件内的链接登录。</>
                ) : (
                  <>We sent a login link to <strong style={{ color: 'var(--primary)' }}>{email}</strong>. Click the link to sign in.</>
                )
              )}
            </div>

            {/* Email Warning Alert (SMTP Info Box) */}
            {!isMockDatabase && (
              <div style={{
                marginTop: 12, marginBottom: 20, padding: '10px 12px', borderRadius: 8,
                background: 'var(--warning-light)', border: '1px solid var(--warning)',
                color: 'var(--warning)', fontSize: '0.75rem', display: 'flex', gap: 6,
                alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.4
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  {lang === 'zh' ? (
                    <>
                      <strong>收不到邮件？</strong>
                      由于免费发信服务器通道限制，QQ等国内邮箱可能会拦截此邮件或有较长延迟。请务必检查您的<strong>垃圾邮件箱</strong>。若长时间未收到，建议使用更稳定的 Google 账号直接登录。
                    </>
                  ) : (
                    <>
                      <strong>Not receiving email?</strong>
                      Due to default SMTP server limits, QQ and domestic mailboxes might block or delay this email. Please check your <strong>Junk/Spam</strong> folder, or use Google login for instant access.
                    </>
                  )}
                </div>
              </div>
            )}

            {!isMockDatabase && (
              <button onClick={() => setMagicLinkSent(false)} style={{
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                borderRadius: 10, padding: '10px 18px', color: 'var(--text-body)', fontFamily: 'inherit',
                fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', width: '100%',
                marginBottom: 20, transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; }}
              >
                {lang === 'zh' ? '返回' : 'Back'}
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* In-App Browser Alert */}
            {isInAppBrowser && (
              <div style={{
                marginBottom: 16, padding: '12px 14px', borderRadius: 10,
                background: 'var(--danger-light)', border: '1px solid var(--danger)',
                color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', gap: 8,
                alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.4,
                boxShadow: '0 4px 12px rgba(239,68,68,0.08)'
              }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1, color: 'var(--danger)' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
                    {lang === 'zh' ? '⚠️ 微信/App 内置浏览器受限' : '⚠️ Embedded Webview Restricted'}
                  </strong>
                  <span style={{ color: 'var(--text-body)' }}>
                    {lang === 'zh' 
                      ? '由于 Google 官方安全策略，第三方 App（如微信、飞书、QQ等）内置浏览器无法直接使用 Google 登录。请点击右上角菜单，选择「在浏览器中打开」后即可正常登录。' 
                      : 'Google blocks sign-ins from in-app browsers (WeChat, Feishu, etc.) for security. Please tap the top-right menu and choose "Open in Safari/Chrome" to continue.'
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Google Login */}
            <button onClick={handleGoogleLogin} style={{
              width: '100%', padding: '11px 16px', borderRadius: 10,
              border: '1px solid var(--glass-border)', background: 'var(--bg-surface-solid)',
              color: 'var(--text-h)', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 20, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface-solid)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
            >
              <GoogleIcon /> {lang === 'zh' ? '使用 Google 账号登录' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {lang === 'zh' ? '或' : 'OR'}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" required placeholder="name@university.edu.my" value={email}
                    onChange={e => setEmail(e.target.value)} style={{
                      width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10,
                      border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
                      color: 'var(--text-h)', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
                  />
                </div>
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginBottom: 14, textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none',
                background: loading ? 'var(--primary-glow)' : 'var(--primary)',
                color: 'white', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s', marginBottom: 24,
              }}>
                {loading ? <Spinner /> : <><span>{lang === 'zh' ? '获取邮箱登录链接' : 'Get Magic Link'}</span><ArrowRight size={15} /></>}
              </button>
            </form>
          </div>
        )}

        {/* Feature tags */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
          {[(lang === 'zh' ? '🏠 AI智能找房' : '🏠 AI Search'), (lang === 'zh' ? '🗺️ 通勤计算' : '🗺️ Commute'), (lang === 'zh' ? '📋 电子租约' : '📋 Lease'), (lang === 'zh' ? '💳 扫码支付' : '💳 Bank · WeChat · Alipay')].map(tag => (
            <span key={tag} style={{
              fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6,
              background: 'var(--glass-bg)', color: 'var(--text-body)', border: '1px solid var(--glass-border)',
            }}>{tag}</span>
          ))}
        </div>

        {/* Sandbox role switcher */}
        {isMockDatabase && !magicLinkSent && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => { if (!email.trim()) { setErrorMsg(lang === 'zh' ? '请先输入您的邮箱' : 'Please enter your email first'); return; } setMockModal(true); }} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem',
              cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
            }}>
              {lang === 'zh' ? '🧪 Sandbox：手动选择角色登录' : 'Sandbox: choose role manually'}
            </button>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          {lang === 'zh' ? '登录即代表您同意我们的 服务条款 与 隐私政策' : 'By logging in you agree to our Terms & Privacy Policy'}
        </p>
      </div>

      {/* Mock Role Modal */}
      {mockModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 300, padding: 20,
        }} onClick={() => setMockModal(false)}>
          <div style={{
            background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
            borderRadius: 16, padding: '32px 28px', maxWidth: 360, width: '100%',
            boxShadow: 'var(--glass-shadow)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>🧪</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-h)', marginBottom: 4 }}>
                {lang === 'zh' ? '选择登录角色' : 'Choose Role'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {lang === 'zh' ? '选择房客或管理员身份以快速登录并进行测试体验。' : 'Sign in as a student or admin to explore.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleMockLogin('student')} style={{
                flex: 1, padding: '14px 10px', borderRadius: 10, border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)', color: 'var(--text-h)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', lineHeight: 1.4, transition: 'all 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>👨‍🎓</div>
                {lang === 'zh' ? '学生角色' : 'Student'}
              </button>
              <button onClick={() => handleMockLogin('admin')} style={{
                flex: 1, padding: '14px 10px', borderRadius: 10, border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)', color: 'var(--text-h)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', lineHeight: 1.4, transition: 'all 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>🔑</div>
                {lang === 'zh' ? '管理员角色' : 'Admin'}
              </button>
            </div>
          </div>
        </div>
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
