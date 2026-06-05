'use client';

import React, { useEffect } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminAgentReviewsPage() {
  const { lang } = useApp();
  useEffect(() => { document.title = `${lang === 'zh' ? '中介审核' : 'Agent Reviews'} | Malaysia Ez Rent`; }, [lang]);
  return <AdminPageWrapper defaultTab="agent-reviews" superAdminOnly />;
}
