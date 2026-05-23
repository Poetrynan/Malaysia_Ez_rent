'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, User, ShieldAlert, BadgeInfo, Sun, Moon, Globe, Building2, LogOut } from 'lucide-react';
import AIChat from '@/components/AIChat';
import StudentPortal from '@/components/StudentPortal';
import AdminPanel from '@/components/AdminPanel';
import PropertyListings from '@/components/PropertyListings';
import { isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';

export default function Home() {
  const { t, lang, setLang, theme, toggleTheme } = useApp();
  const [activeTab, setActiveTab] = useState<'listings' | 'chat' | 'student' | 'admin'>('listings');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [adminRole, setAdminRole] = useState<'super_admin' | 'editor' | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const handleRoleChange = (newRole: 'student' | 'admin') => {
    setRole(newRole);
    localStorage.setItem('ez_user_role', newRole);
    setActiveTab(newRole === 'admin' ? 'admin' : 'listings');
  };

  // Auth guard: redirect to /login if not logged in
  useEffect(() => {
    if (isMockDatabase) {
      const loggedIn = localStorage.getItem('ez_logged_in');
      if (!loggedIn) {
        window.location.href = '/login';
        return;
      }
      // Restore role from localStorage
      const savedRole = localStorage.getItem('ez_user_role') as 'student' | 'admin' | null;
      if (savedRole) {
        setRole(savedRole);
        setActiveTab(savedRole === 'admin' ? 'admin' : 'listings');
      }
      setUserEmail(localStorage.getItem('ez_user_email') || 'student@ezrent.my');
    } else {
      const checkSession = async () => {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }
        // Check if user is an admin by looking up admin_users table
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('id, role')
          .eq('id', user.id)
          .single();
        const activeRole = adminRecord ? 'admin' : 'student';
        if (adminRecord) {
          setAdminRole(adminRecord.role as 'super_admin' | 'editor');
        }
        setRole(activeRole);
        setActiveTab(activeRole === 'admin' ? 'admin' : 'listings');
        setUserEmail(user.email || '');
      };
      checkSession();
    }
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('ez_logged_in');
    localStorage.removeItem('ez_user_role');
    document.cookie = "ez_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (!isMockDatabase) {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    window.location.href = '/login';
  };

  return (
    <div className="app-container">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div>
          {/* Logo */}
          <div className="logo-section">
            <div className="logo-icon">Ez</div>
            <div>
              <div className="logo-text">{t('appName')}</div>
              <div className="logo-tagline">{t('appTagline')}</div>
            </div>
          </div>

          {/* Nav */}
          <ul className="nav-links">
            {role === 'student' && (
              <>
                <li onClick={() => setActiveTab('listings')} className={`nav-item ${activeTab === 'listings' ? 'active' : ''}`}>
                  <Building2 size={16} />
                  <span>{t('navListings')}</span>
                  <span className="role-badge ai">{t('roleListingBadge')}</span>
                </li>
                <li onClick={() => setActiveTab('chat')} className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}>
                  <MessageSquare size={16} />
                  <span>{t('navAI')}</span>
                  <span className="role-badge ai">{t('roleAIBadge')}</span>
                </li>
                <li onClick={() => setActiveTab('student')} className={`nav-item ${activeTab === 'student' ? 'active' : ''}`}>
                  <User size={16} />
                  <span>{t('navPortal')}</span>
                  <span className="role-badge student">{t('roleTenantBadge')}</span>
                </li>
              </>
            )}
            {role === 'admin' && (
              <li onClick={() => setActiveTab('admin')} className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}>
                <ShieldAlert size={16} />
                <span>{t('navAdmin')}</span>
                <span className="role-badge admin">{t('roleManagerBadge')}</span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <div className="sidebar-divider" />
          {/* Role Switcher — sandbox only */}
          {isMockDatabase && (<div className="role-switcher">
            <span className="role-switcher-label">{t('sandboxSwitch')}</span>
            <div className="role-switcher-btns">
              <button className={`role-btn ${role === 'student' ? 'active-student' : ''}`} onClick={() => handleRoleChange('student')}>
                {t('roleStudent')}
              </button>
              <button className={`role-btn ${role === 'admin' ? 'active-admin' : ''}`} onClick={() => handleRoleChange('admin')}>
                {t('roleAdmin')}
              </button>
            </div>
          </div>)}

          {/* User */}
          <div className="user-footer">
            <div className="avatar" style={{
              backgroundImage: `url('https://api.dicebear.com/7.x/bottts/svg?seed=${role === 'admin' ? 'Admin' : 'Alex'}')`,
              backgroundSize: 'cover'
            }} />
            <div>
              <div className="username">{userEmail || (role === 'admin' ? t('userAdmin') : t('userStudent'))}</div>
              <div className="user-role-text">{role === 'admin' ? t('userAdminRole') : t('userStudentRole')}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-viewport">
        {/* ── TOP BAR (right-aligned theme + lang toggles) ── */}
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

          {/* Logout */}
          <button className="topbar-btn" onClick={handleLogout}
            style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-light)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}>
            <LogOut size={13} />
            {lang === 'zh' ? '退出' : 'Logout'}
          </button>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="main-content">
          {/* Views — always mounted for stable DOM */}
          <div style={{ display: role === 'student' && activeTab === 'listings' ? 'block' : 'none' }}>
            <PropertyListings />
          </div>
          <div style={{ display: role === 'student' && activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <AIChat />
          </div>
          <div style={{ display: role === 'student' && activeTab === 'student' ? 'block' : 'none' }}>
            <StudentPortal />
          </div>
          <div style={{ display: role === 'admin' && activeTab === 'admin' ? 'block' : 'none' }}>
            <AdminPanel adminRole={adminRole} />
          </div>
        </div>
      </main>
    </div>
  );
}
