'use client';

import { useState, useEffect } from 'react';
import { Star, Send, X } from 'lucide-react';
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
  const [hasRated, setHasRated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 检查是否已评价
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

  // 提交评价
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

    setHasRated(true);
    setSubmitting(false);
    onClose?.();
  };

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
        {lang === 'zh' ? '加载中...' : 'Loading...'}
      </div>
    );
  }

  if (hasRated) {
    return (
      <div style={{
        padding: 16,
        borderRadius: 12,
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600 }}>
          {lang === 'zh' ? '您已评价过此中介' : 'You have already rated this agent'}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      border: '1px solid var(--glass-border)',
      background: 'var(--glass-bg)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
          {lang === 'zh' ? '评价中介' : 'Rate Agent'}
        </h4>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          {lang === 'zh' ? '评分' : 'Rating'}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(rating === star ? 0 : star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                transform: (hoverRating === star || rating === star) ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s ease',
              }}
            >
              <Star
                size={28}
                fill={(hoverRating >= star || rating >= star) ? '#f59e0b' : 'none'}
                color={(hoverRating >= star || rating >= star) ? '#f59e0b' : 'var(--text-muted)'}
                style={{ transition: 'all 0.15s ease' }}
              />
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder={lang === 'zh' ? '分享您的体验（可选）...' : 'Share your experience (optional)...'}
        style={{
          width: '100%',
          minHeight: 80,
          padding: 10,
          borderRadius: 8,
          border: '1px solid var(--glass-border)',
          background: 'var(--bg-surface)',
          color: 'var(--text-h)',
          resize: 'vertical',
          fontSize: '0.85rem',
          marginBottom: 12,
        }}
      />

      <button
        onClick={submitRating}
        disabled={rating === 0 || submitting}
        style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: 8,
          border: 'none',
          background: rating > 0 ? 'var(--primary)' : 'var(--glass-border)',
          color: 'white',
          cursor: rating > 0 ? 'pointer' : 'not-allowed',
          fontWeight: 600,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Send size={14} />
        {lang === 'zh' ? '提交评价' : 'Submit Rating'}
      </button>
    </div>
  );
}
