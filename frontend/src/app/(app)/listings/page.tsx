'use client';

import React, { useEffect } from 'react';
import PropertyListings from '@/components/PropertyListings';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';

export default function ListingsPage() {
  const { role, loading } = useAuth();
  const { t } = useApp();
  const router = useRouter();

  useEffect(() => {
    document.title = `${t('navListings')} | Malaysia Ez Rent`;
  }, [t]);

  // Redirect unauthenticated users to guest page
  useEffect(() => {
    if (!loading && !role) {
      router.replace('/guest');
    }
  }, [loading, role, router]);

  if (loading || !role) return null;

  // Admin: read-only mode
  if (role === 'admin') {
    return <PropertyListings readOnly />;
  }

  // Student: full access
  return <PropertyListings />;
}
