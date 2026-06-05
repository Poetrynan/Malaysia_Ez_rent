'use client';

import React, { useEffect } from 'react';
import TenantPortal from '@/components/TenantPortal';
import { useAuth } from '@/lib/AuthContext';
import { usePendingCounts } from '@/lib/PendingCountsContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';

export default function MyLeasePage() {
  const { role, loading } = useAuth();
  const { updateCounts } = usePendingCounts();
  const { t } = useApp();
  const router = useRouter();

  useEffect(() => {
    document.title = `${t('navPortal')} | Malaysia Ez Rent`;
  }, [t]);

  useEffect(() => {
    if (!loading && !role) router.push('/login');
  }, [loading, role, router]);

  if (loading || !role) return null;

  return <TenantPortal mode="lease" onUnreadFeedbackCountChange={(count) => updateCounts({ feedback: count })} />;
}
