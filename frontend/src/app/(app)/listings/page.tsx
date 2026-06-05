'use client';

import React, { useEffect, useState } from 'react';
import PropertyListings from '@/components/PropertyListings';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';

export default function ListingsPage() {
  const { role, loading } = useAuth();
  const { t, lang } = useApp();
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    document.title = `${t('navListings')} | Malaysia Ez Rent`;
  }, [t]);

  // Animate progress bar while loading
  useEffect(() => {
    if (!loading) {
      setProgress(100);
      return;
    }
    // Simulate progress: 0 → 30 → 60 → 85 (stops before 100, completes on finish)
    const t1 = setTimeout(() => setProgress(30), 100);
    const t2 = setTimeout(() => setProgress(60), 400);
    const t3 = setTimeout(() => setProgress(85), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);

  // Redirect based on auth state
  useEffect(() => {
    if (loading) return;
    if (!role) {
      router.replace('/guest');
    } else if (role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [loading, role, router]);

  // Loading: show progress bar while checking identity
  if (loading || !role) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Progress bar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3,
          background: 'var(--glass-border)', zIndex: 9999,
        }}>
          <div style={{
            height: '100%', background: 'var(--primary)',
            width: `${progress}%`,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 8px var(--primary)',
            borderRadius: '0 2px 2px 0',
          }} />
        </div>
        {/* Text below */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {lang === 'zh' ? '身份校验中...' : 'Verifying identity...'}
          </div>
        </div>
      </div>
    );
  }

  // Student: full access
  return <PropertyListings />;
}
