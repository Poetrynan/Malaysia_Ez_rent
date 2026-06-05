'use client';

import React, { useEffect } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminLeasesPage() {
  const { lang } = useApp();
  useEffect(() => { document.title = `${lang === 'zh' ? '租约 & 财务台账' : 'Leases & Finance'} | Malaysia Ez Rent`; }, [lang]);
  return <AdminPageWrapper defaultTab="leases" />;
}
