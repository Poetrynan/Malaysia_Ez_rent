'use client';

import React, { useState } from 'react';
import { BadgeInfo, Sun, Moon, Globe, UserX, LogOut } from 'lucide-react';
import { isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';
import { useAuth } from '@/lib/AuthContext';

export default function AppTopbar() {
  const { t, lang, setLang, theme, toggleTheme } = useApp();
  const { logout, deleteAccount } = useAuth();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  return (
    <>
      <div className="topbar">
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
          <BadgeInfo size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: 'var(--primary)' }} />
          {isMockDatabase ? t('sandboxMode') : t('liveMode')}
        </div>

        {/* Theme toggle */}
        <button className={`topbar-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? t('toLight') : t('toDark')}
        </button>

        {/* Language toggle */}
        <button className="topbar-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          <Globe size={13} />
          {lang === 'zh' ? t('toLangEN') : t('toLangZH')}
        </button>

        {/* Delete Account */}
        <button className="topbar-btn" onClick={() => setShowDeleteAccount(true)}
          style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-light)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}>
          <UserX size={13} />
          {lang === 'zh' ? '注销' : 'Delete'}
        </button>

        {/* Logout */}
        <button className="topbar-btn" onClick={logout}
          style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-light)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}>
          <LogOut size={13} />
          {lang === 'zh' ? '退出' : 'Logout'}
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowDeleteAccount(false)}>
          <div style={{ background: 'var(--bg-surface-solid)', borderRadius: 16, padding: '28px 32px', maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--danger)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserX size={18} /> {lang === 'zh' ? '确认注销账户' : 'Confirm Account Deletion'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: '0 0 24px', lineHeight: 1.6 }}>
              {lang === 'zh'
                ? '注销后，您的所有信息（包括个人信息、工单记录等）将被永久删除，此操作无法撤销。请谨慎操作！'
                : 'All your data (profile, maintenance requests, etc.) will be permanently deleted. This action cannot be undone. Please proceed with caution!'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteAccount(false)} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
                color: 'var(--text-body)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
              }}>
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button onClick={deleteAccount} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--danger)',
                color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
              }}>
                {lang === 'zh' ? '确认注销' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
