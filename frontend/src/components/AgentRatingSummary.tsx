'use client';

import { useState, useEffect } from 'react';
import { Star, Users } from 'lucide-react';
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
        const agentRatings = ratings.filter((r: any) => {
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
      <div style={{
        padding: 16,
        borderRadius: 14,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--glass-border)',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            width: 80, height: 12, borderRadius: 6,
            background: 'var(--glass-border)',
            marginBottom: 6,
            animation: 'shimmer 1.5s ease-in-out infinite 0.1s',
          }} />
          <div style={{
            width: 120, height: 10, borderRadius: 5,
            background: 'var(--glass-border)',
            animation: 'shimmer 1.5s ease-in-out infinite 0.2s',
          }} />
        </div>
        <style jsx>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  if (totalRatings === 0) {
    return (
      <div style={{
        padding: '16px 20px',
        borderRadius: 14,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(245, 158, 11, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Star size={20} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
        </div>
        <div>
          <div style={{
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--text-h)',
            marginBottom: 2,
          }}>
            {lang === 'zh' ? '租客评分' : 'Tenant Ratings'}
          </div>
          <p style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            margin: 0,
          }}>
            {lang === 'zh' ? '暂无租客评价' : 'No tenant ratings yet'}
          </p>
        </div>
      </div>
    );
  }

  const fullStars = Math.floor(averageRating);
  const hasHalf = averageRating - fullStars >= 0.3;

  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))',
      border: '1px solid rgba(245, 158, 11, 0.18)',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      {/* Score circle */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.06))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '1.3rem',
          fontWeight: 800,
          color: '#f59e0b',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {averageRating.toFixed(1)}
        </span>
      </div>

      {/* Stars + count */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              size={16}
              fill={star <= fullStars ? '#f59e0b' : (star === fullStars + 1 && hasHalf ? '#f59e0b' : 'none')}
              color={star <= fullStars || (star === fullStars + 1 && hasHalf) ? '#f59e0b' : 'var(--text-muted)'}
              strokeWidth={star <= fullStars ? 0 : 1.5}
              style={{
                opacity: star <= fullStars || (star === fullStars + 1 && hasHalf) ? 1 : 0.3,
              }}
            />
          ))}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}>
          <Users size={12} strokeWidth={2} />
          <span>
            {totalRatings} {lang === 'zh' ? '条评价' : 'ratings'}
          </span>
        </div>
      </div>
    </div>
  );
}
