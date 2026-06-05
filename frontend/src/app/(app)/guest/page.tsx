'use client';

import { useEffect, useState } from 'react';
import PropertyListings from '@/components/PropertyListings';
import LegalContent from '@/components/LegalContent';
import { useApp } from '@/lib/ThemeProvider';
import Link from 'next/link';
import { LogIn, Brain, Shield, Sparkles, ChevronRight, Search, FileText, KeyRound } from 'lucide-react';

const FEATURES = [
  { icon: Brain, zh: 'AI 智能找房', en: 'AI-Powered Search', descZh: '告诉 AI 你的需求，智能推荐最适合的房源和小区', descEn: 'Tell AI your needs, get smart recommendations for the best properties' },
  { icon: Shield, zh: '平台保障', en: 'Secure Platform', descZh: '正规中介认证，租约合同保障，资金安全可追溯', descEn: 'Verified agents, lease contracts, traceable payments' },
  { icon: Sparkles, zh: '一站式服务', en: 'All-in-One Service', descZh: '找房、签约、缴费、报修，全部在线完成', descEn: 'Search, sign, pay, and maintain — all online' },
];

const STEPS = [
  { icon: Search, num: '01', zh: '搜索房源', en: 'Search Properties', descZh: '按位置、房型、预算筛选，或让 AI 帮你推荐', descEn: 'Filter by location, type, budget, or let AI recommend' },
  { icon: FileText, num: '02', zh: '表达意向', en: 'Express Interest', descZh: '登录后收藏心仪房源，一键表达租房意向', descEn: 'Login to save favorites and express your interest' },
  { icon: KeyRound, num: '03', zh: '签约入住', en: 'Sign & Move In', descZh: '中介确认后在线签约，安全便捷完成入住', descEn: 'Agent confirms, sign online, move in securely' },
];

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="glass-card" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: '32px 24px', textAlign: 'center', borderRadius: 16, transform: hover ? 'translateY(-4px)' : 'translateY(0)', transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease', boxShadow: hover ? '0 12px 32px rgba(14,116,144,0.12)' : undefined }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--primary-light, rgba(14,116,144,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
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
    <Link href="/login" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: large ? '14px 38px' : '12px 32px', borderRadius: 12, background: 'var(--primary)', color: 'white', fontSize: large ? '1rem' : '0.92rem', fontWeight: 700, textDecoration: 'none', boxShadow: hover ? '0 6px 24px rgba(14,116,144,0.35)' : '0 4px 16px rgba(14,116,144,0.2)', transform: hover ? 'scale(1.03)' : 'scale(1)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {children}
    </Link>
  );
}

export default function GuestPage() {
  const { lang } = useApp();
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    document.title = `${lang === 'zh' ? '房源浏览' : 'Browse Properties'} | Malaysia Ez Rent`;
  }, [lang]);

  return (
    <div className="guest-mode" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 24px 64px', textAlign: 'center', background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--primary-light, rgba(14,116,144,0.06)) 50%, var(--bg-base) 100%)' }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ width: 280, height: 280, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', border: '2px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(14,116,144,0.12), 0 0 0 6px rgba(14,116,144,0.04)', animation: 'guestLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <img src="/image.png" alt="Malaysia Ez Rent" style={{ width: 250, height: 250, objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 16px', fontFamily: 'var(--font-display)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {lang === 'zh' ? '找到你的理想住所' : 'Find Your Perfect Home'}
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'var(--text-muted)', margin: '0 auto 40px', maxWidth: 560, lineHeight: 1.7 }}>
            {lang === 'zh' ? '浏览马来西亚优质房源，AI 智能推荐，安全可靠的租房体验' : 'Browse quality properties in Malaysia. AI-powered recommendations, secure rental experience.'}
          </p>
          <CtaButton large>
            <LogIn size={18} />{lang === 'zh' ? '立即开始' : 'Get Started'}<ChevronRight size={16} />
          </CtaButton>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section style={{ padding: '64px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={lang === 'zh' ? f.zh : f.en} desc={lang === 'zh' ? f.descZh : f.descEn} />
          ))}
        </div>
      </section>

      {/* ═══════════ 3-STEP PROCESS ═══════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 700, color: 'var(--text-h)', textAlign: 'center', margin: '0 0 40px' }}>
          {lang === 'zh' ? '三步轻松入住' : 'Three Steps to Your New Home'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
              {/* Step number */}
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', opacity: 0.12, position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-display)' }}>
                {s.num}
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-light, rgba(14,116,144,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', position: 'relative' }}>
                <s.icon size={22} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px', position: 'relative' }}>
                {lang === 'zh' ? s.zh : s.en}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, position: 'relative' }}>
                {lang === 'zh' ? s.descZh : s.descEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ LISTINGS ═══════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto', flex: 1 }}>
        <PropertyListings guestMode />
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section style={{ padding: '64px 24px', textAlign: 'center', background: 'linear-gradient(135deg, var(--primary-light, rgba(14,116,144,0.04)) 0%, var(--bg-base) 100%)' }}>
        <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 12px' }}>
          {lang === 'zh' ? '准备好开始了吗？' : 'Ready to Get Started?'}
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: '0 auto 32px', maxWidth: 440, lineHeight: 1.7 }}>
          {lang === 'zh' ? '注册后即可收藏心仪房源、表达租房意向，享受平台全程保障' : 'Register to save favorites, express interest, and enjoy full platform protection.'}
        </p>
        <CtaButton>
          <LogIn size={16} />{lang === 'zh' ? '免费注册' : 'Sign Up Free'}
        </CtaButton>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-base)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            © 2026 Malaysia Ez Rent · {lang === 'zh' ? '大马留学生 AI 智能租房系统' : 'AI-Powered Rental System for Malaysia'}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setLegalModal('terms')} style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              {lang === 'zh' ? '服务条款' : 'Terms of Service'}
            </button>
            <button onClick={() => setLegalModal('privacy')} style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              {lang === 'zh' ? '隐私政策' : 'Privacy Policy'}
            </button>
            <Link href="/calculator" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              {lang === 'zh' ? '费用计算器' : 'Calculator'}
            </Link>
            <Link href="/register-agent" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              {lang === 'zh' ? '申请成为中介' : 'Become an Agent'}
            </Link>
          </div>
        </div>
      </footer>

      {/* Legal modal */}
      {legalModal && <LegalContent type={legalModal} onClose={() => setLegalModal(null)} />}
    </div>
  );
}
