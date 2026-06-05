'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/listings');
    }
  }, [loading, role, router]);

  if (loading) return null;
  if (role !== 'admin') return null;

  return <>{children}</>;
}
