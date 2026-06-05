'use client';

import { useEffect } from 'react';
import PropertyListings from '@/components/PropertyListings';
import { useApp } from '@/lib/ThemeProvider';
import Link from 'next/link';
import { LogIn, Brain, Shield, Sparkles, ChevronRight } from 'lucide-react';

export default function GuestPage() {
  const { lang } = useApp();

  useEffect(() => {
    document.title = `${lang === 'zh' ? '房源浏览' : 'Browse Properties'} | Malaysia Ez Rent`;
  }, [lang]);

  const features = [
    { icon: <Brain size={24} />, title: lang === 'zh' ? 'AI 智能找房' : 'AI-Powered Search', desc: lang === 'zh' ? '告诉 AI 你的需求，智能推荐最适合的房源' : 'Tell AI your needs, get smart recommendations' },
    { icon: <Shield size={24} />, title: lang === 'zh' ? '平台保障' : 'Secure Platform', desc: lang === 'zh' ? '正规中介认证，租约合同保障，资金安全' : 'Verified agents, lease contracts, secure payments' },
    { icon: <Sparkles size={24} />, title: lang === 'zh' ? '一站式服务' : 'All-in-One', desc: lang === 'zh' ? '找房、签约、缴费、报修，全部在线完成' : 'Search, sign, pay, maintain — all online' },
  ];

  return (
    <div className="guest-mode" style={{ minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ padding: '72px 24px 56px', textAlign: 'center' }}>
        <img src="/image.png" alt="Malaysia Ez Rent"
          style={{ width: 220, height: 220, objectFit: 'contain', margin: '0 auto 28px', display: 'block' }} />
        <h1 style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800,
          color: 'var(--text-h)', margin: '0 0 12px', fontFamily: 'var(--font-display)', lineHeight: 1.2,
        }}>
          {lang === 'zh' ? '找到你的理想住所' : 'Find Your Perfect Home'}
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: '0 auto 32px', maxWidth: 520, lineHeight: 1.7 }}>
          {lang === 'zh' ? '浏览马来西亚优质房源，AI 智能推荐，安全可靠的租房体验' : 'Browse quality properties in Malaysia. AI-powered, secure rental experience.'}
        </p>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 32px', borderRadius: 10, background: 'var(--primary)', color: 'white',
          fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none',
        }}>
          <LogIn size={16} />{lang === 'zh' ? '立即开始' : 'Get Started'}<ChevronRight size={15} />
        </Link>
      </section>

      {/* Features */}
      <section style={{ padding: '0 24px 56px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} className="glass-card" style={{ padding: '24px 20px', textAlign: 'center', borderRadius: 14 }}>
              <div style={{ color: 'var(--primary)', marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>{f.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section style={{ padding: '0 24px 56px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 4px' }}>
          {lang === 'zh' ? '热门房源' : 'Featured Properties'}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
          {lang === 'zh' ? '登录后可收藏和表达租房意向' : 'Login to save favorites and express interest'}
        </p>
        <PropertyListings guestMode />
      </section>

      {/* Bottom CTA */}
      <section style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 8px' }}>
          {lang === 'zh' ? '准备好开始了吗？' : 'Ready to Get Started?'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 auto 24px', maxWidth: 400 }}>
          {lang === 'zh' ? '注册后即可收藏房源、表达意向，享受平台保障' : 'Register to save favorites and enjoy platform protection.'}
        </p>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 28px', borderRadius: 10, background: 'var(--primary)', color: 'white',
          fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none',
        }}>
          <LogIn size={15} />{lang === 'zh' ? '免费注册' : 'Sign Up Free'}
        </Link>
      </section>
    </div>
  );
}
