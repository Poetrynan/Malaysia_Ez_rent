'use client';

import React, { useEffect } from 'react';
import PropertyListings from '@/components/PropertyListings';
import { useApp } from '@/lib/ThemeProvider';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

export default function GuestPage() {
  const { lang } = useApp();

  useEffect(() => {
    document.title = `${lang === 'zh' ? '房源浏览' : 'Browse Properties'} | Malaysia Ez Rent`;
  }, [lang]);

  return (
    <div className="guest-mode">
      {/* Hero Section — centered logo */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 16px 20px', textAlign: 'center',
      }}>
        <img
          src="/image.png"
          alt="Malaysia Ez Rent"
          style={{
            width: 180, height: 180, objectFit: 'contain',
            marginBottom: 14, filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.1))',
          }}
        />
        <h1 style={{
          fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 700,
          color: 'var(--text-h)', margin: '0 0 6px',
          fontFamily: 'var(--font-display)',
        }}>
          {lang === 'zh' ? '找到你的理想住所' : 'Find Your Perfect Home'}
        </h1>
        <p style={{
          fontSize: '0.88rem', color: 'var(--text-muted)',
          margin: '0 0 16px', maxWidth: 480, lineHeight: 1.6,
        }}>
          {lang === 'zh'
            ? '浏览马来西亚优质房源，AI 智能推荐，安全可靠的租房体验'
            : 'Browse quality properties in Malaysia. AI-powered recommendations, secure rental experience.'}
        </p>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 20px', borderRadius: 8,
          background: 'var(--primary)', color: 'white',
          fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
        }}>
          <LogIn size={15} />
          {lang === 'zh' ? '登录后享受完整功能' : 'Login for Full Access'}
        </Link>
      </div>

      {/* Listings — guest mode */}
      <PropertyListings guestMode />
    </div>
  );
}
