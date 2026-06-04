'use client';

import { useState, useEffect } from 'react';
import { Star, Users } from 'lucide-react';
import { isMockDatabase } from '@/lib/supabase';

interface Props { agentId: string; lang: string; }

export default function AgentRatingSummary({ agentId, lang }: Props) {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (isMockDatabase) {
        const ratings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
        const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
        const units = JSON.parse(localStorage.getItem('ez_units') || '[]');
        const ar = ratings.filter((r: any) => {
          const l = leases.find((x: any) => x.id === r.lease_id);
          if (!l) return false;
          return units.find((u: any) => u.id === l.unit_id)?.agent_id === agentId;
        });
        if (ar.length > 0) { setAvg(Math.round(ar.reduce((s: number, r: any) => s + r.rating, 0) / ar.length * 10) / 10); setCount(ar.length); }
      } else {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const { data } = await (await createClient()).rpc('get_agent_average_rating', { p_agent_id: agentId });
          if (data?.length > 0) { setAvg(data[0].average_rating || 0); setCount(data[0].total_ratings || 0); }
        } catch (e) { console.error(e); }
      }
      setLoading(false);
    };
    load();
  }, [agentId]);

  if (loading) return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--glass-border)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: 70, height: 14, borderRadius: 7, background: 'var(--glass-border)', marginBottom: 6, animation: 'shimmer 1.5s ease-in-out 0.1s infinite' }} />
        <div style={{ width: 110, height: 10, borderRadius: 5, background: 'var(--glass-border)', animation: 'shimmer 1.5s ease-in-out 0.2s infinite' }} />
      </div>
      <style jsx>{`@keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );

  if (count === 0) return (
    <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Star size={20} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </span>
      <div>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 2 }}>{lang === 'zh' ? '租客评分' : 'Tenant Ratings'}</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{lang === 'zh' ? '暂无租客评价' : 'No tenant ratings yet'}</p>
      </div>
    </div>
  );

  const full = Math.floor(avg);
  const half = avg - full >= 0.3;

  return (
    <div className="glass-card" style={{ padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
      <span style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', border: '1px solid var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
        {avg.toFixed(1)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
          {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} fill={s <= full || (s === full + 1 && half) ? 'var(--warning)' : 'none'} color={s <= full || (s === full + 1 && half) ? 'var(--warning)' : 'var(--text-muted)'} strokeWidth={s <= full ? 0 : 1.5} style={{ opacity: s <= full || (s === full + 1 && half) ? 1 : 0.3 }} />)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <Users size={12} strokeWidth={2} />{count} {lang === 'zh' ? '条评价' : 'ratings'}
        </div>
      </div>
    </div>
  );
}
