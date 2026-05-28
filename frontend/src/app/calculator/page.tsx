'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, ArrowLeft, Sun, Moon, Globe } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

export default function CalculatorPage() {
  const { lang, setLang, theme, toggleTheme, t } = useApp();

  const [rent, setRent] = useState('');
  const [depositMonths, setDepositMonths] = useState('2');
  const [advanceMonths, setAdvanceMonths] = useState('0');
  const [coTenants, setCoTenants] = useState('1');

  const results = useMemo(() => {
    const r = Math.max(0, parseFloat(rent) || 0);
    const d = Math.max(0, parseInt(depositMonths) || 0);
    const a = Math.max(0, parseInt(advanceMonths) || 0);
    const c = Math.max(1, parseInt(coTenants) || 1);

    const deposit = r * d;
    const advance = r * a;
    const firstMonth = r;
    const total = deposit + advance + firstMonth;
    const perPerson = total / c;

    return { deposit, advance, firstMonth, total, perPerson, coTenants: c };
  }, [rent, depositMonths, advanceMonths, coTenants]);

  const fmt = (n: number) => `RM ${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20, position: 'relative',
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', borderBottom: 'none', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.82rem' }}>
          <ArrowLeft size={14} />
          {lang === 'zh' ? '返回首页' : 'Back to Home'}
        </a>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={toggleTheme} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
            <Globe size={13} />
            {lang === 'zh' ? 'EN' : '中'}
          </button>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
        borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 460,
        boxShadow: 'var(--glass-shadow)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', transition: 'all 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', marginBottom: 12 }}>
            <Calculator size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>{t('calcTitle')}</h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{t('calcDesc')}</p>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('calcMonthlyRent')}</label>
            <input
              type="number" min={0} placeholder="1200"
              value={rent} onChange={e => setRent(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
                color: 'var(--text-h)', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none',
                transition: 'border-color 0.15s', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('calcDepositMonths')}</label>
              <input
                type="number" min={0} max={12}
                value={depositMonths} onChange={e => setDepositMonths(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
                  color: 'var(--text-h)', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none',
                  transition: 'border-color 0.15s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('calcAdvanceMonths')}</label>
              <input
                type="number" min={0} max={12}
                value={advanceMonths} onChange={e => setAdvanceMonths(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
                  color: 'var(--text-h)', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none',
                  transition: 'border-color 0.15s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('calcCoTenants')}</label>
            <input
              type="number" min={1} max={20}
              value={coTenants} onChange={e => setCoTenants(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
                color: 'var(--text-h)', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none',
                transition: 'border-color 0.15s', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </div>
        </div>

        {/* Results */}
        {parseFloat(rent) > 0 && (
          <div style={{
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: 12, padding: '20px 18px',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>{t('calcBreakdown')}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <Row label={t('calcDeposit')} value={fmt(results.deposit)} sub={`${depositMonths} × ${fmt(parseFloat(rent) || 0)}`} />
              <Row label={t('calcAdvance')} value={fmt(results.advance)} sub={`${advanceMonths} × ${fmt(parseFloat(rent) || 0)}`} />
              <Row label={t('calcFirstMonth')} value={fmt(results.firstMonth)} />
              <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
              <Row label={t('calcTotal')} value={fmt(results.total)} bold />
            </div>

            {results.coTenants > 1 && (
              <div style={{
                background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)',
                borderRadius: 10, padding: '14px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{t('calcPerPersonLabel')} ({results.coTenants} {lang === 'zh' ? '人' : 'people'})</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>{fmt(results.perPerson)}</div>
              </div>
            )}

            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '12px 0 0', lineHeight: 1.5 }}>{t('calcNote')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-body)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sub}</div>}
        <span style={{ fontSize: bold ? '1rem' : '0.88rem', fontWeight: bold ? 700 : 500, color: bold ? 'var(--primary)' : 'var(--text-h)' }}>{value}</span>
      </div>
    </div>
  );
}
