'use client';

import React, { useEffect } from 'react';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminFeedbackPage() {
  const { t } = useApp();
  useEffect(() => { document.title = `${t('feedback')} | Malaysia Ez Rent`; }, [t]);
  return <AdminPageWrapper defaultTab="feedback" />;
}
