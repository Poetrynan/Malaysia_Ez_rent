'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, User, Building2, FileText, Users, Wrench, UserCheck, BarChart3, Eye, Mail, Star } from 'lucide-react';
import { isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';
import { useAuth } from '@/lib/AuthContext';
import { usePendingCounts } from '@/lib/PendingCountsContext';

export default function AppSidebar() {
  const { t, lang } = useApp();
  const { role, adminRole, userEmail, setRole } = useAuth();
  const { counts } = usePendingCounts();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const handleRoleChange = (newRole: 'student' | 'admin') => {
    setRole(newRole);
    router.push(newRole === 'admin' ? '/admin/properties' : '/listings');
  };

  return (
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
              <li onClick={() => router.push('/listings')} className={`nav-item ${isActive('/listings') ? 'active' : ''}`}>
                <Building2 size={16} />
                <span>{t('navListings')}</span>
                <span className="role-badge ai">{t('roleListingBadge')}</span>
              </li>
              <li onClick={() => router.push('/chat')} className={`nav-item ${isActive('/chat') ? 'active' : ''}`}>
                <MessageSquare size={16} />
                <span>{t('navAI')}</span>
                <span className="role-badge ai">{t('roleAIBadge')}</span>
              </li>
              <li onClick={() => router.push('/my-lease')} className={`nav-item ${isActive('/my-lease') ? 'active' : ''}`}>
                <User size={16} />
                <span>{t('navPortal')}</span>
                <span className="role-badge student">{t('roleTenantBadge')}</span>
              </li>
              <li onClick={() => router.push('/profile')} className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                <User size={16} />
                <span>{t('myProfile')}</span>
                <span className="role-badge student">{t('roleTenantBadge')}</span>
              </li>
              <li onClick={() => router.push('/maintenance')} className={`nav-item ${isActive('/maintenance') ? 'active' : ''}`}>
                <Wrench size={16} />
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {t('feedback')}
                  {counts.feedback > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                      {counts.feedback}
                    </span>
                  )}
                </span>
                <span className="role-badge student">{t('roleTenantBadge')}</span>
              </li>
              <li onClick={() => router.push('/inbox')} className={`nav-item ${isActive('/inbox') ? 'active' : ''}`}>
                <Mail size={16} />
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {lang === 'zh' ? '消息与公告' : 'Inbox & Alerts'}
                  {counts.unreadInbox > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                      {counts.unreadInbox}
                    </span>
                  )}
                </span>
                <span className="role-badge student">{t('roleTenantBadge')}</span>
              </li>
            </>
          )}
          {role === 'admin' && (
            <>
              <li onClick={() => router.push('/admin/dashboard')} className={`nav-item ${isActive('/admin/dashboard') ? 'active' : ''}`}>
                <BarChart3 size={16} />
                <span>{lang === 'zh' ? '数据看板' : 'Dashboard'}</span>
                <span className="role-badge admin">{t('roleManagerBadge')}</span>
              </li>
              <li onClick={() => router.push('/admin/listings')} className={`nav-item ${isActive('/admin/listings') ? 'active' : ''}`}>
                <Eye size={16} />
                <span>{lang === 'zh' ? '房源浏览' : 'Browse Listings'}</span>
                <span className="role-badge admin">{t('roleManagerBadge')}</span>
              </li>
              <li onClick={() => router.push('/admin/properties')} className={`nav-item ${isActive('/admin/properties') ? 'active' : ''}`}>
                <Building2 size={16} />
                <span>{lang === 'zh' ? '房源管理' : 'Properties'}</span>
                <span className="role-badge admin">{t('roleManagerBadge')}</span>
              </li>
              <li onClick={() => router.push('/admin/leases')} className={`nav-item ${isActive('/admin/leases') ? 'active' : ''}`}>
                <FileText size={16} />
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {lang === 'zh' ? '租约 & 财务台账' : 'Leases & Finance'}
                  {counts.leases > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                      {counts.leases}
                    </span>
                  )}
                </span>
                <span className="role-badge admin">{t('roleManagerBadge')}</span>
              </li>
              {adminRole === 'super_admin' && (
                <li onClick={() => router.push('/admin/admins')} className={`nav-item ${isActive('/admin/admins') ? 'active' : ''}`}>
                  <Users size={16} />
                  <span>{lang === 'zh' ? '中介与管理员' : 'Agents & Admins'}</span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
              )}
              <li onClick={() => router.push('/admin/feedback')} className={`nav-item ${isActive('/admin/feedback') ? 'active' : ''}`}>
                <Wrench size={16} />
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {t('feedback')}
                  {counts.feedback > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                      {counts.feedback}
                    </span>
                  )}
                </span>
                <span className="role-badge admin">{t('roleManagerBadge')}</span>
              </li>
              {adminRole === 'super_admin' && (
                <li onClick={() => router.push('/admin/agent-reviews')} className={`nav-item ${isActive('/admin/agent-reviews') ? 'active' : ''}`}>
                  <UserCheck size={16} />
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {lang === 'zh' ? '中介审核' : 'Agent Reviews'}
                    {counts.agentReviews > 0 && (
                      <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                        {counts.agentReviews}
                      </span>
                    )}
                  </span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
              )}
              {adminRole === 'super_admin' && (
                <li onClick={() => router.push('/admin/reviews')} className={`nav-item ${isActive('/admin/reviews') ? 'active' : ''}`}>
                  <Star size={16} />
                  <span>{lang === 'zh' ? '评论管理' : 'Reviews'}</span>
                  <span className="role-badge admin">{t('roleManagerBadge')}</span>
                </li>
              )}
              <li onClick={() => router.push('/admin/profile')} className={`nav-item ${isActive('/admin/profile') ? 'active' : ''}`}>
                <User size={16} />
                <span>{lang === 'zh' ? '个人设置' : 'Profile Settings'}</span>
                <span className="role-badge admin">{t('roleManagerBadge')}</span>
              </li>
              <li onClick={() => router.push('/admin/inbox')} className={`nav-item ${isActive('/admin/inbox') ? 'active' : ''}`}>
                <Mail size={16} />
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {lang === 'zh' ? '消息与公告' : 'Inbox & Announcements'}
                  {counts.unreadInbox > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                      {counts.unreadInbox}
                    </span>
                  )}
                </span>
                <span className="role-badge admin">{t('roleManagerBadge')}</span>
              </li>
            </>
          )}
        </ul>
      </div>

      <div>
        <div className="sidebar-divider" />
        {isMockDatabase && (
          <div className="role-switcher">
            <span className="role-switcher-label">{t('sandboxSwitch')}</span>
            <div className="role-switcher-btns">
              <button className={`role-btn ${role === 'student' ? 'active-student' : ''}`} onClick={() => handleRoleChange('student')}>
                {t('roleStudent')}
              </button>
              <button className={`role-btn ${role === 'admin' ? 'active-admin' : ''}`} onClick={() => handleRoleChange('admin')}>
                {t('roleAdmin')}
              </button>
            </div>
          </div>
        )}

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
  );
}
