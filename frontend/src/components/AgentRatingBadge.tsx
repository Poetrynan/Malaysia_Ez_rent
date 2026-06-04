'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { isMockDatabase } from '@/lib/supabase';

interface Props { agentId: string; size?: 'small' | 'medium'; }

export default function AgentRatingBadge({ agentId, size = 'small' }: Props) {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (isMockDatabase) {
        const ratings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
        const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
        const units = JSON.parse(localStorage.getItem('ez_units') || '[]');
        const ar = ratings.filter((r: any) => { const l = leases.find((x: any) => x.id === r.lease_id); if (!l) return false; return units.find((u: any) => u.id === l.unit_id)?.agent_id === agentId; });
        if (ar.length > 0) { setAvg(Math.round(ar.reduce((s: number, r: any) => s + r.rating, 0) / ar.length * 10) / 10); setCount(ar.length); }
      } else {
        try { const { createClient } = await import('@/utils/supabase/client'); const { data } = await (await createClient()).rpc('get_agent_average_rating', { p_agent_id: agentId }); if (data?.length > 0) { setAvg(data[0].average_rating || 0); setCount(data[0].total_ratings || 0); } } catch (e) { console.error(e); }
      }
      setLoading(false);
    };
    load();
  }, [agentId]);

  if (loading || count === 0) return null;

  const sm = size === 'small';

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: sm ? 3 : 5,
        padding: sm ? '2px 6px' : '3px 8px', borderRadius: sm ? 6 : 'var(--radius-sm)',
        background: 'var(--primary-light)', border: '1px solid var(--primary)',
      }}
      title={`${avg.toFixed(1)}/5 · ${count} ${count === 1 ? 'rating' : 'ratings'}`}
    >
      <Star size={sm ? 11 : 14} fill="var(--warning)" color="var(--warning)" strokeWidth={0} />
      <span style={{ fontSize: sm ? '0.68rem' : '0.78rem', fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{avg.toFixed(1)}</span>
      <span style={{ fontSize: sm ? '0.6rem' : '0.7rem', color: 'var(--text-muted)', lineHeight: 1 }}>({count})</span>
    </span>
  );
}
