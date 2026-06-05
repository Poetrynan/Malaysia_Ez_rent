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
  const { lang } = useApp();
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    document.title = `${lang === 'zh' ? '房源浏览' : 'Browse Properties'} | Malaysia Ez Rent`;
  }, [lang]);

  return (
    <div className="guest-mode" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{ position: 'relative', padding: '80px 24px 64px', textAlign: 'center', background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--primary-light, rgba(14,116,144,0.06)) 50%, var(--bg-base) 100%)' }}>
        {/* Decorative blobs — pointer-events none, no overflow hidden */}
        <div style={{ position: 'absolute', top: -120, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,116,144,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          {/* Logo — circular badge */}
          <div style={{ width: 280, height: 280, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', border: '2px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(14,116,144,0.12), 0 0 0 6px rgba(14,116,144,0.04)', animation: 'guestLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <img src="/image.png" alt="Malaysia Ez Rent" style={{ width: '110%', height: '110%', objectFit: 'cover', mixBlendMode: 'multiply' }} />
          </div>
          {/* Artistic brand name */}
          <div style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--primary) 0%, #14b8a6 50%, var(--primary) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 8px', lineHeight: 1.1 }}>
            Malaysia Ez Rent
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 20px', letterSpacing: '0.08em', fontWeight: 500 }}>
            {lang === 'zh' ? '大马留学生 AI 智能租房系统' : 'AI-Powered Rental System for Malaysia'}
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 14px', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
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
        <h2 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', fontWeight: 700, color: 'var(--text-h)', textAlign: 'center', margin: '0 0 28px' }}>
          {lang === 'zh' ? '平台特色' : 'Why Choose Us'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="glass-card" style={{ padding: '24px 20px', textAlign: 'center', borderRadius: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-light, rgba(14,116,144,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <f.icon size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>{lang === 'zh' ? f.zh : f.en}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{lang === 'zh' ? f.descZh : f.descEn}</p>
            </div>
          ))}
        </div>
        <h2 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', fontWeight: 700, color: 'var(--text-h)', textAlign: 'center', margin: '0 0 28px' }}>
          {lang === 'zh' ? '三步轻松入住' : 'Three Steps to Your New Home'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {STEPS.map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: '24px 20px', textAlign: 'center', borderRadius: 14, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, right: 12, fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', opacity: 0.5 }}>{s.num}</div>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-light, rgba(14,116,144,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <s.icon size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>{lang === 'zh' ? s.zh : s.en}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{lang === 'zh' ? s.descZh : s.descEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ LISTINGS (paginated, 8 per page) ═══════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto', flex: 1 }}>
        <PropertyListings guestMode />
      </section>

      {/* ═══════════ TRUST ═══════════ */}
      <section style={{ padding: '64px 24px', background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--primary-light, rgba(14,116,144,0.04)) 50%, var(--bg-base) 100%)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 8px' }}>
            {lang === 'zh' ? '告别假房源，每一套都真实' : 'No Fake Listings. Every Property is Verified.'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 auto 40px', maxWidth: 600, lineHeight: 1.7 }}>
            {lang === 'zh' ? '其他平台上 30%–40% 是重复或虚假的"幽灵房源"。我们从源头杜绝这个问题。' : 'Up to 30-40% of listings on other platforms are duplicate or ghost listings. We eliminate this from the source.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { icon: '🔒', title: { zh: '实名认证中介', en: 'Verified Agents' }, desc: { zh: '每位中介都经过 REN 牌照核验，身份可追溯', en: 'Every agent is verified with REN license, fully traceable' } },
              { icon: '📸', title: { zh: '真实房源照片', en: 'Real Photos Only' }, desc: { zh: '照片来自中介实拍，不存在"照骗"和 AI 生成图', en: 'Photos taken by agents on-site, no AI-generated fakes' } },
              { icon: '💰', title: { zh: '透明定价', en: 'Transparent Pricing' }, desc: { zh: '同一房源不会出现十几个不同价格，标价即实价', en: 'No price manipulation — what you see is what you pay' } },
              { icon: '🏠', title: { zh: '房源实时更新', en: 'Real-Time Listings' }, desc: { zh: '中介更新房源后即时反映，价格、状态始终最新', en: 'Listings update instantly when agents make changes — always current' } },
            ].map((item, i) => (
              <div key={i} style={{ padding: '20px 16px', borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{item.icon}</div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>{lang === 'zh' ? item.title.zh : item.title.en}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{lang === 'zh' ? item.desc.zh : item.desc.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section style={{ padding: '64px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 700, color: 'var(--text-h)', textAlign: 'center', margin: '0 0 40px' }}>
          {lang === 'zh' ? '他们已经找到了理想的家' : 'They Already Found Their Home'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { quote: { zh: '从开始找房到签约只用了三天，整个流程比我想象中顺畅太多。', en: 'From searching to signing took only three days. The whole process was way smoother than I expected.' }, name: 'Li Wei', role: { zh: 'Monash 大学生', en: 'Monash University Student' }, img: 11 },
            { quote: { zh: '终于不用在 WhatsApp 群里翻中介消息了，所有东西都在一个平台上搞定。', en: "No more digging through WhatsApp messages from agents. Everything is on one platform." }, name: 'Sarah Tan', role: { zh: 'Taylor\'s 大学生', en: "Taylor's University Student" }, img: 5 },
            { quote: { zh: '最让我放心的是资金安全，每笔付款都有记录，不怕被骗。', en: "What impressed me most is payment security. Every transaction is tracked, no fear of scams." }, name: 'Ahmad Faizal', role: { zh: 'UPM 大学生', en: 'UPM University Student' }, img: 12 },
            { quote: { zh: '中介回复很快，房源信息也很真实，不像其他平台图片和实际差太多。', en: 'Agent responded quickly, property info was accurate — nothing like other platforms where photos mislead.' }, name: 'Chen Yuki', role: { zh: 'Sunway 大学生', en: 'Sunway University Student' }, img: 9 },
            { quote: { zh: '合租找室友太方便了，直接在平台上看到谁也在找同一个房子。', en: 'Finding roommates for co-renting is so easy. I could see who else was looking at the same place.' }, name: 'Priya Nair', role: { zh: 'INTI 大学生', en: 'INTI University Student' }, img: 16 },
            { quote: { zh: '作为一个新生，不用到马来西亚就能提前看好房子，省了太多时间。', en: "As a newcomer, being able to browse properties before arriving in Malaysia saved me so much time." }, name: 'Kim Joon-ho', role: { zh: 'UCSI 大学生', en: 'UCSI University Student' }, img: 7 },
          ].map((t, i) => (
            <div key={i} className="glass-card" style={{ padding: '20px', borderRadius: 14 }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-body)', lineHeight: 1.65, margin: '0 0 16px', fontStyle: 'italic' }}>
                &ldquo;{lang === 'zh' ? t.quote.zh : t.quote.en}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={`https://i.pravatar.cc/80?img=${t.img}`} alt={t.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-h)' }}>{t.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? t.role.zh : t.role.en}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
