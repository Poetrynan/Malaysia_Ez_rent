'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/lib/ThemeProvider';
import { LayoutDashboard, Building2, Camera, MessageSquare, User, Sun, Moon, Globe } from 'lucide-react';

const tabs = [
  { path: '/m/dashboard', icon: LayoutDashboard, labelZh: '首页', labelEn: 'Home' },
  { path: '/m/properties', icon: Building2, labelZh: '房源', labelEn: 'Listings' },
  { path: '/m/upload', icon: Camera, labelZh: '上传', labelEn: 'Upload' },
  { path: '/m/feedback', icon: MessageSquare, labelZh: '消息', labelEn: 'Messages' },
  { path: '/m/profile', icon: User, labelZh: '我的', labelEn: 'Profile' },
];

export default function MobileShell({ children, lang }: { children: React.ReactNode; lang: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setLang, theme, toggleTheme } = useApp();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-body)',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar: language + theme */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        padding: '8px 16px', gap: 8,
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--glass-border)',
      }}>
        <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 20,
          border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-body)',
        }}>
          <Globe size={13} /> {lang === 'zh' ? 'EN' : '中文'}
        </button>
        <button onClick={toggleTheme} style={{
          display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: 20,
          border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          cursor: 'pointer', color: 'var(--text-body)',
        }}>
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        padding: '16px 16px 88px',
        maxWidth: 520,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        {children}
      </div>

      {/* Bottom tab bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '6px 0 env(safe-area-inset-bottom, 8px)',
        zIndex: 100,
        boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
      }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.path || pathname.startsWith(tab.path + '/');
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 10,
                transition: 'all 0.2s ease',
                minWidth: 56,
                position: 'relative',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24,
                  height: 3,
                  borderRadius: 2,
                  background: 'var(--gradient-primary)',
                }} />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.8}
                style={{
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  transition: 'color 0.2s ease',
                }}
              />
              <span style={{
                fontSize: '0.65rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'color 0.2s ease',
                letterSpacing: '-0.01em',
              }}>
                {lang === 'zh' ? tab.labelZh : tab.labelEn}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
