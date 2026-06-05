'use client';

import React, { useEffect } from 'react';
import Inbox from '@/components/Inbox';
import { useAuth } from '@/lib/AuthContext';
import { usePendingCounts } from '@/lib/PendingCountsContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';

export default function InboxPage() {
  const { role, adminRole, loading } = useAuth();
  const { updateCounts } = usePendingCounts();
  const { lang } = useApp();
  const router = useRouter();

  useEffect(() => {
    document.title = `${lang === 'zh' ? '消息与公告' : 'Inbox & Alerts'} | Malaysia Ez Rent`;
  }, [lang]);

  useEffect(() => {
    if (!loading && !role) router.push('/login');
  }, [loading, role, router]);

  if (loading || !role) return null;

  return <Inbox adminRole={adminRole} onUnreadCountChange={(count) => updateCounts({ unreadInbox: count })} />;
}
