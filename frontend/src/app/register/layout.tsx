'use client';

import React from 'react';
import { Sun, Moon, Globe } from 'lucide-react';
import { ThemeProvider as AppProvider, useApp } from '@/lib/ThemeProvider';

function RegisterShell({ children }: { children: React.ReactNode }) {
  const { lang, setLang, theme, toggleTheme } = useApp();

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)', position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Aurora background */}
      <div className="login-aurora" aria-hidden="true" />
      <div className="login-blob login-blob-1" aria-hidden="true" />
      <div className="login-blob login-blob-2" aria-hidden="true" />

      {/* Top bar */}
      <div className="topbar" style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(var(--bg-base-rgb, 244,247,246), 0.8)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '10px 24px', zIndex: 100,
      }}>
        <a href="/login" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', marginRight: 'auto',
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-h)' }}>
            Malaysia Ez Rent
          </span>
        </a>
        <button className={`topbar-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? (lang === 'zh' ? '浅色' : 'Light') : (lang === 'zh' ? '深色' : 'Dark')}
        </button>
        <button className="topbar-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} style={{ cursor: 'pointer' }}>
          <Globe size={13} />
          {lang === 'zh' ? 'EN' : '中文'}
        </button>
      </div>

      {/* Content area with top padding for fixed navbar */}
      <div style={{
        paddingTop: 70, minHeight: '100vh',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '70px 20px 40px', position: 'relative', zIndex: 1,
      }}>
        {children}
      </div>
    </div>
  );
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <RegisterShell>{children}</RegisterShell>
    </AppProvider>
  );
}
