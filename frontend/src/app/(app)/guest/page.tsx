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

  return (
    <div className="guest-mode" style={{ minHeight: '100vh' }}>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '80px 24px 60px', textAlign: 'center',
        background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--primary-light, rgba(14,116,144,0.06)) 50%, var(--bg-base) 100%)',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: -120, right: -80, width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -60, width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          {/* Logo — blend white background into page */}
          <img
            src="/image.png"
            alt="Malaysia Ez Rent"
            style={{
              width: 260, height: 260, objectFit: 'contain',
              margin: '0 auto 32px', display: 'block',
              mixBlendMode: 'multiply',
            }}
          />

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800,
            color: 'var(--text-h)', margin: '0 0 16px',
            fontFamily: 'var(--font-display)', lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}>
            {lang === 'zh' ? '找到你的理想住所' : 'Find Your Perfect Home'}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'var(--text-muted)',
            margin: '0 auto 40px', maxWidth: 560, lineHeight: 1.7,
          }}>
            {lang === 'zh'
              ? '浏览马来西亚优质房源，AI 智能推荐，安全可靠的租房体验'
              : 'Browse quality properties in Malaysia. AI-powered recommendations, secure rental experience.'}
          </p>

          {/* CTA Button */}
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 36px', borderRadius: 12,
            background: 'var(--primary)', color: 'white',
            fontSize: '1rem', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(14,116,144,0.3)',
            transition: 'all 0.3s ease',
          }}>
            <LogIn size={18} />
            {lang === 'zh' ? '立即开始' : 'Get Started'}
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section style={{
        padding: '60px 24px', maxWidth: 1000, margin: '0 auto',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
        }}>
          {[
            {
              icon: <Brain size={28} style={{ color: 'var(--primary)' }} />,
              title: lang === 'zh' ? 'AI 智能找房' : 'AI-Powered Search',
              desc: lang === 'zh'
                ? '告诉 AI 你的需求，智能推荐最适合的房源和小区'
                : 'Tell AI your needs, get smart recommendations for the best properties',
            },
            {
              icon: <Shield size={28} style={{ color: 'var(--primary)' }} />,
              title: lang === 'zh' ? '平台保障' : 'Secure Platform',
              desc: lang === 'zh'
                ? '正规中介认证，租约合同保障，资金安全可追溯'
                : 'Verified agents, lease contracts, traceable payments',
            },
            {
              icon: <Sparkles size={28} style={{ color: 'var(--primary)' }} />,
              title: lang === 'zh' ? '一站式服务' : 'All-in-One Service',
              desc: lang === 'zh'
                ? '找房、签约、缴费、报修，全部在线完成'
                : 'Search, sign, pay, and maintain — all online',
            },
          ].map((f, i) => (
            <div key={i} className="glass-card" style={{
              padding: '28px 24px', textAlign: 'center',
              borderRadius: 16, transition: 'transform 0.2s ease',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'var(--primary-light, rgba(14,116,144,0.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                {f.icon}
              </div>
              <h3 style={{
                fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-h)',
                margin: '0 0 8px',
              }}>{f.title}</h3>
              <p style={{
                fontSize: '0.88rem', color: 'var(--text-muted)',
                margin: 0, lineHeight: 1.6,
              }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ LISTINGS ═══════════ */}
      <section style={{ padding: '0 24px 60px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 700,
            color: 'var(--text-h)', margin: '0 0 4px',
          }}>
            {lang === 'zh' ? '热门房源' : 'Featured Properties'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
            {lang === 'zh' ? '浏览所有可租房源，登录后可收藏和表达意向' : 'Browse all available properties. Login to save favorites and express interest.'}
          </p>
        </div>

        <PropertyListings guestMode />
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section style={{
        padding: '60px 24px', textAlign: 'center',
        background: 'linear-gradient(135deg, var(--primary-light, rgba(14,116,144,0.04)) 0%, var(--bg-base) 100%)',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 700,
          color: 'var(--text-h)', margin: '0 0 12px',
        }}>
          {lang === 'zh' ? '准备好开始了吗？' : 'Ready to Get Started?'}
        </h2>
        <p style={{
          fontSize: '0.95rem', color: 'var(--text-muted)',
          margin: '0 auto 28px', maxWidth: 440,
        }}>
          {lang === 'zh'
            ? '注册后即可收藏心仪房源、表达租房意向，享受平台全程保障'
            : 'Register to save favorites, express interest, and enjoy full platform protection.'}
        </p>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 32px', borderRadius: 10,
          background: 'var(--primary)', color: 'white',
          fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(14,116,144,0.25)',
        }}>
          <LogIn size={16} />
          {lang === 'zh' ? '免费注册' : 'Sign Up Free'}
        </Link>
      </section>
    </div>
  );
}
