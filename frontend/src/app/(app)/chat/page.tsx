'use client';

import React, { useEffect } from 'react';
import AIChat from '@/components/AIChat';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const { role, loading } = useAuth();
  const { t } = useApp();
  const router = useRouter();

  useEffect(() => {
    document.title = `${t('navAI')} | Malaysia Ez Rent`;
  }, [t]);

  useEffect(() => {
    if (!loading && !role) router.push('/login');
  }, [loading, role, router]);

  if (loading || !role) return null;

  return <AIChat />;
}
