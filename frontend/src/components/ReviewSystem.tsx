'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Send, Trash2, X, ChevronDown, Loader2, MessageSquare } from 'lucide-react';
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
  const starsRef = useRef<(HTMLButtonElement | null)[]>([]);

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

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const displayRating = hoverRating || rating;

  const ratingLabels = lang === 'zh'
    ? ['', '很差', '较差', '一般', '不错', '很好']
    : ['', 'Poor', 'Fair', 'Okay', 'Good', 'Great'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Rating overview */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 12,
        background: reviews.length > 0
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(245, 158, 11, 0.02))'
          : 'var(--glass-bg)',
        border: '1px solid ' + (reviews.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--glass-border)'),
      }}>
        <div style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          color: reviews.length > 0 ? '#f59e0b' : 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}>
          {averageRating.toFixed(1)}
        </div>
        <div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={15}
                fill={star <= averageRating ? '#f59e0b' : 'none'}
                color={star <= averageRating ? '#f59e0b' : 'var(--text-muted)'}
                strokeWidth={star <= averageRating ? 0 : 1.5}
                style={{ opacity: star <= averageRating ? 1 : 0.3 }}
              />
            ))}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <MessageSquare size={11} strokeWidth={2} />
            {reviews.length} {lang === 'zh' ? '条评价' : 'reviews'}
          </div>
        </div>
      </div>

      {/* Write review button */}
      {userId && !checkingEligibility && (
        canReview ? (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: showForm ? '1px solid var(--glass-border)' : '1px solid var(--primary)',
              background: showForm ? 'transparent' : 'rgba(var(--primary-rgb, 99, 102, 241), 0.06)',
              color: showForm ? 'var(--text-muted)' : 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <Star size={15} />
            {showForm
              ? (lang === 'zh' ? '取消' : 'Cancel')
              : (lang === 'zh' ? '发表评价' : 'Write a Review')
            }
          </button>
        ) : (
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            fontSize: '0.8rem',
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Star size={14} strokeWidth={1.5} />
            {lang === 'zh' ? '只有完成租约的租客才能发表评价' : 'Only tenants with completed leases can leave reviews'}
          </div>
        )
      )}

      {/* Review form */}
      {showForm && (
        <div style={{
          padding: 20,
          borderRadius: 14,
          border: '1px solid var(--glass-border)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeInUp 0.25s ease-out',
        }}>
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
                      size={28}
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
              htmlFor="review-comment"
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
              id="review-comment"
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

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowForm(false); setRating(0); setComment(''); }}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid var(--glass-border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={submitReview}
              disabled={rating === 0 || submitting}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: rating > 0 ? 'var(--primary)' : 'var(--glass-border)',
                color: 'white',
                cursor: rating > 0 && !submitting ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
                opacity: rating > 0 ? 1 : 0.6,
                transform: submitting ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  {lang === 'zh' ? '提交中...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Send size={14} />
                  {lang === 'zh' ? '提交' : 'Submit'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '8px 0',
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              padding: 14,
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
            }}>
              <div style={{
                display: 'flex', gap: 3, marginBottom: 8,
              }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <div key={s} style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: 'var(--glass-border)',
                    animation: `shimmer 1.5s ease-in-out infinite ${s * 0.05}s`,
                  }} />
                ))}
              </div>
              <div style={{
                width: `${60 + i * 10}%`, height: 10, borderRadius: 5,
                background: 'var(--glass-border)',
                animation: `shimmer 1.5s ease-in-out infinite 0.3s`,
              }} />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 28,
          borderRadius: 12,
          background: 'var(--glass-bg)',
          border: '1px dashed var(--glass-border)',
        }}>
          <MessageSquare size={28} style={{ color: 'var(--text-muted)', marginBottom: 8, opacity: 0.4 }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {lang === 'zh' ? '暂无评价' : 'No reviews yet'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.slice(0, MAX_VISIBLE_REVIEWS).map((review, i) => (
            <ReviewCard
              key={review.id}
              review={review}
              userId={userId}
              onDelete={deleteReview}
              lang={lang}
              index={i}
            />
          ))}
          {reviews.length > MAX_VISIBLE_REVIEWS && (
            <button
              onClick={() => setShowAllReviews(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '11px 16px',
                borderRadius: 10,
                border: '1px solid var(--glass-border)',
                background: 'transparent',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(var(--primary-rgb, 99, 102, 241), 0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {lang === 'zh' ? `查看全部 ${reviews.length} 条评价` : `View all ${reviews.length} reviews`}
              <ChevronDown size={16} />
            </button>
          )}
        </div>
      )}

      {/* All reviews modal */}
      {showAllReviews && (
        <div
          onClick={() => setShowAllReviews(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              animation: 'slideUp 0.25s ease-out',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-h)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                {lang === 'zh' ? `全部评价 (${reviews.length})` : `All Reviews (${reviews.length})`}
              </h3>
              <button
                onClick={() => setShowAllReviews(false)}
                aria-label={lang === 'zh' ? '关闭' : 'Close'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 8,
                  display: 'flex',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.map((review, i) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    userId={userId}
                    onDelete={deleteReview}
                    lang={lang}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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

function ReviewCard({
  review,
  userId,
  onDelete,
  lang,
  index = 0,
}: {
  review: Review;
  userId: string | null;
  onDelete: (id: string) => void;
  lang: string;
  index?: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{
      padding: 14,
      borderRadius: 10,
      border: '1px solid var(--glass-border)',
      background: 'var(--glass-bg)',
      animation: `fadeInUp 0.25s ease-out ${index * 0.05}s both`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={13}
                fill={star <= review.rating ? '#f59e0b' : 'none'}
                color={star <= review.rating ? '#f59e0b' : 'var(--text-muted)'}
                strokeWidth={star <= review.rating ? 0 : 1.5}
                style={{ opacity: star <= review.rating ? 1 : 0.3 }}
              />
            ))}
          </div>
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {new Date(review.created_at).toLocaleDateString()}
          </div>
        </div>
        {userId === review.user_id && (
          confirmDelete ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button
                onClick={() => onDelete(review.id)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                {lang === 'zh' ? '确认' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 3,
                  fontSize: '0.72rem',
                }}
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label={lang === 'zh' ? '删除评价' : 'Delete review'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'none';
              }}
            >
              <Trash2 size={14} />
            </button>
          )
        )}
      </div>
      {review.comment && (
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          color: 'var(--text-body)',
          lineHeight: 1.5,
        }}>
          {review.comment}
        </p>
      )}
    </div>
  );
}
