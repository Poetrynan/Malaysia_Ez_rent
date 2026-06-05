'use client';

import React, { useEffect } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminPropertiesPage() {
  const { lang } = useApp();
  useEffect(() => { document.title = `${lang === 'zh' ? '房源管理' : 'Properties'} | Malaysia Ez Rent`; }, [lang]);
  return <AdminPageWrapper defaultTab="properties" />;
}
