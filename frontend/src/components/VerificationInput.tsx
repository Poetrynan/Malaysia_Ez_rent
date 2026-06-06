'use client';

import React, { useRef, useEffect } from 'react';

interface VerificationInputProps {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  disabled?: boolean;
}

export default function VerificationInput({ value, onChange, length = 6, disabled = false }: VerificationInputProps) {
  const inputsRef = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (inputsRef.current[0] && !disabled) {
      inputsRef.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const chars = value.split('');
    chars[idx] = digit;
    const newCode = chars.join('').slice(0, length);
    onChange(newCode.padEnd(length, ''));

    if (digit && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      const chars = value.split('');
      chars[idx - 1] = '';
      onChange(chars.join('').padEnd(length, ''));
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted.padEnd(length, ''));
      const nextIdx = Math.min(pasted.length, length - 1);
      inputsRef.current[nextIdx]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { if (el) inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i]?.trim() || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          style={{
            width: 44, height: 52, textAlign: 'center',
            fontSize: '1.3rem', fontWeight: 700, fontFamily: 'inherit',
            borderRadius: 10,
            border: `2px solid ${value[i]?.trim() ? 'var(--primary)' : 'var(--glass-border)'}`,
            background: 'var(--glass-bg)',
            color: 'var(--text-h)',
            outline: 'none',
            transition: 'all 0.2s ease',
            caretColor: 'var(--primary)',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)';
          }}
          onBlur={e => {
            e.target.style.borderColor = value[i]?.trim() ? 'var(--primary)' : 'var(--glass-border)';
            e.target.style.boxShadow = 'none';
          }}
        />
      ))}
    </div>
  );
}
