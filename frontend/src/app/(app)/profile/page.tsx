'use client';

import React, { useEffect } from 'react';
import TenantPortal from '@/components/TenantPortal';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { role, loading } = useAuth();
  const { t } = useApp();
  const router = useRouter();

  useEffect(() => {
    document.title = `${t('myProfile')} | Malaysia Ez Rent`;
  }, [t]);

  useEffect(() => {
    if (!loading && !role) router.push('/login');
  }, [loading, role, router]);

  if (loading || !role) return null;

  return <TenantPortal mode="profile" />;
}
