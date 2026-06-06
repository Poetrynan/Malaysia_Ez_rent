'use client';

import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, X, Clock } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

interface IdentityPromptModalProps {
  onFill: () => void;
}

const STORAGE_KEY = 'ez_identity_prompt_skips';
const MAX_SKIPS = 3;

export default function IdentityPromptModal({ onFill }: IdentityPromptModalProps) {
  const { lang } = useApp();
  const [visible, setVisible] = useState(false);
  const [skipsLeft, setSkipsLeft] = useState(MAX_SKIPS);

  useEffect(() => {
    const skips = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    setSkipsLeft(Math.max(0, MAX_SKIPS - skips));
    setVisible(true);
  }, []);

  const handleSkip = () => {
    const current = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    localStorage.setItem(STORAGE_KEY, String(current + 1));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20, animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
        borderRadius: 20, padding: '36px 28px', maxWidth: 420, width: '100%',
        boxShadow: 'var(--glass-shadow)', animation: 'scaleIn 0.3s ease',
        position: 'relative',
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 24px -8px var(--primary-glow)',
        }}>
          <Shield size={28} style={{ color: '#fff' }} />
        </div>

        {/* Title */}
        <h3 style={{
          textAlign: 'center', fontSize: '1.1rem', fontWeight: 700,
          color: 'var(--text-h)', marginBottom: 12,
        }}>
          {lang === 'zh' ? '请补填身份信息' : 'Complete Your Identity'}
        </h3>

        {/* Description */}
        <p style={{
          textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-body)',
          lineHeight: 1.6, marginBottom: 24,
        }}>
          {lang === 'zh'
            ? '为了您的租房安全和平台合规，我们需要验证您的身份信息。根据马来西亚相关法律法规，租赁平台有义务核实租户身份。'
            : 'For your safety and platform compliance, we need to verify your identity. Malaysian regulations require rental platforms to verify tenant identity.'}
        </p>

        {/* Trust badges */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          marginBottom: 24, padding: '14px 16px', borderRadius: 12,
          background: 'var(--primary-light)', border: '1px solid var(--primary-glow)',
        }}>
          {[
            { zh: '仅用于身份验证，不会公开显示', en: 'Only for verification, never displayed publicly' },
            { zh: '加密存储，严格保护隐私', en: 'Encrypted storage, strict privacy protection' },
            { zh: '仅在您表达租房意向时，由中介审核查看', en: 'Only visible to agents when you express interest' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem', color: 'var(--text-body)' }}>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span>
              {lang === 'zh' ? t.zh : t.en}
            </div>
          ))}
        </div>

        {/* Actions */}
        <button onClick={onFill} style={{
          width: '100%', padding: '13px 20px', borderRadius: 10, border: 'none',
          background: 'var(--primary)', color: 'white', fontFamily: 'inherit',
          fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s ease', marginBottom: 10,
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
        >
          {lang === 'zh' ? '立即填写' : 'Fill Now'} <ArrowRight size={15} />
        </button>

        {skipsLeft > 0 && (
          <button onClick={handleSkip} style={{
            width: '100%', padding: '11px 20px', borderRadius: 10,
            border: '1px solid var(--glass-border)', background: 'transparent',
            color: 'var(--text-muted)', fontFamily: 'inherit',
            fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Clock size={13} />
            {lang === 'zh' ? `稍后提醒（剩余 ${skipsLeft} 次）` : `Remind later (${skipsLeft} left)`}
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
