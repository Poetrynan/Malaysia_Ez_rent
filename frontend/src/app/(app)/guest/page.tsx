'use client';

import { useEffect, useRef, useState } from 'react';
import PropertyListings from '@/components/PropertyListings';
import LegalContent from '@/components/LegalContent';
import { useApp } from '@/lib/ThemeProvider';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { LogIn, Brain, Sparkles, ChevronRight, Search, FileText, KeyRound, Globe, ArrowRight, ShieldCheck, Camera, BadgeDollarSign, RefreshCw, Star, Quote } from 'lucide-react';

const FEATURES = [
  { icon: Brain, zh: 'AI 智能找房', en: 'AI-Powered Search', descZh: '告诉 AI 你的需求，智能推荐最适合的房源和小区', descEn: 'Tell AI your needs, get smart recommendations for the best properties' },
  { icon: ShieldCheck, zh: '平台保障', en: 'Secure Platform', descZh: '正规中介认证，租约合同保障，资金安全可追溯', descEn: 'Verified agents, lease contracts, traceable payments' },
  { icon: Sparkles, zh: '一站式服务', en: 'All-in-One Service', descZh: '找房、签约、缴费、报修，全部在线完成', descEn: 'Search, sign, pay, and maintain — all online' },
];

const STEPS = [
  { icon: Search, num: '01', zh: '搜索房源', en: 'Search Properties', descZh: '按位置、房型、预算筛选，或让 AI 帮你推荐', descEn: 'Filter by location, type, budget, or let AI recommend' },
  { icon: FileText, num: '02', zh: '表达意向', en: 'Express Interest', descZh: '登录后收藏心仪房源，一键表达租房意向', descEn: 'Login to save favorites and express your interest' },
  { icon: KeyRound, num: '03', zh: '签约入住', en: 'Sign & Move In', descZh: '中介确认后在线签约，安全便捷完成入住', descEn: 'Agent confirms, sign online, move in securely' },
];

// Multilingual "hello" words with artistic styling
const HELLO_WORDS = [
  { word: 'こんにちは', x: '8%', y: '15%', rotate: -12, size: '1.4rem', font: 'serif', delay: 1.0 },
  { word: '你好', x: '5%', y: '55%', rotate: 8, size: '1.8rem', font: 'var(--font-display)', delay: 1.4 },
  { word: 'Hola', x: '85%', y: '20%', rotate: -6, size: '1.6rem', font: 'italic', delay: 1.2 },
  { word: '안녕하세요', x: '82%', y: '60%', rotate: 10, size: '1.2rem', font: 'sans-serif', delay: 1.6 },
  { word: 'Bonjour', x: '10%', y: '78%', rotate: -4, size: '1.3rem', font: 'italic', delay: 1.8 },
  { word: 'مرحبا', x: '88%', y: '40%', rotate: 5, size: '1.5rem', font: 'serif', delay: 1.1 },
  { word: 'नमस्ते', x: '3%', y: '38%', rotate: -8, size: '1.1rem', font: 'sans-serif', delay: 1.5 },
  { word: 'Selamat Datang', x: '78%', y: '80%', rotate: -3, size: '1rem', font: 'var(--font-display)', delay: 2.0 },
  { word: 'สวัสดี', x: '90%', y: '10%', rotate: 7, size: '1.3rem', font: 'sans-serif', delay: 1.3 },
  { word: 'Ciao', x: '12%', y: '92%', rotate: -10, size: '1.5rem', font: 'italic', delay: 1.7 },
  { word: 'Hallo', x: '72%', y: '12%', rotate: -5, size: '1.3rem', font: 'sans-serif', delay: 1.15 },
  { word: 'Xin chào', x: '18%', y: '45%', rotate: 6, size: '1.2rem', font: 'sans-serif', delay: 1.35 },
  { word: 'Kamusta', x: '92%', y: '72%', rotate: -8, size: '1.1rem', font: 'sans-serif', delay: 1.55 },
  { word: 'வணக்கம்', x: '6%', y: '68%', rotate: 4, size: '1.2rem', font: 'serif', delay: 1.45 },
  { word: 'Γεια σας', x: '75%', y: '48%', rotate: -7, size: '1.1rem', font: 'serif', delay: 1.65 },
  { word: 'Привет', x: '20%', y: '25%', rotate: 9, size: '1.3rem', font: 'sans-serif', delay: 1.75 },
  { word: 'Olá', x: '68%', y: '88%', rotate: -3, size: '1.5rem', font: 'italic', delay: 1.85 },
  { word: 'Habari', x: '95%', y: '55%', rotate: 5, size: '1.1rem', font: 'sans-serif', delay: 1.95 },
];

// Reveals children with a subtle slide-up the first time they scroll into view
function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal${visible ? ' is-visible' : ''}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
      <span className="guest-eyebrow">{children}</span>
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

function FooterLink({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  const style = { fontSize: '0.8rem', color: hover ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0, background: 'none', border: 'none', textDecoration: 'none', transition: 'color 0.2s ease' };
  if (href) return <Link href={href} style={style} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>{children}</Link>;
  return <button onClick={onClick} style={style} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>{children}</button>;
}

export default function GuestPage() {
  const { lang, setLang } = useApp();
  const { role } = useAuth();
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    document.title = `${lang === 'zh' ? '房源浏览' : 'Browse Properties'} | Malaysia Ez Rent`;
    // Trigger hero slide-up after a short delay
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, [lang]);

  return (
    <div className="guest-mode" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ═══════════ LANGUAGE TOGGLE (top-right floating) ═══════════ */}
      <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        style={{ position: 'fixed', top: 20, right: 24, zIndex: 100, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-h)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'all 0.2s ease' }}>
        <Globe size={14} />{lang === 'zh' ? 'EN' : '中文'}
      </button>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{ position: 'relative', padding: '120px 24px 64px', textAlign: 'center', background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--primary-light, rgba(14,116,144,0.06)) 50%, var(--bg-base) 100%)' }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -120, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Floating multilingual "hello" words */}
        {HELLO_WORDS.map((h, i) => (
          <div key={i} style={{
            position: 'absolute', left: h.x, top: h.y,
            transform: `rotate(${h.rotate}deg)`,
            fontSize: h.size, fontWeight: 300, fontFamily: h.font,
            color: 'var(--primary)', opacity: heroVisible ? 0.7 : 0,
            animation: heroVisible ? `helloFloatIn 1s ${h.delay}s cubic-bezier(0.16, 1, 0.3, 1) both` : 'none',
            pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '0.02em',
          }}>
            {h.word}
          </div>
        ))}

        {/* Hero content — slides up from bottom */}
        <div style={{
          position: 'relative', maxWidth: 800, margin: '0 auto', zIndex: 1,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(60px)',
          transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Logo */}
          <div style={{ width: 280, height: 280, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', border: '2px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(14,116,144,0.12), 0 0 0 6px rgba(14,116,144,0.04)' }}>
            <img src="/image.png" alt="Malaysia Ez Rent" style={{ width: '110%', height: '110%', objectFit: 'cover', mixBlendMode: 'multiply' }} />
          </div>
          {/* Brand name — flag stripes simulated purely with CSS text gradient */}
          <div className="flag-wordmark" style={{ fontSize: 'clamp(2rem, 7vw, 3.6rem)', lineHeight: 1.12, margin: '0 auto 8px' }}>
            Malaysia Ez Rent
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 20px', letterSpacing: '0.08em', fontWeight: 500 }}>
            {lang === 'zh' ? '大马留学生 AI 智能租房系统' : 'AI-Powered Rental System for Malaysia'}
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 14px', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
            {lang === 'zh' ? '找到你的理想住所' : 'Find Your Perfect Home'}
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'var(--text-muted)', margin: '0 auto 28px', maxWidth: 560, lineHeight: 1.7 }}>
            {lang === 'zh' ? '浏览马来西亚优质房源，AI 智能推荐，安全可靠的租房体验' : 'Browse quality properties in Malaysia. AI-powered recommendations, secure rental experience.'}
          </p>
          {/* Trust pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
            {[
              { Icon: ShieldCheck, zh: '实名认证中介', en: 'Verified Agents' },
              { Icon: Camera, zh: '真实房源照片', en: 'Real Photos' },
              { Icon: BadgeDollarSign, zh: '资金安全可追溯', en: 'Secure Payments' },
            ].map((p, i) => (
              <span key={i} className="guest-trust-pill">
                <p.Icon size={14} style={{ color: 'var(--primary)' }} />
                {lang === 'zh' ? p.zh : p.en}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            {role ? (
              <Link href={role === 'admin' ? '/admin/properties' : '/listings'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 38px', borderRadius: 12, background: 'var(--primary)', color: 'white', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(14,116,144,0.2)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <ArrowRight size={18} />{lang === 'zh' ? '进入系统' : 'Enter System'}
              </Link>
            ) : (
              <CtaButton large>
                <LogIn size={18} />{lang === 'zh' ? '立即开始' : 'Get Started'}<ChevronRight size={16} />
              </CtaButton>
            )}
            <a href="#listings" className="guest-ghost-btn">
              <Search size={16} />{lang === 'zh' ? '浏览房源' : 'Browse Listings'}
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section style={{ padding: '72px 24px', maxWidth: 1040, margin: '0 auto' }}>
        <Reveal>
          <Eyebrow>{lang === 'zh' ? '平台优势' : 'Features'}</Eyebrow>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 700, color: 'var(--text-h)', textAlign: 'center', margin: '0 0 36px' }}>
            {lang === 'zh' ? '为什么选择我们' : 'Why Choose Us'}
          </h2>
        </Reveal>
        <div className="guest-grid" style={{ marginBottom: 64 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={i} delay={i * 90}>
              <div className="glass-card" style={{ padding: '28px 22px', textAlign: 'center', borderRadius: 16, height: '100%' }}>
                <div className="guest-feature-icon">
                  <f.icon size={24} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 8px' }}>{lang === 'zh' ? f.zh : f.en}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{lang === 'zh' ? f.descZh : f.descEn}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <Eyebrow>{lang === 'zh' ? '快速上手' : 'How It Works'}</Eyebrow>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 700, color: 'var(--text-h)', textAlign: 'center', margin: '0 0 36px' }}>
            {lang === 'zh' ? '三步轻松入住' : 'Three Steps to Your New Home'}
          </h2>
        </Reveal>
        <div className="guest-grid">
          {STEPS.map((s, i) => (
            <Reveal key={i} delay={i * 90}>
              <div className="glass-card" style={{ padding: '28px 22px', textAlign: 'center', borderRadius: 16, position: 'relative', height: '100%' }}>
                <div style={{ position: 'absolute', top: 14, right: 16, fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', opacity: 0.14, lineHeight: 1, fontFamily: 'var(--font-display)' }}>{s.num}</div>
                <div className="guest-feature-icon">
                  <s.icon size={24} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 8px' }}>{lang === 'zh' ? s.zh : s.en}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{lang === 'zh' ? s.descZh : s.descEn}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════ LISTINGS ═══════════ */}
      <section id="listings" style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto', flex: 1, scrollMarginTop: 80 }}>
        <PropertyListings guestMode />
      </section>

      {/* ═══════════ TRUST ═══════════ */}
      <section style={{ padding: '72px 24px', background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--primary-light, rgba(14,116,144,0.04)) 50%, var(--bg-base) 100%)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <Eyebrow>{lang === 'zh' ? '真实可信' : 'Trust & Safety'}</Eyebrow>
            <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 10px' }}>
              {lang === 'zh' ? '告别假房源，每一套都真实' : 'No Fake Listings. Every Property is Verified.'}
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', margin: '0 auto 44px', maxWidth: 600, lineHeight: 1.7 }}>
              {lang === 'zh' ? '其他平台上 30%–40% 是重复或虚假的"幽灵房源"。我们从源头杜绝这个问题。' : 'Up to 30-40% of listings on other platforms are duplicate or ghost listings. We eliminate this from the source.'}
            </p>
          </Reveal>
          <div className="guest-grid-4">
            {[
              { Icon: ShieldCheck, title: { zh: '实名认证中介', en: 'Verified Agents' }, desc: { zh: '每位中介都经过 REN 牌照核验，身份可追溯', en: 'Every agent is verified with REN license, fully traceable' } },
              { Icon: Camera, title: { zh: '真实房源照片', en: 'Real Photos Only' }, desc: { zh: '照片来自中介实拍，不存在"照骗"和 AI 生成图', en: 'Photos taken by agents on-site, no AI-generated fakes' } },
              { Icon: BadgeDollarSign, title: { zh: '透明定价', en: 'Transparent Pricing' }, desc: { zh: '同一房源不会出现十几个不同价格，标价即实价', en: 'No price manipulation — what you see is what you pay' } },
              { Icon: RefreshCw, title: { zh: '房源实时更新', en: 'Real-Time Listings' }, desc: { zh: '中介更新房源后即时反映，价格、状态始终最新', en: 'Listings update instantly when agents make changes — always current' } },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="glass-card" style={{ padding: '26px 18px', borderRadius: 16, textAlign: 'center', height: '100%' }}>
                  <div className="guest-feature-icon" style={{ width: 46, height: 46 }}>
                    <item.Icon size={22} />
                  </div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>{lang === 'zh' ? item.title.zh : item.title.en}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{lang === 'zh' ? item.desc.zh : item.desc.en}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section style={{ padding: '72px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <Eyebrow>{lang === 'zh' ? '用户口碑' : 'Testimonials'}</Eyebrow>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 700, color: 'var(--text-h)', textAlign: 'center', margin: '0 0 40px' }}>
            {lang === 'zh' ? '他们已经找到了理想的家' : 'They Already Found Their Home'}
          </h2>
        </Reveal>
        <div className="guest-grid">
          {[
            { quote: { zh: '从开始找房到签约只用了三天，整个流程比我想象中顺畅太多。', en: 'From searching to signing took only three days. The whole process was way smoother than I expected.' }, name: 'Li Wei', role: { zh: 'Monash 大学生', en: 'Monash University Student' }, img: 11 },
            { quote: { zh: '终于不用在 WhatsApp 群里翻中介消息了，所有东西都在一个平台上搞定。', en: "No more digging through WhatsApp messages from agents. Everything is on one platform." }, name: 'Sarah Tan', role: { zh: 'Taylor\'s 大学生', en: "Taylor's University Student" }, img: 5 },
            { quote: { zh: '最让我放心的是资金安全，每笔付款都有记录，不怕被骗。', en: "What impressed me most is payment security. Every transaction is tracked, no fear of scams." }, name: 'Ahmad Faizal', role: { zh: 'UPM 大学生', en: 'UPM University Student' }, img: 12 },
            { quote: { zh: '中介回复很快，房源信息也很真实，不像其他平台图片和实际差太多。', en: 'Agent responded quickly, property info was accurate — nothing like other platforms where photos mislead.' }, name: 'Chen Yuki', role: { zh: 'Sunway 大学生', en: 'Sunway University Student' }, img: 9 },
            { quote: { zh: '合租找室友太方便了，直接在平台上看到谁也在找同一个房子。', en: 'Finding roommates for co-renting is so easy. I could see who else was looking at the same place.' }, name: 'Priya Nair', role: { zh: 'INTI 大学生', en: 'INTI University Student' }, img: 16 },
            { quote: { zh: '作为一个新生，不用到马来西亚就能提前看好房子，省了太多时间。', en: "As a newcomer, being able to browse properties before arriving in Malaysia saved me so much time." }, name: 'Kim Joon-ho', role: { zh: 'UCSI 大学生', en: 'UCSI University Student' }, img: 7 },
          ].map((t, i) => (
            <Reveal key={i} delay={(i % 3) * 90}>
              <div className="glass-card" style={{ padding: '24px', borderRadius: 16, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <Quote size={32} style={{ color: 'var(--primary)', opacity: 0.16, position: 'absolute', top: 16, right: 18 }} />
                <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={14} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />
                  ))}
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-body)', lineHeight: 1.7, margin: '0 0 18px', flex: 1 }}>
                  &ldquo;{lang === 'zh' ? t.quote.zh : t.quote.en}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
                  <img src={`https://i.pravatar.cc/80?img=${t.img}`} alt={t.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--glass-border)' }} />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-h)' }}>{t.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? t.role.zh : t.role.en}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section style={{ padding: '72px 24px 80px' }}>
        <Reveal style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="guest-cta-card">
            <Sparkles size={28} style={{ color: 'var(--primary)', marginBottom: 14 }} />
            <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 12px' }}>
              {role ? (lang === 'zh' ? '欢迎回来！' : 'Welcome Back!') : (lang === 'zh' ? '准备好开始了吗？' : 'Ready to Get Started?')}
            </h2>
            <p style={{ fontSize: '0.96rem', color: 'var(--text-muted)', margin: '0 auto 30px', maxWidth: 460, lineHeight: 1.7 }}>
              {role
                ? (lang === 'zh' ? '点击进入系统，继续管理您的租房事务' : 'Enter the system to continue managing your rental.')
                : (lang === 'zh' ? '注册后即可收藏心仪房源、表达租房意向，享受平台全程保障' : 'Register to save favorites, express interest, and enjoy full platform protection.')}
            </p>
            {role ? (
              <Link href={role === 'admin' ? '/admin/properties' : '/listings'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 38px', borderRadius: 12, background: 'var(--primary)', color: 'white', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 20px var(--primary-glow)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <ArrowRight size={18} />{lang === 'zh' ? '进入系统' : 'Enter System'}
              </Link>
            ) : (
              <CtaButton large>
                <LogIn size={18} />{lang === 'zh' ? '免费注册' : 'Sign Up Free'}<ChevronRight size={16} />
              </CtaButton>
            )}
          </div>
        </Reveal>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-base)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            © 2026 Malaysia Ez Rent · {lang === 'zh' ? '大马留学生 AI 智能租房系统' : 'AI-Powered Rental System for Malaysia'}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <FooterLink onClick={() => setLegalModal('terms')}>{lang === 'zh' ? '服务条款' : 'Terms of Service'}</FooterLink>
            <FooterLink onClick={() => setLegalModal('privacy')}>{lang === 'zh' ? '隐私政策' : 'Privacy Policy'}</FooterLink>
            <FooterLink href="/calculator">{lang === 'zh' ? '费用计算器' : 'Calculator'}</FooterLink>
            <FooterLink href="/register-agent">{lang === 'zh' ? '申请成为中介' : 'Become an Agent'}</FooterLink>
          </div>
        </div>
      </footer>

      {legalModal && <LegalContent type={legalModal} onClose={() => setLegalModal(null)} />}
    </div>
  );
}
