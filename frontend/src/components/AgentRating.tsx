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
          const { data } = await supabase.from('agent_ratings').select('id').eq('tenant_id', tenantId).eq('lease_id', leaseId).maybeSingle();
          setHasRated(!!data);
        } catch (e) { console.error('Check rating error:', e); }
      }
      setLoading(false);
    };
    checkRating();
  }, [tenantId, leaseId]);

  const submitRating = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    const newRating: any = { tenant_id: tenantId, agent_id: agentId, lease_id: leaseId, rating, comment: comment.trim(), created_at: new Date().toISOString() };
    if (isMockDatabase) {
      const ratings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
      newRating.id = `rating-${Date.now()}`;
      ratings.push(newRating);
      localStorage.setItem('ez_agent_ratings', JSON.stringify(ratings));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        await (await createClient()).from('agent_ratings').insert(newRating);
      } catch (e) { console.error('Submit rating error:', e); }
    }
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { setHasRated(true); onClose?.(); }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); const n = Math.min(5, star + 1); setRating(n); starsRef.current[n - 1]?.focus(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); const p = Math.max(1, star - 1); setRating(p); starsRef.current[p - 1]?.focus(); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setRating(rating === star ? 0 : star); }
  };

  const displayRating = hoverRating || rating;
  const starColor = displayRating >= 4 ? 'var(--success)' : displayRating >= 3 ? 'var(--warning)' : displayRating >= 1 ? 'var(--danger)' : 'var(--text-muted)';
  const ratingLabels = lang === 'zh' ? ['', '很差', '较差', '一般', '不错', '很好'] : ['', 'Poor', 'Fair', 'Okay', 'Good', 'Great'];

  // ── Loading skeleton ──
  if (loading) return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--glass-border)', animation: `shimmer 1.5s ease-in-out ${i * 0.06}s infinite` }} />)}
      </div>
      <div style={{ height: 14, width: 100, borderRadius: 7, background: 'var(--glass-border)', marginBottom: 12, animation: 'shimmer 1.5s ease-in-out 0.3s infinite' }} />
      <div style={{ height: 80, borderRadius: 'var(--radius-sm)', background: 'var(--glass-border)', animation: 'shimmer 1.5s ease-in-out 0.4s infinite' }} />
    </div>
  );

  // ── Already rated ──
  if (hasRated) return (
    <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--success-light)', borderColor: 'var(--success)' }}>
      <Check size={18} color="var(--success)" strokeWidth={2.5} />
      <span style={{ fontSize: '0.88rem', color: 'var(--success)', fontWeight: 600 }}>{lang === 'zh' ? '您已评价过此中介' : 'You have already rated this agent'}</span>
    </div>
  );

  // ── Submit success ──
  if (submitted) return (
    <div className="glass-card" style={{ padding: 24, textAlign: 'center', background: 'var(--success-light)', borderColor: 'var(--success)', animation: 'fadeInUp 0.3s ease-out' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-light)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        <Check size={24} color="var(--success)" strokeWidth={2.5} />
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>{lang === 'zh' ? '评价成功！' : 'Rating Submitted!'}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '感谢您的反馈' : 'Thank you for your feedback'}</div>
    </div>
  );

  // ── Main form ──
  return (
    <div className="glass-card" style={{ padding: 20, animation: 'fadeInUp 0.25s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-h)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={15} fill="var(--primary)" color="var(--primary)" />
          </span>
          {lang === 'zh' ? '评价中介' : 'Rate Agent'}
        </h4>
        {onClose && (
          <button onClick={onClose} aria-label={lang === 'zh' ? '关闭' : 'Close'} className="ctrl-btn" style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Stars */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500, letterSpacing: '0.04em' }}>
          {lang === 'zh' ? '请选择评分' : 'Select your rating'}
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} role="radiogroup" aria-label={lang === 'zh' ? '评分选择' : 'Rating selection'}>
          {[1, 2, 3, 4, 5].map(star => {
            const isActive = star <= displayRating;
            const isHovered = hoverRating === star;
            return (
              <button key={star} ref={el => { starsRef.current[star - 1] = el; }} role="radio" aria-checked={rating === star} aria-label={`${star} ${ratingLabels[star]}`} tabIndex={rating === star ? 0 : -1}
                onClick={() => setRating(rating === star ? 0 : star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onKeyDown={e => handleKeyDown(e, star)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)', transform: isHovered ? 'scale(1.25)' : isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', outline: 'none' }}
                onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-glow)'; }}
                onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Star size={32} fill={isActive ? starColor : 'none'} color={isActive ? starColor : 'var(--text-muted)'} strokeWidth={isActive ? 0 : 1.5}
                  style={{ transition: 'all 0.2s ease', filter: isHovered ? `drop-shadow(0 0 6px ${starColor})` : 'none' }} />
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 8, minHeight: 20, fontSize: '0.82rem', fontWeight: 600, color: displayRating > 0 ? starColor : 'transparent', transition: 'color 0.2s ease' }}>
          {displayRating > 0 && `${displayRating}/5 · ${ratingLabels[displayRating]}`}
        </div>
      </div>

      {/* Comment */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="agent-rating-comment" style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em' }}>
          {lang === 'zh' ? '评价内容（可选）' : 'Comment (optional)'}
        </label>
        <textarea id="agent-rating-comment" className="form-textarea" value={comment} onChange={e => setComment(e.target.value.slice(0, 500))}
          placeholder={lang === 'zh' ? '分享您的体验...' : 'Share your experience...'} maxLength={500}
          style={{ minHeight: 80, resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
        <div style={{ textAlign: 'right', fontSize: '0.72rem', color: comment.length > 450 ? 'var(--warning)' : 'var(--text-muted)', marginTop: 4, opacity: comment.length > 0 ? 1 : 0, transition: 'opacity 0.2s ease' }}>
          {comment.length}/500
        </div>
      </div>

      {/* Submit */}
      <button onClick={submitRating} disabled={rating === 0 || submitting}
        className={rating > 0 ? 'btn-primary' : 'btn-secondary'}
        style={{ width: '100%', opacity: rating > 0 ? 1 : 0.5, cursor: rating > 0 && !submitting ? 'pointer' : 'not-allowed', transform: submitting ? 'scale(0.98)' : 'none' }}>
        {submitting ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />{lang === 'zh' ? '提交中...' : 'Submitting...'}</>)
          : (<><Send size={15} />{lang === 'zh' ? '提交评价' : 'Submit Rating'}</>)}
      </button>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
      `}</style>
    </div>
  );
}
