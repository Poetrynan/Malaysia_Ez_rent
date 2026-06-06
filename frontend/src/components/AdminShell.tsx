'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminPanel from '@/components/AdminPanel';
import PropertyListings from '@/components/PropertyListings';
import Inbox from '@/components/Inbox';
import { useAuth } from '@/lib/AuthContext';
import { usePendingCounts } from '@/lib/PendingCountsContext';
import { useApp } from '@/lib/ThemeProvider';

type AdminTab = 'dashboard' | 'properties' | 'leases' | 'admins' | 'feedback' | 'agent-reviews' | 'reviews' | 'profile';

const PATH_TO_TAB: Record<string, AdminTab> = {
  '/admin/dashboard': 'dashboard',
  '/admin/properties': 'properties',
  '/admin/leases': 'leases',
  '/admin/admins': 'admins',
  '/admin/feedback': 'feedback',
  '/admin/agent-reviews': 'agent-reviews',
  '/admin/reviews': 'reviews',
  '/admin/profile': 'profile',
};

const PAGE_TITLES: Record<string, { zh: string; en: string }> = {
  '/admin/dashboard': { zh: '数据看板', en: 'Dashboard' },
  '/admin/listings': { zh: '房源浏览', en: 'Browse Listings' },
  '/admin/properties': { zh: '房源管理', en: 'Properties' },
  '/admin/leases': { zh: '租约 & 财务台账', en: 'Leases & Finance' },
  '/admin/admins': { zh: '中介与管理员', en: 'Agents & Admins' },
  '/admin/feedback': { zh: '报修与反馈', en: 'Maintenance & Feedback' },
  '/admin/agent-reviews': { zh: '中介注册审核', en: 'Agent Registration Review' },
  '/admin/reviews': { zh: '评价管理', en: 'Reviews' },
  '/admin/profile': { zh: '个人资料', en: 'Profile' },
  '/admin/inbox': { zh: '消息与公告', en: 'Inbox & Announcements' },
};

const SUPER_ADMIN_ONLY_TABS = new Set<AdminTab>(['admins', 'agent-reviews', 'reviews']);

export default function AdminShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { adminRole } = useAuth();
  const { updateCounts } = usePendingCounts();
  const { lang } = useApp();

  useEffect(() => {
    const title = PAGE_TITLES[pathname];
    if (title) {
      document.title = `${lang === 'zh' ? title.zh : title.en} | Malaysia Ez Rent`;
    }
  }, [pathname, lang]);

  if (pathname === '/admin/listings') {
    return <PropertyListings readOnly />;
  }

  if (pathname === '/admin/inbox') {
    return <Inbox adminRole={adminRole} onUnreadCountChange={(count) => updateCounts({ unreadInbox: count })} />;
  }

  const activeTab = PATH_TO_TAB[pathname] ?? 'dashboard';

  if (SUPER_ADMIN_ONLY_TABS.has(activeTab) && adminRole !== 'super_admin') {
    return null;
  }

  return (
    <AdminPanel
      adminRole={adminRole}
      activeTab={activeTab}
      hideTabBar
      onPendingCountsChange={(leasesCount, feedbackCount, agentReviewsCount) => {
        updateCounts({
          leases: leasesCount,
          feedback: feedbackCount,
          ...(agentReviewsCount !== undefined ? { agentReviews: agentReviewsCount } : {}),
        });
      }}
      onTabChange={(tab) => router.push(`/admin/${tab}`)}
    />
  );
}
