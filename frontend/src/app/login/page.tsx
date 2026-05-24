'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { isMockDatabase } from '@/lib/supabase';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mockModal, setMockModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
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
      background: '#F8FAFC', padding: 20,
    }}>
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0',
        borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/logo.png"
            alt="Malaysia Ez Rent"
            style={{ width: 88, height: 88, objectFit: 'contain', display: 'inline-block', marginBottom: 14 }}
          />
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>
            Malaysia Ez Rent
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: 4 }}>
            AI Smart Housing Assistant
          </div>
        </div>

        {magicLinkSent ? (
          <div style={{ textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
            <CheckCircle2 size={40} style={{ color: '#16A34A', marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.05rem', color: '#1E293B', marginBottom: 8, fontWeight: 600 }}>
              {isMockDatabase ? 'Logging in…' : 'Check your email'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
              {isMockDatabase
                ? <>Simulated Magic Link sent to <strong style={{ color: '#2563EB' }}>{email}</strong>, redirecting…</>
                : <>We sent a login link to <strong style={{ color: '#2563EB' }}>{email}</strong>. Click the link to sign in.</>}
            </p>
            {!isMockDatabase && (
              <button onClick={() => setMagicLinkSent(false)} style={{
                background: '#F1F5F9', border: '1px solid #E2E8F0',
                borderRadius: 10, padding: '10px 18px', color: '#475569', fontFamily: 'inherit',
                fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', width: '100%',
              }}>Back</button>
            )}
          </div>
        ) : (
          <div>
            {/* Google Login */}
            <button onClick={handleGoogleLogin} style={{
              width: '100%', padding: '11px 16px', borderRadius: 10,
              border: '1px solid #E2E8F0', background: '#FFFFFF',
              color: '#1E293B', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 20, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              <GoogleIcon /> Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input type="email" required placeholder="name@university.edu.my" value={email}
                    onChange={e => setEmail(e.target.value)} style={{
                      width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10,
                      border: '1px solid #E2E8F0', background: '#FFFFFF',
                      color: '#1E293B', fontFamily: 'inherit', fontSize: '0.88rem', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                  />
                </div>
              </div>

              {errorMsg && (
                <div style={{ color: '#DC2626', fontSize: '0.78rem', marginBottom: 14, textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none',
                background: loading ? '#93C5FD' : '#2563EB',
                color: 'white', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s', marginBottom: 24,
              }}>
                {loading ? <Spinner /> : <><span>Get Magic Link</span><ArrowRight size={15} /></>}
              </button>
            </form>
          </div>
        )}

        {/* Feature tags */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🏠 AI Search', '🗺️ Commute', '📋 Lease', '💳 Bank Transfer'].map(tag => (
            <span key={tag} style={{
              fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6,
              background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0',
            }}>{tag}</span>
          ))}
        </div>

        {/* Sandbox role switcher */}
        {isMockDatabase && !magicLinkSent && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => { if (!email.trim()) { setErrorMsg('Please enter your email first'); return; } setMockModal(true); }} style={{
              background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.72rem',
              cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
            }}>
              Sandbox: choose role manually
            </button>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: '0.65rem', color: '#CBD5E1', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          By logging in you agree to our Terms &amp; Privacy Policy
        </p>
      </div>

      {/* Mock Role Modal */}
      {mockModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 300, padding: 20,
        }} onClick={() => setMockModal(false)}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 16, padding: '32px 28px', maxWidth: 360, width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>🧪</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1E293B', marginBottom: 4 }}>
                Choose Role
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
                Sign in as a student or admin to explore.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleMockLogin('student')} style={{
                flex: 1, padding: '14px 10px', borderRadius: 10, border: '1px solid #E2E8F0',
                background: '#F8FAFC', color: '#1E293B',
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', lineHeight: 1.4,
              }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>👨‍🎓</div>
                Student
              </button>
              <button onClick={() => handleMockLogin('admin')} style={{
                flex: 1, padding: '14px 10px', borderRadius: 10, border: '1px solid #E2E8F0',
                background: '#F8FAFC', color: '#1E293B',
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', lineHeight: 1.4,
              }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>🔑</div>
                Admin
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
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
