'use client';

import React, { useEffect } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminDashboardPage() {
  const { lang } = useApp();
  useEffect(() => { document.title = `${lang === 'zh' ? '数据看板' : 'Dashboard'} | Malaysia Ez Rent`; }, [lang]);
  return <AdminPageWrapper defaultTab="dashboard" />;
}
