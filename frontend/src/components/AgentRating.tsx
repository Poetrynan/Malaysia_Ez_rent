'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Send, X, Check, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { isMockDatabase } from '@/lib/supabase';

interface AgentRatingProps {
  agentId: string;
  leaseId: string;
  tenantId: string;
  onClose?: () => void;
}

export default function AgentRating({ agentId, leaseId, tenantId, onClose }: AgentRatingProps) {
  const { lang } = useApp();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const starsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const checkRating = async () => {
      if (isMockDatabase) {
        const ratings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
        setHasRated(ratings.some((r: any) => r.tenant_id === tenantId && r.lease_id === leaseId));
      } else {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data } = await supabase
            .from('agent_ratings')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('lease_id', leaseId)
            .maybeSingle();
          setHasRated(!!data);
        } catch (e) {
          console.error('Check rating error:', e);
        }
      }
      setLoading(false);
    };
    checkRating();
  }, [tenantId, leaseId]);

  const submitRating = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);

    const newRating: any = {
      tenant_id: tenantId,
      agent_id: agentId,
      lease_id: leaseId,
      rating,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };

    if (isMockDatabase) {
      const ratings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
      newRating.id = `rating-${Date.now()}`;
      ratings.push(newRating);
      localStorage.setItem('ez_agent_ratings', JSON.stringify(ratings));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('agent_ratings').insert(newRating);
      } catch (e) {
        console.error('Submit rating error:', e);
      }
    }

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setHasRated(true);
      onClose?.();
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(5, star + 1);
      setRating(next);
      starsRef.current[next - 1]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(1, star - 1);
      setRating(prev);
      starsRef.current[prev - 1]?.focus();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setRating(rating === star ? 0 : star);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        {lang === 'zh' ? '加载中...' : 'Loading...'}
      </div>
    );
  }

  if (hasRated) {
    return (
      <div style={{
        padding: 20,
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.03))',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={16} color="var(--success)" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: '0.88rem', color: 'var(--success)', fontWeight: 600 }}>
          {lang === 'zh' ? '您已评价过此中介' : 'You have already rated this agent'}
        </span>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{
        padding: 24,
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.03))',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        textAlign: 'center',
        animation: 'fadeInUp 0.3s ease-out',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <Check size={24} color="var(--success)" strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>
          {lang === 'zh' ? '评价成功！' : 'Rating Submitted!'}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {lang === 'zh' ? '感谢您的反馈' : 'Thank you for your feedback'}
        </div>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  const ratingLabels = lang === 'zh'
    ? ['', '很差', '较差', '一般', '不错', '很好']
    : ['', 'Poor', 'Fair', 'Okay', 'Good', 'Great'];

  return (
    <div style={{
      padding: 20,
      borderRadius: 14,
      border: '1px solid var(--glass-border)',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      animation: 'fadeInUp 0.25s ease-out',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--text-h)',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Star size={18} fill="#f59e0b" color="#f59e0b" />
          {lang === 'zh' ? '评价中介' : 'Rate Agent'}
        </h4>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={lang === 'zh' ? '关闭' : 'Close'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Stars */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          marginBottom: 10,
          fontWeight: 500,
        }}>
          {lang === 'zh' ? '请选择评分' : 'Select your rating'}
        </div>
        <div
          style={{ display: 'flex', gap: 6, alignItems: 'center' }}
          role="radiogroup"
          aria-label={lang === 'zh' ? '评分选择' : 'Rating selection'}
        >
          {[1, 2, 3, 4, 5].map(star => {
            const isActive = star <= displayRating;
            const isHovered = hoverRating === star;
            return (
              <button
                key={star}
                ref={el => { starsRef.current[star - 1] = el; }}
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} ${ratingLabels[star]}`}
                tabIndex={rating === star ? 0 : -1}
                onClick={() => setRating(rating === star ? 0 : star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onKeyDown={e => handleKeyDown(e, star)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 10,
                  transform: isHovered ? 'scale(1.25)' : isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  position: 'relative',
                  outline: 'none',
                }}
                onFocus={e => {
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.4)';
                }}
                onBlur={e => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Star
                  size={32}
                  fill={isActive ? '#f59e0b' : 'none'}
                  color={isActive ? '#f59e0b' : 'var(--text-muted)'}
                  strokeWidth={isActive ? 0 : 1.5}
                  style={{
                    transition: 'all 0.2s ease',
                    filter: isHovered ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))' : 'none',
                  }}
                />
              </button>
            );
          })}
        </div>
        {/* Rating label */}
        <div style={{
          marginTop: 8,
          minHeight: 20,
          fontSize: '0.82rem',
          fontWeight: 600,
          color: displayRating > 0 ? '#f59e0b' : 'transparent',
          transition: 'all 0.2s ease',
        }}>
          {displayRating > 0 && `${displayRating}/5 · ${ratingLabels[displayRating]}`}
        </div>
      </div>

      {/* Comment */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="agent-rating-comment"
          style={{
            display: 'block',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            marginBottom: 8,
            fontWeight: 500,
          }}
        >
          {lang === 'zh' ? '评价内容（可选）' : 'Comment (optional)'}
        </label>
        <textarea
          id="agent-rating-comment"
          value={comment}
          onChange={e => setComment(e.target.value.slice(0, 500))}
          placeholder={lang === 'zh' ? '分享您的体验...' : 'Share your experience...'}
          maxLength={500}
          style={{
            width: '100%',
            minHeight: 80,
            padding: 12,
            borderRadius: 10,
            border: '1px solid var(--glass-border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-h)',
            resize: 'vertical',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            boxSizing: 'border-box',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb, 99, 102, 241), 0.1)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--glass-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <div style={{
          textAlign: 'right',
          fontSize: '0.72rem',
          color: comment.length > 450 ? 'var(--warning)' : 'var(--text-muted)',
          marginTop: 4,
          opacity: comment.length > 0 ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}>
          {comment.length}/500
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={submitRating}
        disabled={rating === 0 || submitting}
        aria-label={lang === 'zh' ? '提交评价' : 'Submit rating'}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 10,
          border: 'none',
          background: rating > 0
            ? submitting ? 'var(--primary-muted, #818cf8)' : 'var(--primary)'
            : 'var(--glass-border)',
          color: 'white',
          cursor: rating > 0 && !submitting ? 'pointer' : 'not-allowed',
          fontWeight: 600,
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.2s ease',
          opacity: rating > 0 ? 1 : 0.6,
          transform: submitting ? 'scale(0.98)' : 'scale(1)',
        }}
      >
        {submitting ? (
          <>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            {lang === 'zh' ? '提交中...' : 'Submitting...'}
          </>
        ) : (
          <>
            <Send size={15} />
            {lang === 'zh' ? '提交评价' : 'Submit Rating'}
          </>
        )}
      </button>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
