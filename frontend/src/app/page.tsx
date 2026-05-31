'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, User, ShieldAlert, BadgeInfo, Sun, Moon, Globe, Building2, LogOut, FileText, QrCode, Users, Wrench, UserX, BarChart3, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import AIChat from '@/components/AIChat';
import StudentPortal from '@/components/StudentPortal';
import AdminPanel from '@/components/AdminPanel';
import PropertyListings from '@/components/PropertyListings';
import { isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';

export default function Home() {
  const { t, lang, setLang, theme, toggleTheme } = useApp();
  const [activeTab, setActiveTab] = useState<'listings' | 'chat' | 'student' | 'profile' | 'maintenance' | 'admin-dashboard' | 'admin-properties' | 'admin-leases' | 'admin-listings' | 'admin-admins' | 'admin-feedback' | 'admin-agent-reviews' | 'admin-profile'>('listings');
  const [role, setRole] = useState<'student' | 'admin' | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'editor' | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [pendingCounts, setPendingCounts] = useState({ leases: 0, feedback: 0, agentReviews: 0 });
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [agentRegStatus, setAgentRegStatus] = useState<string | null>(null);

  const handlePendingCountsChange = useCallback((leasesCount: number, feedbackCount: number) => {
    setPendingCounts(prev => {
      if (prev.leases === leasesCount && prev.feedback === feedbackCount) return prev;
      return { ...prev, leases: leasesCount, feedback: feedbackCount };
    });
  }, []);

  const handleStudentFeedbackCountChange = useCallback((count: number) => {
    setPendingCounts(prev => {
      if (prev.feedback === count) return prev;
      return { ...prev, feedback: count };
    });
  }, []);

  const handleRoleChange = (newRole: 'student' | 'admin') => {
    setRole(newRole);
    localStorage.setItem('ez_user_role', newRole);
    setActiveTab(newRole === 'admin' ? 'admin-dashboard' : 'listings');
  };

  // Auth guard: redirect to /login if not logged in
  useEffect(() => {
    if (isMockDatabase) {
      const loggedIn = localStorage.getItem('ez_logged_in');
      if (!loggedIn) {
        window.location.href = '/login';
        return;
      }
      // Check admin_users in localStorage to determine role
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const email = localStorage.getItem('ez_user_email') || 'student@ezrent.my';
      const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
      
      const mockAdminIdx = admins.findIndex((a: any) => a.id === tenantId || (a.email === email && email !== ''));
      let isAdmin = false;
      if (mockAdminIdx !== -1) {
        isAdmin = true;
        if (admins[mockAdminIdx].id !== tenantId) {
          admins[mockAdminIdx].id = tenantId;
          localStorage.setItem('ez_admins', JSON.stringify(admins));
        }
      }

      const finalRole: 'student' | 'admin' = isAdmin ? 'admin' : 'student';
      localStorage.setItem('ez_user_role', finalRole);
      setRole(finalRole);
      setActiveTab(finalRole === 'admin' ? 'admin-properties' : 'listings');
      setUserEmail(email);
      // Check agent registration status for THIS user only (match by email)
      if (finalRole === 'student') {
        const regs = JSON.parse(localStorage.getItem('ez_agent_registrations') || '[]');
        const myReg = regs.find((r: any) => r.auth_user_id === tenantId || (r.email === email && email !== ''));
        if (myReg) setAgentRegStatus(myReg.verification_status);
      }
    } else {
      const checkSession = async () => {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }
        // Check if user is an admin by looking up admin_users table (by id or email)
        let adminRecord = null;
        if (user.email) {
          const { data: record } = await supabase
            .from('admin_users')
            .select('id, role, email')
            .or(`id.eq.${user.id},email.eq.${user.email}`)
            .maybeSingle();
          if (record) {
            adminRecord = record;
            if (record.id !== user.id) {
              console.log('[Auth Bootstrap] Found admin by email, updating id to user.id');
              const { error: updErr } = await supabase
                .from('admin_users')
                .update({ id: user.id })
                .eq('email', user.email);
              if (!updErr) {
                adminRecord.id = user.id;
              } else {
                console.error('[Auth Bootstrap] Failed to update admin id:', updErr);
              }
            }
          }
        } else {
          const { data: record } = await supabase
            .from('admin_users')
            .select('id, role')
            .eq('id', user.id)
            .maybeSingle();
          adminRecord = record;
        }

        const activeRole = adminRecord ? 'admin' : 'student';
        if (adminRecord) {
          setAdminRole(adminRecord.role as 'super_admin' | 'editor');
        }
        setRole(activeRole);
        setActiveTab(activeRole === 'admin' ? 'admin-properties' : 'listings');
        setUserEmail(user.email || '');
        localStorage.setItem('ez_tenant_id', user.id);
        // Fetch pending agent registrations count for admin badge
        if (activeRole === 'admin') {
          const { count } = await supabase.from('agent_registrations').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');
          if (count && count > 0) setPendingCounts(prev => ({ ...prev, agentReviews: count }));
        }
        // Check agent registration status if student (match by user.id or email)
        if (!adminRecord && user.email) {
          console.log('[Agent Banner] Checking for user:', user.id, user.email);
          // First try by email (most reliable since registration uses email)
          const { data: byEmail, error: emailErr } = await supabase
            .from('agent_registrations')
            .select('verification_status, email, auth_user_id')
            .eq('email', user.email)
            .maybeSingle();
          console.log('[Agent Banner] By email:', byEmail, emailErr?.message);
          if (byEmail) {
            setAgentRegStatus(byEmail.verification_status);
          } else {
            // Fallback: try by auth_user_id
            const { data: byId } = await supabase
              .from('agent_registrations')
              .select('verification_status')
              .eq('auth_user_id', user.id)
              .maybeSingle();
            console.log('[Agent Banner] By auth_user_id:', byId);
            if (byId) setAgentRegStatus(byId.verification_status);
          }
        }
      };
      checkSession();
    }
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('ez_logged_in');
    localStorage.removeItem('ez_user_role');
    localStorage.removeItem('ez_tenant_id');
    document.cookie = "ez_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (!isMockDatabase) {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    if (isMockDatabase) {
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      // Remove user record
      const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
      localStorage.setItem('ez_users', JSON.stringify(users.filter((u: any) => u.id !== tenantId)));
      // Remove tenant interests
      const interests = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      localStorage.setItem('ez_interests', JSON.stringify(interests.filter((i: any) => i.user_id !== tenantId)));
      // Remove maintenance requests
      const feedbacks = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      localStorage.setItem('ez_feedback', JSON.stringify(feedbacks.filter((f: any) => f.user_id !== tenantId)));
      // Remove agent registration if exists
      const agentRegs = JSON.parse(localStorage.getItem('ez_agent_registrations') || '[]');
      localStorage.setItem('ez_agent_registrations', JSON.stringify(agentRegs.filter((r: any) => r.auth_user_id !== tenantId)));
      // Remove admin record if exists
      const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
      localStorage.setItem('ez_admins', JSON.stringify(admins.filter((a: any) => a.id !== tenantId)));
      // Note: leases and payment_records are preserved — they are the agent's financial records
      localStorage.removeItem('ez_logged_in');
      localStorage.removeItem('ez_user_role');
      localStorage.removeItem('ez_tenant_id');
      window.location.href = '/login';
    } else {
      const { deleteAccountAction } = await import('@/app/actions/deleteAccount');
      const result = await deleteAccountAction();
      if (!result.success) {
        console.error('Delete account failed:', result.error);
      }
      const { createClient } = await import('@/utils/supabase/client');
      await createClient().auth.signOut();
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  if (role === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('loadingApp')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div>
          {/* Logo */}
          <div className="logo-section">
            <img src="/logo.png" alt="Malaysia Ez Rent" className="logo-img" />
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
                <li onClick={() => setActiveTab('profile')} className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
                  <User size={16} />
                  <span>{t('myProfile')}</span>
                  <span className="role-badge student">{t('roleTenantBadge')}</span>
                </li>
                <li onClick={() => { setActiveTab('maintenance'); setPendingCounts(prev => ({ ...prev, feedback: 0 })); }} className={`nav-item ${activeTab === 'maintenance' ? 'active' : ''}`}>
                  <Wrench size={16} />
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {t('feedback')}
                    {role === 'student' && pendingCounts.feedback > 0 && (
                      <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                        {pendingCounts.feedback}
                      </span>
                    )}
                  </span>
                  <span className="role-badge student">{t('roleTenantBadge')}</span>
                </li>
              </>
            )}
            {role === 'admin' && (
              <>
                <li onClick={() => setActiveTab('admin-dashboard')} className={`nav-item ${activeTab === 'admin-dashboard' ? 'active' : ''}`}>
                  <BarChart3 size={16} />
                  <span>{lang === 'zh' ? '数据看板' : 'Dashboard'}</span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
                <li onClick={() => setActiveTab('admin-listings')} className={`nav-item ${activeTab === 'admin-listings' ? 'active' : ''}`}>
                  <Eye size={16} />
                  <span>{lang === 'zh' ? '房源浏览' : 'Browse Listings'}</span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
                <li onClick={() => setActiveTab('admin-properties')} className={`nav-item ${activeTab === 'admin-properties' ? 'active' : ''}`}>
                  <Building2 size={16} />
                  <span>{lang === 'zh' ? '房源管理' : 'Properties'}</span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
                <li onClick={() => setActiveTab('admin-leases')} className={`nav-item ${activeTab === 'admin-leases' ? 'active' : ''}`}>
                  <FileText size={16} />
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {lang === 'zh' ? '租约 & 财务台账' : 'Leases & Finance'}
                    {pendingCounts.leases > 0 && (
                      <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                        {pendingCounts.leases}
                      </span>
                    )}
                  </span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
                {adminRole === 'super_admin' && (
                  <li onClick={() => setActiveTab('admin-admins')} className={`nav-item ${activeTab === 'admin-admins' ? 'active' : ''}`}>
                    <Users size={16} />
                    <span>{lang === 'zh' ? '中介与管理员' : 'Agents & Admins'}</span>
                    <span className="role-badge admin">{t('roleManagerBadge')}</span>
                  </li>
                )}
                <li onClick={() => setActiveTab('admin-feedback')} className={`nav-item ${activeTab === 'admin-feedback' ? 'active' : ''}`}>
                  <Wrench size={16} />
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {t('feedback')}
                    {pendingCounts.feedback > 0 && (
                      <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                        {pendingCounts.feedback}
                      </span>
                    )}
                  </span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
                {adminRole === 'super_admin' && (
                  <li onClick={() => setActiveTab('admin-agent-reviews')} className={`nav-item ${activeTab === 'admin-agent-reviews' ? 'active' : ''}`}>
                    <Building2 size={16} />
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {lang === 'zh' ? '中介审核' : 'Agent Reviews'}
                      {pendingCounts.agentReviews > 0 && (
                        <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                          {pendingCounts.agentReviews}
                        </span>
                      )}
                    </span>
                    <span className="role-badge admin">{t('roleManagerBadge')}</span>
                  </li>
                )}
                <li onClick={() => setActiveTab('admin-profile')} className={`nav-item ${activeTab === 'admin-profile' ? 'active' : ''}`}>
                  <User size={16} />
                  <span>{lang === 'zh' ? '个人设置' : 'Profile Settings'}</span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div>
          <div className="sidebar-divider" />

          {/* Agent registration status banner */}
          {role === 'student' && agentRegStatus && (
            <div style={{
              margin: '0 12px 8px', padding: '8px 10px', borderRadius: 8, fontSize: '0.72rem',
              background: agentRegStatus === 'approved' ? 'rgba(16,185,129,0.1)' : agentRegStatus === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${agentRegStatus === 'approved' ? 'rgba(16,185,129,0.25)' : agentRegStatus === 'rejected' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
              color: agentRegStatus === 'approved' ? 'var(--success)' : agentRegStatus === 'rejected' ? 'var(--danger)' : 'var(--warning)',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Building2 size={13} />
              {agentRegStatus === 'approved'
                ? (lang === 'zh' ? '中介申请已通过，请重新登录' : 'Agent approved, re-login')
                : agentRegStatus === 'rejected'
                ? (lang === 'zh' ? '中介申请未通过' : 'Agent application rejected')
                : (lang === 'zh' ? '中介申请审核中' : 'Agent application pending')}
            </div>
          )}

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

          {/* Delete Account */}
          <button className="topbar-btn" onClick={() => setShowDeleteAccount(true)}
            style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-light)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}>
            <UserX size={13} />
            {lang === 'zh' ? '注销' : 'Delete'}
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
                <button onClick={handleDeleteAccount} style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--danger)',
                  color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  {lang === 'zh' ? '确认注销' : 'Delete My Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="main-content">
          {/* Agent Registration Status — Scrolling Marquee for pending */}
          {role === 'student' && agentRegStatus === 'pending' && (
            <div style={{
              margin: '12px 16px 0', borderRadius: 10, overflow: 'hidden',
              background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04), rgba(245,158,11,0.12))',
              border: '1px solid rgba(245,158,11,0.25)', position: 'relative', height: 40,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', height: '100%', whiteSpace: 'nowrap',
                animation: 'marquee 20s linear infinite', paddingLeft: '100%',
              }}>
                <Building2 size={14} style={{ color: '#D97706', marginRight: 8, flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#D97706' }}>
                  {lang === 'zh'
                    ? '⚠️ 您的中介注册申请正在审核中，审核通过后将自动移入中介管理端。当前为租客界面。'
                    : '⚠️ Your agent registration is under review. After approval, you will be moved to the agent portal. Currently viewing tenant interface.'}
                </span>
                <span style={{ margin: '0 40px', color: 'rgba(245,158,11,0.3)' }}>●</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#D97706' }}>
                  {lang === 'zh'
                    ? '⚠️ 您的中介注册申请正在审核中，审核通过后将自动移入中介管理端。当前为租客界面。'
                    : '⚠️ Your agent registration is under review. After approval, you will be moved to the agent portal. Currently viewing tenant interface.'}
                </span>
              </div>
            </div>
          )}
          {role === 'student' && agentRegStatus === 'approved' && (
            <div style={{
              margin: '12px 16px 0', padding: '14px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
              border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={20} style={{ color: '#059669' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 2 }}>
                  {lang === 'zh' ? '中介申请已通过！' : 'Agent Application Approved!'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {lang === 'zh'
                    ? '恭喜！您的中介申请已审核通过。请重新登录以进入中介管理后台。'
                    : 'Congratulations! Your agent application has been approved. Please log in again to access the admin panel.'}
                </div>
              </div>
            </div>
          )}
          {role === 'student' && agentRegStatus === 'rejected' && (
            <div style={{
              margin: '12px 16px 0', padding: '14px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
              border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} style={{ color: '#DC2626' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 2 }}>
                  {lang === 'zh' ? '中介申请未通过' : 'Agent Application Rejected'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {lang === 'zh'
                    ? '很抱歉，您的中介申请未通过审核。如有疑问请联系管理员。'
                    : 'Sorry, your agent application was not approved. Please contact admin for details.'}
                </div>
              </div>
            </div>
          )}

          {/* Views — always mounted for stable DOM */}
          <div style={{ display: role === 'student' && activeTab === 'listings' ? 'block' : 'none' }}>
            <PropertyListings />
          </div>
          <div style={{ display: role === 'student' && activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <AIChat />
          </div>
          <div style={{ display: role === 'student' && activeTab === 'student' ? 'block' : 'none' }}>
            <StudentPortal mode="lease" onUnreadFeedbackCountChange={handleStudentFeedbackCountChange} />
          </div>
          <div style={{ display: role === 'student' && activeTab === 'profile' ? 'block' : 'none' }}>
            <StudentPortal mode="profile" onUnreadFeedbackCountChange={handleStudentFeedbackCountChange} />
          </div>
          <div style={{ display: role === 'student' && activeTab === 'maintenance' ? 'block' : 'none' }}>
            <StudentPortal mode="maintenance" onUnreadFeedbackCountChange={handleStudentFeedbackCountChange} />
          </div>
          <div style={{ display: role === 'admin' && activeTab === 'admin-listings' ? 'block' : 'none' }}>
            <PropertyListings readOnly />
          </div>
          <div style={{ display: role === 'admin' && activeTab.startsWith('admin-') && activeTab !== 'admin-listings' ? 'block' : 'none' }}>
            <AdminPanel 
              adminRole={adminRole} 
              defaultTab={
                activeTab === 'admin-dashboard' ? 'dashboard' :
                activeTab === 'admin-properties' ? 'properties' :
                activeTab === 'admin-leases' ? 'leases' :
                activeTab === 'admin-admins' ? 'admins' :
                activeTab === 'admin-feedback' ? 'feedback' :
                activeTab === 'admin-agent-reviews' ? 'agent-reviews' :
                activeTab === 'admin-profile' ? 'profile' :
                'dashboard'
              }
              hideTabBar={true}
              onPendingCountsChange={handlePendingCountsChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
