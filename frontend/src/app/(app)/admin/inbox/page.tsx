'use client';

import React, { useEffect } from 'react';
import Inbox from '@/components/Inbox';
import { useAuth } from '@/lib/AuthContext';
import { usePendingCounts } from '@/lib/PendingCountsContext';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminInboxPage() {
  const { adminRole } = useAuth();
  const { updateCounts } = usePendingCounts();
  const { lang } = useApp();

  useEffect(() => {
    document.title = `${lang === 'zh' ? '消息与公告' : 'Inbox & Announcements'} | Malaysia Ez Rent`;
  }, [lang]);

  return <Inbox adminRole={adminRole} onUnreadCountChange={(count) => updateCounts({ unreadInbox: count })} />;
}
