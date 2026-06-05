'use client';

import React, { useEffect } from 'react';
import PropertyListings from '@/components/PropertyListings';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import Link from 'next/link';

export default function ListingsPage() {
  const { role } = useAuth();
  const { t, lang } = useApp();

  useEffect(() => {
    document.title = `${t('navListings')} | Malaysia Ez Rent`;
  }, [t]);

  // Unauthenticated or admin: read-only mode
  if (role === null || role === 'admin') {
    return (
      <>
        {role === null && (
          <div style={{
            margin: '12px 16px 0', padding: '12px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.03))',
            border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>
              {lang === 'zh' ? '🔒 登录后即可收藏房源、表达租房意向，享受平台保障' : '🔒 Login to save favorites, express interest, and enjoy platform protection'}
            </span>
            <Link href="/login" style={{
              padding: '6px 16px', borderRadius: 6, background: 'var(--primary)', color: 'white',
              fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              {lang === 'zh' ? '立即登录' : 'Login'}
            </Link>
          </div>
        )}
        <PropertyListings readOnly />
      </>
    );
  }

  return <PropertyListings />;
}
