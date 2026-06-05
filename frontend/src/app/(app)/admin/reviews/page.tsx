'use client';

import React, { useEffect } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminReviewsPage() {
  const { lang } = useApp();
  useEffect(() => { document.title = `${lang === 'zh' ? '评论管理' : 'Reviews'} | Malaysia Ez Rent`; }, [lang]);
  return <AdminPageWrapper defaultTab="reviews" superAdminOnly />;
}
