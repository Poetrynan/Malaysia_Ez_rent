'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { isMockDatabase } from '@/lib/supabase';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';

/* ── Brand colors ── */
const CARD_BG = 'rgba(22, 27, 42, 0.92)';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mockModal, setMockModal] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = (localStorage.getItem('ez_theme') as 'dark' | 'light') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  /* ── Send Magic Link ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setErrorMsg(null);
    setLoading(true);

    if (isMockDatabase) {
      // Mock: simulate Magic Link — show "sent" then auto-redirect
      const role = email.trim().toLowerCase() === 'admin@ezrent.my' ? 'admin' : 'student';
      localStorage.setItem('ez_user_email', email.trim());
      localStorage.setItem('ez_user_role', role);
      localStorage.setItem('ez_tenant_id', role === 'admin' ? 'admin-999' : 'tenant-123');
      setLoading(false);
      setMagicLinkSent(true);
      // Simulate user clicking the link after 2 seconds
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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  /* ── Mock: Choose role (manual override) ── */
  const handleMockLogin = (role: 'student' | 'admin') => {
    localStorage.setItem('ez_user_email', email.trim() || (role === 'admin' ? 'admin@ezrent.my' : 'student@ezrent.my'));
    localStorage.setItem('ez_user_role', role);
    localStorage.setItem('ez_logged_in', '1');
    localStorage.setItem('ez_tenant_id', role === 'admin' ? 'admin-999' : 'tenant-123');
    document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
    window.location.href = '/';
  };

  /* ── Google OAuth Login ── */
  const handleGoogleLogin = async () => {
    setErrorMsg(null);

    if (isMockDatabase) {
      // Mock: simulate Google login
      const role = 'student';
      localStorage.setItem('ez_user_email', 'google-user@gmail.com');
      localStorage.setItem('ez_user_role', role);
      localStorage.setItem('ez_tenant_id', 'tenant-123');
      localStorage.setItem('ez_logged_in', '1');
      document.cookie = "ez_logged_in=1; path=/; max-age=31536000";
      window.location.href = '/';
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: theme === 'dark'
        ? 'linear-gradient(135deg, #0D1117 0%, #0F1B35 50%, #0D1117 100%)'
        : 'linear-gradient(135deg, #EFF6FF 0%, #EEF2FF 100%)',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow orbs */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        top: -100, right: -100, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        bottom: -80, left: -80, pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{
        background: CARD_BG, backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 24, padding: '48px 44px', width: '100%', maxWidth: 440,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        animation: 'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #60A5FA, #2563EB)',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '1.6rem', color: 'white',
            boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
            marginBottom: 16,
          }}>Ez</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F0F6FF', lineHeight: 1.2 }}>
            Malaysia Ez Rent
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7A99', marginTop: 6 }}>
            AI 智能租房助手 · AI Smart Housing
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 28 }} />

        {magicLinkSent ? (
          /* Sent State */
          <div style={{ textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
            <div style={{ display: 'inline-flex', color: 'var(--success)', marginBottom: 16 }}>
              <CheckCircle2 size={48} />
            </div>
            <h3 style={{ fontSize: '1.2rem', color: '#F0F6FF', marginBottom: 10 }}>
              {isMockDatabase ? '正在自动登录…' : '邮件已发送！'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#C9D1E0', lineHeight: 1.6, marginBottom: 24 }}>
              {isMockDatabase ? (
                <>沙盒模式已模拟发送 Magic Link 到 <strong style={{ color: 'var(--primary)' }}>{email}</strong>，正在自动跳转…</>
              ) : (
                <>我们已向 <strong style={{ color: 'var(--primary)' }}>{email}</strong> 发送了免密登录链接。请检查您的收件箱并点击链接登录。</>
              )}
            </p>
            {!isMockDatabase && (
              <button onClick={() => setMagicLinkSent(false)} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '12px 20px', color: '#C9D1E0', fontFamily: 'inherit',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', width: '100%',
                transition: 'all 0.2s',
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                 onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                返回重新输入
              </button>
            )}
          </div>
        ) : (
          /* Form State */
          <div>
            <p style={{ fontSize: '0.82rem', color: '#6B7A99', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
              {isMockDatabase
                ? '沙盒模式 — 选择登录方式'
                : '选择登录方式'}
            </p>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              style={{
                width: '100%', padding: '13px 20px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: '#F0F6FF', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.2s', marginBottom: 20,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              <GoogleIcon />
              <span>用 Google 账号登录</span>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '0.75rem', color: '#4B5563', fontWeight: 500 }}>或 / OR</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <form onSubmit={handleLogin}>

            <div style={{ marginBottom: 20 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#6B7A99', display: 'flex', alignItems: 'center' }}>
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@university.edu.my"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 16px 14px 46px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
                    color: '#F0F6FF', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none',
                    transition: 'all 0.25s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: 16, textAlign: 'center' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #60A5FA, #2563EB)',
                color: 'white', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.2s', marginBottom: 28,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.35)',
              }}
            >
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <span>获取免密登录链接</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
          </div>
        )}

        {/* Feature tags */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🏠 AI 找房', '🗺️ 通勤路线', '📋 租约台账', '💳 DuitNow 缴租'].map(tag => (
            <span key={tag} style={{
              fontSize: '0.72rem', padding: '4px 10px', borderRadius: 20,
              background: 'rgba(59,130,246,0.12)', color: '#93C5FD',
              border: '1px solid rgba(59,130,246,0.2)',
            }}>{tag}</span>
          ))}
        </div>

        {/* Sandbox role switcher */}
        {isMockDatabase && !magicLinkSent && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { if (!email.trim()) { setErrorMsg('请先输入邮箱 / Please enter your email first'); return; } setMockModal(true); }} style={{
              background: 'none', border: 'none', color: '#6B7A99', fontSize: '0.75rem',
              cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
            }}>
              🧪 沙盒模式：手动选择角色
            </button>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: '0.68rem', color: '#3D4A63', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          登录即同意《用户协议》与《隐私政策》<br/>
          By logging in you agree to our Terms &amp; Privacy Policy
        </p>
      </div>

      {/* ── Mock Role Modal ── */}
      {mockModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 300, padding: 20,
        }} onClick={() => setMockModal(false)}>
          <div style={{
            background: '#161B2A', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20, padding: '36px 32px', maxWidth: 380, width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            animation: 'scaleIn 0.28s cubic-bezier(0.16,1,0.3,1)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🧪</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#F0F6FF', marginBottom: 6 }}>
                沙盒模式 — 手动选择角色
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6B7A99', lineHeight: 1.6 }}>
                输入邮箱后点击下方角色，将以该身份直接登录体验。<br/>
                <span style={{ color: '#4B5563' }}>邮箱为 admin@ezrent.my 时自动识别为管理员。</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => handleMockLogin('student')} style={{
                flex: 1, padding: '16px 12px', borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)',
                background: 'rgba(59,130,246,0.12)', color: '#93C5FD',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s', lineHeight: 1.4,
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>👨‍🎓</div>
                <div>学生租客</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7A99', marginTop: 4, fontWeight: 400 }}>
                  Student Tenant
                </div>
              </button>
              <button onClick={() => handleMockLogin('admin')} style={{
                flex: 1, padding: '16px 12px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.12)', color: '#FCD34D',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s', lineHeight: 1.4,
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🔑</div>
                <div>房东管理员</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7A99', marginTop: 4, fontWeight: 400 }}>
                  Admin / Landlord
                </div>
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
