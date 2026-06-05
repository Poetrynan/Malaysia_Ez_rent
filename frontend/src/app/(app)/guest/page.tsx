'use client';

import { useEffect, useState } from 'react';
import PropertyListings from '@/components/PropertyListings';
import { useApp } from '@/lib/ThemeProvider';
import Link from 'next/link';
import { LogIn, Brain, Shield, Sparkles, ChevronRight } from 'lucide-react';

const FEATURES = [
  { icon: Brain, zh: 'AI 智能找房', en: 'AI-Powered Search', descZh: '告诉 AI 你的需求，智能推荐最适合的房源和小区', descEn: 'Tell AI your needs, get smart recommendations for the best properties' },
  { icon: Shield, zh: '平台保障', en: 'Secure Platform', descZh: '正规中介认证，租约合同保障，资金安全可追溯', descEn: 'Verified agents, lease contracts, traceable payments' },
  { icon: Sparkles, zh: '一站式服务', en: 'All-in-One Service', descZh: '找房、签约、缴费、报修，全部在线完成', descEn: 'Search, sign, pay, and maintain — all online' },
];

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="glass-card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '32px 24px', textAlign: 'center', borderRadius: 16,
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
        boxShadow: hover ? '0 12px 32px rgba(14,116,144,0.12)' : undefined,
      }}
    >
      <div style={{
        width: 60, height: 60, borderRadius: 16,
        background: 'var(--primary-light, rgba(14,116,144,0.08))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
        transition: 'background 0.25s ease',
      }}>
        <Icon size={28} style={{ color: 'var(--primary)' }} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

function CtaButton({ children, large }: { children: React.ReactNode; large?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href="/login"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: large ? '14px 38px' : '12px 32px', borderRadius: 12,
        background: 'var(--primary)', color: 'white',
        fontSize: large ? '1rem' : '0.92rem', fontWeight: 700, textDecoration: 'none',
        boxShadow: hover ? '0 6px 24px rgba(14,116,144,0.35)' : '0 4px 16px rgba(14,116,144,0.2)',
        transform: hover ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </Link>
  );
}

export default function GuestPage() {
  const { lang } = useApp();

  useEffect(() => {
    document.title = `${lang === 'zh' ? '房源浏览' : 'Browse Properties'} | Malaysia Ez Rent`;
  }, [lang]);

  return (
    <div className="guest-mode" style={{ minHeight: '100vh' }}>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '80px 24px 64px', textAlign: 'center',
        background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--primary-light, rgba(14,116,144,0.06)) 50%, var(--bg-base) 100%)',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -120, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          {/* Logo — circular badge with entrance animation */}
          <div style={{
            width: 280, height: 280, borderRadius: '50%', overflow: 'hidden',
            margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--glass-bg)', border: '2px solid var(--glass-border)',
            boxShadow: '0 8px 32px rgba(14,116,144,0.12), 0 0 0 6px rgba(14,116,144,0.04)',
            animation: 'guestLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}>
            <img src="/image.png" alt="Malaysia Ez Rent"
              style={{ width: 250, height: 250, objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800,
            color: 'var(--text-h)', margin: '0 0 16px',
            fontFamily: 'var(--font-display)', lineHeight: 1.2, letterSpacing: '-0.02em',
          }}>
            {lang === 'zh' ? '找到你的理想住所' : 'Find Your Perfect Home'}
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'var(--text-muted)',
            margin: '0 auto 40px', maxWidth: 560, lineHeight: 1.7,
          }}>
            {lang === 'zh'
              ? '浏览马来西亚优质房源，AI 智能推荐，安全可靠的租房体验'
              : 'Browse quality properties in Malaysia. AI-powered recommendations, secure rental experience.'}
          </p>

          <CtaButton large>
            <LogIn size={18} />
            {lang === 'zh' ? '立即开始' : 'Get Started'}
            <ChevronRight size={16} />
          </CtaButton>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section style={{ padding: '64px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard
              key={i}
              icon={f.icon}
              title={lang === 'zh' ? f.zh : f.en}
              desc={lang === 'zh' ? f.descZh : f.descEn}
            />
          ))}
        </div>
      </section>

      {/* ═══════════ LISTINGS ═══════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <PropertyListings guestMode />
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section style={{
        padding: '64px 24px', textAlign: 'center',
        background: 'linear-gradient(135deg, var(--primary-light, rgba(14,116,144,0.04)) 0%, var(--bg-base) 100%)',
      }}>
        <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 12px' }}>
          {lang === 'zh' ? '准备好开始了吗？' : 'Ready to Get Started?'}
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: '0 auto 32px', maxWidth: 440, lineHeight: 1.7 }}>
          {lang === 'zh'
            ? '注册后即可收藏心仪房源、表达租房意向，享受平台全程保障'
            : 'Register to save favorites, express interest, and enjoy full platform protection.'}
        </p>
        <CtaButton>
          <LogIn size={16} />
          {lang === 'zh' ? '免费注册' : 'Sign Up Free'}
        </CtaButton>
      </section>
    </div>
  );
}
