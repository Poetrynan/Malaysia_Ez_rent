'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { isMockDatabase } from '@/lib/supabase';

interface AgentRatingSummaryProps {
  agentId: string;
  lang: string;
}

export default function AgentRatingSummary({ agentId, lang }: AgentRatingSummaryProps) {
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRatings = async () => {
      if (isMockDatabase) {
        const ratings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
        // 获取该中介的所有评价
        const agentRatings = ratings.filter((r: any) => {
          // 需要通过 lease 找到 agent_id
          const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
          const units = JSON.parse(localStorage.getItem('ez_units') || '[]');
          const lease = leases.find((l: any) => l.id === r.lease_id);
          if (!lease) return false;
          const unit = units.find((u: any) => u.id === lease.unit_id);
          return unit?.agent_id === agentId;
        });

        if (agentRatings.length > 0) {
          const avg = agentRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / agentRatings.length;
          setAverageRating(Math.round(avg * 10) / 10);
          setTotalRatings(agentRatings.length);
        }
      } else {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data } = await supabase.rpc('get_agent_average_rating', { p_agent_id: agentId });
          if (data && data.length > 0) {
            setAverageRating(data[0].average_rating || 0);
            setTotalRatings(data[0].total_ratings || 0);
          }
        } catch (e) {
          console.error('Load agent ratings error:', e);
        }
      }
      setLoading(false);
    };
    loadRatings();
  }, [agentId]);

  if (loading) {
    return (
      <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {lang === 'zh' ? '加载评分...' : 'Loading ratings...'}
      </div>
    );
  }

  if (totalRatings === 0) {
    return (
      <div style={{
        padding: '16px',
        borderRadius: 12,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Star size={20} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-h)' }}>
            {lang === 'zh' ? '租客评分' : 'Tenant Ratings'}
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          {lang === 'zh' ? '暂无租客评价' : 'No tenant ratings yet'}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))',
      border: '1px solid rgba(245, 158, 11, 0.2)',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Star size={20} style={{ color: '#f59e0b' }} fill="#f59e0b" />
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-h)' }}>
          {lang === 'zh' ? '租客评分' : 'Tenant Ratings'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
          {averageRating.toFixed(1)}
        </span>
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
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          ({totalRatings} {lang === 'zh' ? '条评价' : 'ratings'})
        </span>
      </div>
    </div>
  );
}
