'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { isMockDatabase } from '@/lib/supabase';

interface AgentRatingBadgeProps {
  agentId: string;
  size?: 'small' | 'medium';
}

export default function AgentRatingBadge({ agentId, size = 'small' }: AgentRatingBadgeProps) {
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRating = async () => {
      if (isMockDatabase) {
        const ratings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
        const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
        const units = JSON.parse(localStorage.getItem('ez_units') || '[]');

        const agentRatings = ratings.filter((r: any) => {
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
          console.error('Load agent rating error:', e);
        }
      }
      setLoading(false);
    };
    loadRating();
  }, [agentId]);

  if (loading || totalRatings === 0) return null;

  const iconSize = size === 'small' ? 10 : 14;
  const fontSize = size === 'small' ? '0.65rem' : '0.78rem';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <Star size={iconSize} fill="#f59e0b" color="#f59e0b" />
      <span style={{ fontSize, fontWeight: 600, color: '#f59e0b' }}>
        {averageRating.toFixed(1)}
      </span>
      <span style={{ fontSize, color: 'var(--text-muted)' }}>
        ({totalRatings})
      </span>
    </span>
  );
}
