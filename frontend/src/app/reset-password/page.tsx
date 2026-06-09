'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { isMockDatabase } from '@/lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

function ResetPasswordForm() {
  const { lang, theme } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isMock = searchParams.get('mock') === 'true';
  const mockEmail = searchParams.get('email') || '';
  const mockRole = searchParams.get('role') || 'student';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = `${lang === 'zh' ? '重置密码' : 'Reset Password'} | Malaysia Ez Rent`;
  }, [lang]);

  // Security check: Verify we have a session (unless in mock mode)
  useEffect(() => {
    if (isMock || isMockDatabase) return;
    
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No authenticated session found, bounce to login
        router.replace('/login?error=reset_session_expired');
      }
    };
    checkSession();
  }, [router, isMock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg(lang === 'zh' ? '新密码长度不能少于 6 位' : 'New password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(lang === 'zh' ? '两次输入的密码不一致' : 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (isMock || isMockDatabase) {
        // Mock flow: Update mock database user credentials
        console.log(`[Mock Reset Password] Updating password for ${mockEmail} (${mockRole})`);
        
        // Simulating delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (mockRole === 'agent') {
          const regs = JSON.parse(localStorage.getItem('ez_agent_profiles') || '[]');
          const myRegIdx = regs.findIndex((r: any) => r.email === mockEmail.toLowerCase().trim());
          if (myRegIdx !== -1) {
            regs[myRegIdx].password = password;
            localStorage.setItem('ez_agent_profiles', JSON.stringify(regs));
          }
        } else {
          const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
          const myUserIdx = users.findIndex((u: any) => u.email === mockEmail.toLowerCase().trim());
          if (myUserIdx !== -1) {
            users[myUserIdx].password = password;
            localStorage.setItem('ez_users', JSON.stringify(users));
          }
        }
        
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Real Supabase Auth Flow
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error(lang === 'zh' ? '会话已过期，请重新发起密码重置请求' : 'Session expired, please request password reset again.');
      }

      const { error } = await supabase.auth.updateUser({
        password: password.trim()
      });

      if (error) throw error;

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error updating password');
      setLoading(false);
    }
  };

  const handleRedirect = async () => {
    if (isMock || isMockDatabase) {
      // Auto login under mock mode and redirect
      localStorage.setItem('ez_user_email', mockEmail.toLowerCase().trim());
      localStorage.setItem('ez_user_role', mockRole === 'agent' ? 'admin' : 'student');
      localStorage.setItem('ez_tenant_id', mockRole === 'agent' ? 'agent-123' : 'tenant-123');
      localStorage.setItem('ez_logged_in', '1');
      document.cookie = 'ez_logged_in=1; path=/; max-age=31536000';
      
      router.push(mockRole === 'agent' ? '/admin/dashboard' : '/listings');
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    const metadataRole = user.user_metadata?.role;
    if (metadataRole === 'agent') {
      router.push('/admin/dashboard');
    } else {
      const { data: dbUser } = await supabase
        .from('users')
        .select('identity_type')
        .eq('id', user.id)
        .maybeSingle();

      if (!dbUser || !dbUser.identity_type) {
        router.push('/profile');
      } else {
        router.push('/listings');
      }
    }
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: 20,
    background: 'var(--bg-base)', fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
    borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 420,
    boxShadow: 'var(--glass-shadow)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    transition: 'all 0.3s ease', zIndex: 1, position: 'relative',
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

  if (success) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--success)', marginBottom: 16, display: 'inline-block' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-h)', marginBottom: 10 }}>
            {lang === 'zh' ? '密码修改成功！' : 'Password Updated Successfully!'}
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            {lang === 'zh'
              ? '您的新密码已成功保存，系统将带您直接进入平台后台。'
              : 'Your new password has been set. The system will direct you into the platform.'}
          </p>
          <button onClick={handleRedirect} style={primaryBtnStyle}>
            {lang === 'zh' ? '开始使用' : 'Get Started'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/logo.png" alt="Malaysia Ez Rent" style={{ width: 64, height: 64, objectFit: 'contain', display: 'block', margin: '0 auto 12px' }} />
        <h2 className="flag-wordmark" style={{ fontSize: '1.6rem', lineHeight: 1.2, margin: 0 }}>
          {lang === 'zh' ? '设置新密码' : 'Set New Password'}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
          {lang === 'zh'
            ? '请为您的账号设置一个强度足够的新密码以保障安全'
            : 'Please set a secure new password to access your account'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label htmlFor="new-password" style={labelStyle}>{lang === 'zh' ? '输入新密码' : 'New Password'}</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder={lang === 'zh' ? '新密码（至少6位）' : 'New password (at least 6 chars)'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? <EyeOff size={15} style={{ color: 'var(--text-muted)' }} /> : <Eye size={15} style={{ color: 'var(--text-muted)' }} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" style={labelStyle}>{lang === 'zh' ? '再次输入密码' : 'Confirm Password'}</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              placeholder={lang === 'zh' ? '再次输入新密码' : 'Confirm new password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {errorMsg && (
          <div style={{ color: 'var(--danger)', fontSize: '0.78rem', padding: '8px 10px', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, marginTop: 10, opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : (lang === 'zh' ? '保存新密码' : 'Save Password')}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: 20,
    background: 'var(--bg-base)', fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  return (
    <div style={containerStyle}>
      <div className="login-aurora" aria-hidden="true" />
      <div className="login-blob login-blob-1" aria-hidden="true" />
      <div className="login-blob login-blob-2" aria-hidden="true" />
      <Suspense fallback={
        <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 420, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
