'use client';

import React, { useEffect } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminAdminsPage() {
  const { lang } = useApp();
  useEffect(() => { document.title = `${lang === 'zh' ? '中介与管理员' : 'Agents & Admins'} | Malaysia Ez Rent`; }, [lang]);
  return <AdminPageWrapper defaultTab="admins" superAdminOnly />;
}
