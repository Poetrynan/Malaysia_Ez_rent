'use client';

import React, { useEffect } from 'react';
import PropertyListings from '@/components/PropertyListings';
import { useApp } from '@/lib/ThemeProvider';

export default function AdminListingsPage() {
  const { lang } = useApp();
  useEffect(() => { document.title = `${lang === 'zh' ? '房源浏览' : 'Browse Listings'} | Malaysia Ez Rent`; }, [lang]);
  return <PropertyListings readOnly />;
}
