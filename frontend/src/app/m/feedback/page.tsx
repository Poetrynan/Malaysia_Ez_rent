'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAdminDataLoader } from '@/lib/useAdminDataLoader';
import { useApp } from '@/lib/ThemeProvider';
import { MessageSquare, Send, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORY_LABELS: Record<string, { zh: string; en: string }> = {
  aircon: { zh: '空调', en: 'Aircon' },
  plumbing: { zh: '水管', en: 'Plumbing' },
  electrical: { zh: '电路', en: 'Electrical' },
  furniture: { zh: '家具', en: 'Furniture' },
  appliance: { zh: '电器', en: 'Appliance' },
  others: { zh: '其他', en: 'Others' },
};

const STATUS_CONFIG: Record<string, { zh: string; en: string; color: string; bg: string }> = {
  pending: { zh: '待处理', en: 'Pending', color: 'var(--warning)', bg: 'var(--warning-light)' },
  in_progress: { zh: '处理中', en: 'In Progress', color: 'var(--info)', bg: 'var(--info-light)' },
  resolved: { zh: '已解决', en: 'Resolved', color: 'var(--success)', bg: 'var(--success-light)' },
};

export default function MobileFeedback() {
  const { lang } = useApp();
  const { feedbacks, setFeedbacks, units, communities, isLoaded } = useAdminDataLoader();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks
      .filter((f: any) => filter === 'all' || f.status === filter)
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [feedbacks, filter]);

  const getUnitInfo = useCallback((unitId: string) => {
    const unit = units.find((u: any) => u.id === unitId);
    if (!unit) return null;
    const community = communities.find((c: any) => c.id === unit.community_id);
    return { unit, community };
  }, [units, communities]);

  const handleSendReply = async (feedbackId: string) => {
    const text = replyText[feedbackId]?.trim();
    if (!text) return;
    setSending(feedbackId);
    try {
      const fb = feedbacks.find((f: any) => f.id === feedbackId);
      if (!fb) return;

      const newReply = {
        author: 'agent',
        text,
        created_at: new Date().toISOString(),
      };
      const updatedReplies = [...(fb.replies || []), newReply];

      const { supabase, isMockDatabase } = await import('@/lib/supabase');
      if (isMockDatabase) {
        const allFeedbacks = JSON.parse(localStorage.getItem('ez_feedbacks') || '[]');
        const idx = allFeedbacks.findIndex((f: any) => f.id === feedbackId);
        if (idx >= 0) {
          allFeedbacks[idx].replies = updatedReplies;
          localStorage.setItem('ez_feedbacks', JSON.stringify(allFeedbacks));
        }
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        await client.from('feedbacks').update({ replies: updatedReplies }).eq('id', feedbackId);
      }

      setFeedbacks((prev: any[]) => prev.map(f =>
        f.id === feedbackId ? { ...f, replies: updatedReplies } : f
      ));
      setReplyText(prev => ({ ...prev, [feedbackId]: '' }));
    } catch (e) {
      console.error('Reply failed:', e);
    } finally {
      setSending(null);
    }
  };

  const handleResolve = async (feedbackId: string) => {
    try {
      const { supabase, isMockDatabase } = await import('@/lib/supabase');
      if (isMockDatabase) {
        const allFeedbacks = JSON.parse(localStorage.getItem('ez_feedbacks') || '[]');
        const idx = allFeedbacks.findIndex((f: any) => f.id === feedbackId);
        if (idx >= 0) {
          allFeedbacks[idx].status = 'resolved';
          allFeedbacks[idx].resolved_at = new Date().toISOString();
          localStorage.setItem('ez_feedbacks', JSON.stringify(allFeedbacks));
        }
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        await client.from('feedbacks').update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        }).eq('id', feedbackId);
      }

      setFeedbacks((prev: any[]) => prev.map(f =>
        f.id === feedbackId ? { ...f, status: 'resolved', resolved_at: new Date().toISOString() } : f
      ));
    } catch (e) {
      console.error('Resolve failed:', e);
    }
  };

  if (!isLoaded) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{
          width: 32, height: 32, border: '3px solid var(--glass-border)',
          borderTopColor: 'var(--primary)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {lang === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-h)',
          marginBottom: 4, letterSpacing: '-0.025em', fontFamily: 'var(--font-display)',
        }}>
          {lang === 'zh' ? '消息与反馈' : 'Messages & Feedback'}
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          {lang === 'zh'
            ? `${feedbacks.filter((f: any) => f.status !== 'resolved').length} 条待处理`
            : `${feedbacks.filter((f: any) => f.status !== 'resolved').length} open`}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto' }}>
        {(['all', 'pending', 'in_progress', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 9999, border: 'none',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              background: filter === f ? 'var(--primary)' : 'var(--glass-bg)',
              color: filter === f ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-body)',
            }}
          >
            {f === 'all' ? (lang === 'zh' ? '全部' : 'All') :
             f === 'pending' ? (lang === 'zh' ? '待处理' : 'Pending') :
             f === 'in_progress' ? (lang === 'zh' ? '处理中' : 'In Progress') :
             (lang === 'zh' ? '已解决' : 'Resolved')}
          </button>
        ))}
      </div>

      {/* Feedback list */}
      {filteredFeedbacks.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'var(--glass-bg)', borderRadius: 14,
          border: '1px solid var(--glass-border)',
        }}>
          <MessageSquare size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>
            {lang === 'zh' ? '暂无消息' : 'No messages'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {lang === 'zh' ? '租户反馈会显示在这里' : 'Tenant feedback will appear here'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredFeedbacks.map((fb: any) => {
            const expanded = expandedId === fb.id;
            const statusCfg = STATUS_CONFIG[fb.status] || STATUS_CONFIG.pending;
            const catLabel = CATEGORY_LABELS[fb.category]?.[lang as 'zh' | 'en'] || fb.category;
            const unitInfo = getUnitInfo(fb.unit_id);
            const replyCount = (fb.replies || []).length;

            return (
              <div key={fb.id} style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 14,
                overflow: 'hidden',
              }}>
                {/* Header - clickable to expand */}
                <button
                  onClick={() => setExpandedId(expanded ? null : fb.id)}
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {/* Status icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: statusCfg.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {fb.status === 'resolved'
                      ? <CheckCircle2 size={18} style={{ color: statusCfg.color }} />
                      : fb.status === 'in_progress'
                        ? <Clock size={18} style={{ color: statusCfg.color }} />
                        : <AlertCircle size={18} style={{ color: statusCfg.color }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
                        borderRadius: 9999, background: statusCfg.bg, color: statusCfg.color,
                      }}>
                        {statusCfg[lang as 'zh' | 'en']}
                      </span>
                      <span style={{
                        fontSize: '0.68rem', color: 'var(--text-muted)',
                      }}>
                        {catLabel}
                      </span>
                      {replyCount > 0 && (
                        <span style={{
                          fontSize: '0.65rem', color: 'var(--text-muted)',
                          marginLeft: 'auto',
                        }}>
                          {replyCount} {lang === 'zh' ? '条回复' : 'replies'}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)',
                      marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {fb.user_name || (lang === 'zh' ? '匿名租户' : 'Anonymous tenant')}
                    </div>
                    {unitInfo && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {unitInfo.community?.name} · {unitInfo.unit?.room_type}
                      </div>
                    )}
                  </div>

                  {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                </button>

                {/* Expanded content */}
                {expanded && (
                  <div style={{
                    borderTop: '1px solid var(--glass-border)',
                    padding: '14px 16px',
                  }}>
                    {/* Original message */}
                    {fb.message && (
                      <div style={{
                        fontSize: '0.82rem', color: 'var(--text-body)',
                        marginBottom: 12, lineHeight: 1.5,
                      }}>
                        {fb.message}
                      </div>
                    )}

                    {/* Photo evidence */}
                    {fb.photo_url && (
                      <img
                        src={fb.photo_url}
                        alt="evidence"
                        style={{
                          width: '100%', maxHeight: 200, objectFit: 'cover',
                          borderRadius: 10, marginBottom: 12,
                        }}
                      />
                    )}

                    {/* Replies thread */}
                    {(fb.replies || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        {(fb.replies || []).map((reply: any, i: number) => (
                          <div key={i} style={{
                            padding: '8px 12px', borderRadius: 10,
                            marginBottom: 6,
                            background: reply.author === 'agent' ? 'var(--primary-light)' : 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                          }}>
                            <div style={{
                              fontSize: '0.68rem', fontWeight: 700, marginBottom: 2,
                              color: reply.author === 'agent' ? 'var(--primary)' : 'var(--text-muted)',
                            }}>
                              {reply.author === 'agent'
                                ? (lang === 'zh' ? '🧑‍💼 中介' : '🧑‍💼 Agent')
                                : (lang === 'zh' ? '👤 租户' : '👤 Tenant')}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.4 }}>
                              {reply.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    {fb.status !== 'resolved' && (fb.replies || []).length < 3 && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          value={replyText[fb.id] || ''}
                          onChange={e => setReplyText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                          placeholder={lang === 'zh' ? '输入回复...' : 'Type reply...'}
                          onKeyDown={e => { if (e.key === 'Enter') handleSendReply(fb.id); }}
                          style={{
                            flex: 1, background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)', borderRadius: 10,
                            padding: '8px 12px', fontSize: '0.82rem',
                            color: 'var(--text-h)', fontFamily: 'var(--font-body)',
                          }}
                        />
                        <button
                          onClick={() => handleSendReply(fb.id)}
                          disabled={sending === fb.id || !replyText[fb.id]?.trim()}
                          style={{
                            width: 40, height: 40, borderRadius: 10, border: 'none',
                            background: replyText[fb.id]?.trim() ? 'var(--primary)' : 'var(--glass-border)',
                            color: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    )}

                    {/* Resolve button */}
                    {fb.status !== 'resolved' && (
                      <button
                        onClick={() => handleResolve(fb.id)}
                        style={{
                          width: '100%', marginTop: 10, padding: '10px',
                          borderRadius: 10, border: '1px solid var(--success)',
                          background: 'var(--success-light)', color: 'var(--success)',
                          fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        {lang === 'zh' ? '标记为已解决' : 'Mark as Resolved'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: 'center', marginTop: 32, fontSize: '0.72rem', color: 'var(--text-muted)',
      }}>
        Malaysia Ez Rent · {lang === 'zh' ? 'AI 智能租房系统' : 'AI Smart Rental System'}
      </div>
    </div>
  );
}
