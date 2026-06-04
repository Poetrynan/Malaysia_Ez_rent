'use client';

import { useState, useEffect } from 'react';
import { Star, Send, Trash2, X, ChevronDown } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { isMockDatabase } from '@/lib/supabase';

interface Review {
  id: string;
  user_id: string;
  unit_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_name?: string;
}

interface ReviewSystemProps {
  unitId: string;
  userId: string | null;
}

const MAX_VISIBLE_REVIEWS = 3;

export default function ReviewSystem({ unitId, userId }: ReviewSystemProps) {
  const { lang } = useApp();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // 检查用户是否有资格评价
  useEffect(() => {
    if (!userId) {
      setCheckingEligibility(false);
      return;
    }

    const checkEligibility = async () => {
      if (isMockDatabase) {
        const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
        const hasCompletedLease = leases.some((l: any) =>
          l.tenant_id === userId &&
          l.unit_id === unitId &&
          ['completed', 'expired', 'terminated'].includes(l.status)
        );
        setCanReview(hasCompletedLease);
      } else {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data } = await supabase
            .rpc('can_review_unit', { p_user_id: userId, p_unit_id: unitId });
          setCanReview(data || false);
        } catch (e) {
          console.error('Check eligibility error:', e);
          setCanReview(false);
        }
      }
      setCheckingEligibility(false);
    };

    checkEligibility();
  }, [userId, unitId]);

  // 加载评价
  useEffect(() => {
    loadReviews();
  }, [unitId]);

  const loadReviews = async () => {
    setLoading(true);
    if (isMockDatabase) {
      const allReviews = JSON.parse(localStorage.getItem('ez_reviews') || '[]');
      const unitReviews = allReviews.filter((r: any) => r.unit_id === unitId);
      setReviews(unitReviews);
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data } = await supabase
          .from('reviews')
          .select('*')
          .eq('unit_id', unitId)
          .order('created_at', { ascending: false });
        setReviews(data || []);
      } catch (e) {
        console.error('Load reviews error:', e);
      }
    }
    setLoading(false);
  };

  // 提交评价
  const submitReview = async () => {
    if (!userId || rating === 0) return;
    setSubmitting(true);

    const newReview: any = {
      user_id: userId,
      unit_id: unitId,
      rating,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };

    if (isMockDatabase) {
      const allReviews = JSON.parse(localStorage.getItem('ez_reviews') || '[]');
      newReview.id = `review-${Date.now()}`;
      allReviews.push(newReview);
      localStorage.setItem('ez_reviews', JSON.stringify(allReviews));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('reviews').insert(newReview);
      } catch (e) {
        console.error('Submit review error:', e);
      }
    }

    setRating(0);
    setComment('');
    setShowForm(false);
    await loadReviews();
    setSubmitting(false);
  };

  // 删除评价
  const deleteReview = async (reviewId: string) => {
    if (isMockDatabase) {
      const allReviews = JSON.parse(localStorage.getItem('ez_reviews') || '[]');
      const filtered = allReviews.filter((r: any) => r.id !== reviewId);
      localStorage.setItem('ez_reviews', JSON.stringify(filtered));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('reviews').delete().eq('id', reviewId);
      } catch (e) {
        console.error('Delete review error:', e);
      }
    }
    await loadReviews();
  };

  // 计算平均评分
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 评分概览 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-h)' }}>
          {averageRating.toFixed(1)}
        </div>
        <div>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={16}
                fill={star <= averageRating ? '#f59e0b' : 'none'}
                color={star <= averageRating ? '#f59e0b' : 'var(--text-muted)'}
              />
            ))}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {reviews.length} {lang === 'zh' ? '条评价' : 'reviews'}
          </div>
        </div>
      </div>

      {/* 发表评价按钮 */}
      {userId && !checkingEligibility && (
        canReview ? (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--primary)',
              background: 'transparent',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Star size={14} />
            {lang === 'zh' ? '发表评价' : 'Write a Review'}
          </button>
        ) : (
          <div style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '0.8rem',
            color: 'var(--warning)',
          }}>
            {lang === 'zh' ? '只有完成租约的租客才能发表评价' : 'Only tenants with completed leases can leave reviews'}
          </div>
        )
      )}

      {/* 评价表单 */}
      {showForm && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          border: '1px solid var(--glass-border)',
          background: 'var(--glass-bg)',
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
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
                    size={24}
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={submitReview}
              disabled={rating === 0 || submitting}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: rating > 0 ? 'var(--primary)' : 'var(--glass-border)',
                color: 'white',
                cursor: rating > 0 ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Send size={14} />
              {lang === 'zh' ? '提交' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* 评价列表 */}
      {loading ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
          {lang === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
          {lang === 'zh' ? '暂无评价' : 'No reviews yet'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.slice(0, MAX_VISIBLE_REVIEWS).map(review => (
            <ReviewCard key={review.id} review={review} userId={userId} onDelete={deleteReview} />
          ))}
          {reviews.length > MAX_VISIBLE_REVIEWS && (
            <button
              onClick={() => setShowAllReviews(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--glass-border)',
                background: 'transparent',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {lang === 'zh' ? `查看全部 ${reviews.length} 条评价` : `View all ${reviews.length} reviews`}
              <ChevronDown size={16} />
            </button>
          )}
        </div>
      )}

      {/* 全部评价 Modal */}
      {showAllReviews && (
        <div
          onClick={() => setShowAllReviews(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--glass-border)',
              borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
                {lang === 'zh' ? `全部评价 (${reviews.length})` : `All Reviews (${reviews.length})`}
              </h3>
              <button
                onClick={() => setShowAllReviews(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} userId={userId} onDelete={deleteReview} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 评价卡片组件
function ReviewCard({ review, userId, onDelete }: { review: Review; userId: string | null; onDelete: (id: string) => void }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 8,
      border: '1px solid var(--glass-border)',
      background: 'var(--glass-bg)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={14}
                fill={star <= review.rating ? '#f59e0b' : 'none'}
                color={star <= review.rating ? '#f59e0b' : 'var(--text-muted)'}
              />
            ))}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {new Date(review.created_at).toLocaleDateString()}
          </div>
        </div>
        {userId === review.user_id && (
          <button
            onClick={() => onDelete(review.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {review.comment && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)' }}>
          {review.comment}
        </p>
      )}
    </div>
  );
}
