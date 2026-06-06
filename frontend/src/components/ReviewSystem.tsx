'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Send, Trash2, X, ChevronDown, Loader2, MessageSquare, AlertCircle, Info } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { isMockDatabase } from '@/lib/supabase';

interface Review { id: string; user_id: string; unit_id: string; rating: number; comment: string; created_at: string; user_name?: string; }
interface ReviewSystemProps { unitId: string; userId: string | null; canDeleteAll?: boolean; }

const MAX_VISIBLE = 3;

export default function ReviewSystem({ unitId, userId, canDeleteAll = false }: ReviewSystemProps) {
  const { lang } = useApp();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checking, setChecking] = useState(true);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const [showTip, setShowTip] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const starsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!userId) { setChecking(false); return; }
    const check = async () => {
      if (isMockDatabase) {
        const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
        setCanReview(leases.some((l: any) => l.tenant_id === userId && l.unit_id === unitId && ['completed', 'expired', 'terminated'].includes(l.status)));
      } else {
        try { const { createClient } = await import('@/utils/supabase/client'); const { data } = await (await createClient()).rpc('can_review_unit', { p_user_id: userId, p_unit_id: unitId }); setCanReview(data || false); } catch { setCanReview(false); }
      }
      setChecking(false);
    };
    check();
  }, [userId, unitId]);

  useEffect(() => { loadReviews(); }, [unitId]);

  const loadReviews = async () => {
    setLoading(true);
    if (isMockDatabase) {
      setReviews(JSON.parse(localStorage.getItem('ez_reviews') || '[]').filter((r: any) => r.unit_id === unitId));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const sb = await createClient();
        const { data } = await sb.from('reviews').select('*').eq('unit_id', unitId).order('created_at', { ascending: false });
        const rows = data || [];
        if (rows.length === 0) {
          setReviews([]);
        } else {
          const userIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id).filter(Boolean))];
          const nameMap: Record<string, string | null> = {};
          if (userIds.length > 0) {
            const { data: users } = await sb.from('users').select('id, full_name').in('id', userIds);
            for (const u of users || []) nameMap[u.id] = u.full_name ?? null;
          }
          setReviews(rows.map((r: any) => ({ ...r, user_name: nameMap[r.user_id] ?? null })));
        }
      } catch (e) { console.error('Load reviews error:', e); }
    }
    setLoading(false);
  };

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const submitReview = async () => {
    if (!userId) return;
    if (rating === 0) { showToast(lang === 'zh' ? '请先选择评分星星' : 'Please select a star rating'); return; }
    // Check if user already reviewed this unit
    const existingReview = reviews.find(r => r.user_id === userId);
    if (existingReview) { showToast(lang === 'zh' ? '您已经评价过此房源，每份合约只能评价一次' : 'You have already reviewed this property. One review per lease.'); return; }
    setSubmitting(true);
    const r: any = { user_id: userId, unit_id: unitId, rating, comment: comment.trim(), created_at: new Date().toISOString() };
    if (isMockDatabase) { const all = JSON.parse(localStorage.getItem('ez_reviews') || '[]'); r.id = `review-${Date.now()}`; all.push(r); localStorage.setItem('ez_reviews', JSON.stringify(all)); }
    else { try { const { createClient } = await import('@/utils/supabase/client'); await (await createClient()).from('reviews').insert(r); } catch (e) { console.error(e); } }
    setRating(0); setComment(''); setShowForm(false); await loadReviews(); setSubmitting(false);
  };

  const deleteReview = async (id: string) => {
    if (isMockDatabase) { const all = JSON.parse(localStorage.getItem('ez_reviews') || '[]'); localStorage.setItem('ez_reviews', JSON.stringify(all.filter((r: any) => r.id !== id))); }
    else { try { const { createClient } = await import('@/utils/supabase/client'); await (await createClient()).from('reviews').delete().eq('id', id); } catch (e) { console.error(e); } }
    await loadReviews();
  };

  const handleKeyDown = (e: React.KeyboardEvent, s: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); const n = Math.min(5, s + 1); setRating(n); starsRef.current[n - 1]?.focus(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); const p = Math.max(1, s - 1); setRating(p); starsRef.current[p - 1]?.focus(); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setRating(rating === s ? 0 : s); }
  };

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const hasReviewed = userId ? reviews.some(r => r.user_id === userId) : false;
  const display = hoverRating || rating;
  const starColor = display >= 4 ? 'var(--success)' : display >= 3 ? 'var(--warning)' : display >= 1 ? 'var(--danger)' : 'var(--text-muted)';
  const labels = lang === 'zh' ? ['', '很差', '较差', '一般', '不错', '很好'] : ['', 'Poor', 'Fair', 'Okay', 'Good', 'Great'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Overview card ── */}
      <div className="glass-card" style={{
        padding: '14px 18px',
        background: reviews.length > 0 ? 'var(--primary-light)' : undefined,
        borderColor: reviews.length > 0 ? 'var(--primary)' : undefined,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: userId && !checking ? 14 : 0 }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: reviews.length > 0 ? 'var(--primary)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {avg.toFixed(1)}
          </span>
          <div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
              {[1, 2, 3, 4, 5].map(s => <Star key={s} size={15} fill={s <= avg ? 'var(--warning)' : 'none'} color={s <= avg ? 'var(--warning)' : 'var(--text-muted)'} strokeWidth={s <= avg ? 0 : 1.5} style={{ opacity: s <= avg ? 1 : 0.3 }} />)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={11} strokeWidth={2} />{reviews.length} {lang === 'zh' ? '条评价' : 'reviews'}
            </div>
          </div>
        </div>

        {/* ── Write button (inside card) ── */}
        {userId && !checking && (hasReviewed ? (
          <div className="mode-banner" style={{ background: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success)' }}>
            <Star size={14} strokeWidth={1.5} />{lang === 'zh' ? '您已经评价过此房源' : 'You have already reviewed this property'}
          </div>
        ) : canReview ? (
          <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn btn-secondary' : 'btn btn-primary'} style={{ width: '100%' }}>
            <Star size={15} />{showForm ? (lang === 'zh' ? '取消' : 'Cancel') : (lang === 'zh' ? '发表评价' : 'Write a Review')}
          </button>
        ) : (
          <div className="mode-banner" style={{ background: 'var(--warning-light)', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
            <Star size={14} strokeWidth={1.5} />{lang === 'zh' ? '只有完成租约的租客才能发表评价' : 'Only tenants with completed leases can leave reviews'}
          </div>
        ))}
      </div>

      {/* ── Form ── */}
      {showForm && (
        <div className="glass-card" style={{ padding: 20, animation: 'fadeInUp 0.25s ease-out', position: 'relative' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500, letterSpacing: '0.04em' }}>
              {lang === 'zh' ? '请选择评分' : 'Select your rating'}
              <span style={{ position: 'relative', display: 'inline-flex' }}
                onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
                <Info size={14} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
                {showTip && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 8,
                    width: 280, padding: '14px 16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.1)',
                    fontSize: '0.78rem', color: 'var(--text-body)', lineHeight: 1.6,
                    zIndex: 20, animation: 'fadeInUp 0.2s ease-out',
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-h)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
                      {lang === 'zh' ? '温馨提示' : 'Friendly Reminder'}
                    </div>
                    {lang === 'zh'
                      ? '请根据您的真实体验实事求是地评价，您的反馈将帮助改善服务质量。平台严禁恶意评价，如发现不实内容，平台有权采取相应措施。'
                      : 'Please rate honestly based on your real experience. Your feedback helps improve service quality. The platform prohibits malicious reviews and reserves the right to take action against false content.'}
                  </div>
                )}
              </span>
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} role="radiogroup" aria-label={lang === 'zh' ? '评分选择' : 'Rating selection'}>
              {[1, 2, 3, 4, 5].map(star => {
                const active = star <= display;
                const hovered = hoverRating === star;
                return (
                  <button key={star} ref={el => { starsRef.current[star - 1] = el; }} role="radio" aria-checked={rating === star} aria-label={`${star} ${labels[star]}`} tabIndex={rating === star ? 0 : -1}
                    onClick={() => setRating(rating === star ? 0 : star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onKeyDown={e => handleKeyDown(e, star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)', transform: hovered ? 'scale(1.25)' : active ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-glow)'; }}
                    onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <Star size={28} fill={active ? starColor : 'none'} color={active ? starColor : 'var(--text-muted)'} strokeWidth={active ? 0 : 1.5}
                      style={{ transition: 'all 0.2s ease', filter: hovered ? `drop-shadow(0 0 6px ${starColor})` : 'none' }} />
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 8, minHeight: 20, fontSize: '0.82rem', fontWeight: 600, color: display > 0 ? starColor : 'transparent', transition: 'color 0.2s ease' }}>
              {display > 0 && `${display}/5 · ${labels[display]}`}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="review-comment" style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em' }}>
              {lang === 'zh' ? '评价内容（可选）' : 'Comment (optional)'}
            </label>
            <textarea id="review-comment" className="form-textarea" value={comment} onChange={e => setComment(e.target.value.slice(0, 500))}
              placeholder={lang === 'zh' ? '分享您的体验...' : 'Share your experience...'} maxLength={500}
              style={{ minHeight: 80, resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: comment.length > 450 ? 'var(--warning)' : 'var(--text-muted)', marginTop: 4, opacity: comment.length > 0 ? 1 : 0, transition: 'opacity 0.2s ease' }}>
              {comment.length}/500
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setRating(0); setComment(''); }} className="btn btn-secondary">
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button onClick={submitReview} disabled={submitting} className="btn btn-primary"
              style={{ cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />{lang === 'zh' ? '提交中...' : 'Submitting...'}</> : <><Send size={14} />{lang === 'zh' ? '提交' : 'Submit'}</>}
            </button>
          </div>

          {/* Toast — glassmorphism style */}
          {toast && (
            <div key={toast.key} style={{
              position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%) translateY(100%)',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.12), inset 0 1px 1px rgba(255,255,255,0.1)',
              fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)', whiteSpace: 'nowrap',
              animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
              zIndex: 20, pointerEvents: 'none',
            }}>
              <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              {toast.msg}
            </div>
          )}
        </div>
      )}

      {/* ── Review list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>{[1, 2, 3, 4, 5].map(s => <div key={s} style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--glass-border)', animation: `shimmer 1.5s ease-in-out ${s * 0.05}s infinite` }} />)}</div>
              <div style={{ width: `${60 + i * 10}%`, height: 10, borderRadius: 5, background: 'var(--glass-border)', animation: 'shimmer 1.5s ease-in-out 0.3s infinite' }} />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-card" style={{ padding: 28, textAlign: 'center', borderStyle: 'dashed' }}>
          <MessageSquare size={28} style={{ color: 'var(--text-muted)', marginBottom: 8, opacity: 0.4 }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '暂无评价' : 'No reviews yet'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.slice(0, MAX_VISIBLE).map((r, i) => <ReviewCard key={r.id} review={r} userId={userId} onDelete={deleteReview} lang={lang} index={i} canDeleteAll={canDeleteAll} />)}
          {reviews.length > MAX_VISIBLE && (
            <button onClick={() => setShowAll(true)} className="btn btn-secondary" style={{ gap: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = ''; }}>
              {lang === 'zh' ? `查看全部 ${reviews.length} 条评价` : `View all ${reviews.length} reviews`}<ChevronDown size={16} />
            </button>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      {showAll && (
        <div onClick={() => setShowAll(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease-out' }}>
          <div onClick={e => e.stopPropagation()} className="glass-card" style={{ width: '100%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0, animation: 'slideUp 0.25s ease-out', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} style={{ color: 'var(--primary)' }} />{lang === 'zh' ? `全部评价 (${reviews.length})` : `All Reviews (${reviews.length})`}
              </h3>
              <button onClick={() => setShowAll(false)} className="ctrl-btn" style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.map((r, i) => <ReviewCard key={r.id} review={r} userId={userId} onDelete={deleteReview} lang={lang} index={i} canDeleteAll={canDeleteAll} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(100%) scale(0.9); } to { opacity: 1; transform: translateX(-50%) translateY(100%) scale(1); } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
      `}</style>
    </div>
  );
}

function ReviewCard({ review, userId, onDelete, lang, index = 0, canDeleteAll = false }: { review: Review; userId: string | null; onDelete: (id: string) => void; lang: string; index?: number; canDeleteAll?: boolean; }) {
  const [confirm, setConfirm] = useState(false);
  const isOwner = userId === review.user_id;
  const showDel = isOwner || canDeleteAll;
  const color = review.rating >= 4 ? 'var(--success)' : review.rating >= 3 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="glass-card" style={{ padding: 14, animation: `fadeInUp 0.25s ease-out ${index * 0.05}s both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={13} fill={s <= review.rating ? color : 'none'} color={s <= review.rating ? color : 'var(--text-muted)'} strokeWidth={s <= review.rating ? 0 : 1.5} style={{ opacity: s <= review.rating ? 1 : 0.3 }} />)}
            {canDeleteAll && !isOwner && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 4, padding: '1px 5px', borderRadius: 'var(--radius-full)', background: 'var(--glass-border)' }}>{review.user_name || `ID: ${review.user_id?.slice(0, 8)}...`}</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{new Date(review.created_at).toLocaleDateString()}</div>
        </div>
        {showDel && (confirm ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => { onDelete(review.id); setConfirm(false); }} style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s ease' }}>
              {lang === 'zh' ? '确认删除' : 'Confirm'}
            </button>
            <button onClick={() => setConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 3, fontSize: '0.72rem' }}>
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} aria-label={lang === 'zh' ? '删除评价' : 'Delete review'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}>
            <Trash2 size={14} />
          </button>
        ))}
      </div>
      {review.comment && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.5 }}>{review.comment}</p>}
    </div>
  );
}
