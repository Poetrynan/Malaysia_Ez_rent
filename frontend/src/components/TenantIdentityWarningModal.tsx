'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/ThemeProvider';

interface TenantIdentityWarningModalProps {
  missingItems: string[];
  onContinue: () => void;
  onClose: () => void;
}

export default function TenantIdentityWarningModal({
  missingItems,
  onContinue,
  onClose,
}: TenantIdentityWarningModalProps) {
  const { lang } = useApp();
  const router = useRouter();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)',
          borderRadius: 16, padding: '28px 24px', maxWidth: 440, width: '100%',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)' }}>
              {lang === 'zh' ? '身份信息尚不完整' : 'Identity Information Incomplete'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
              {lang === 'zh'
                ? '中介在审核您的租房申请时，可能会因证件或个人信息不齐全而拒绝。建议先完善以下资料：'
                : 'Agents may reject your rental application if identity documents are incomplete. We recommend completing:'}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <ul style={{ margin: '0 0 20px', padding: '12px 16px 12px 28px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          {missingItems.map(item => (
            <li key={item} style={{ fontSize: '0.8rem', color: 'var(--text-body)', marginBottom: 4 }}>{item}</li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => { onClose(); router.push('/profile'); }}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none',
            background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: '0.88rem',
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {lang === 'zh' ? '去完善资料' : 'Complete Profile'} <ArrowRight size={15} />
        </button>

        <button
          type="button"
          onClick={() => { onClose(); onContinue(); }}
          style={{
            width: '100%', padding: '11px 16px', borderRadius: 10,
            border: '1px solid var(--glass-border)', background: 'transparent',
            color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.82rem',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {lang === 'zh' ? '仍要提交意向' : 'Submit Anyway'}
        </button>
      </div>
    </div>
  );
}
