'use client';

import React, { useEffect } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminProfilePage() {
  const { lang } = useApp();
  useEffect(() => { document.title = `${lang === 'zh' ? '个人设置' : 'Profile Settings'} | Malaysia Ez Rent`; }, [lang]);
  return <AdminPageWrapper defaultTab="profile" />;
}
