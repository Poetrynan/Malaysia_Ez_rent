'use client';

import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Home, FileText, DollarSign, AlertTriangle, Wrench, TrendingUp, TrendingDown, Clock, Users, Building2, BarChart3 } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

// ---- Types (loose to match AdminPanel's types) ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Unit = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lease = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Payment = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Interest = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeedbackItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Community = any;

interface DashboardProps {
  units: Unit[];
  leases: Lease[];
  interests: Interest[];
  feedbacks: FeedbackItem[];
  communities: Community[];
  visibleUnitIds: string[];
  visibleLeaseIds: string[];
}

// Design system colors (from ui-ux-pro-max skill)
const CHART_COLORS = {
  primary: '#0D9488',    // teal-600
  success: '#059669',    // emerald-600
  warning: '#D97706',    // amber-600
  danger: '#DC2626',     // red-600
  blue: '#2563EB',       // blue-600
  purple: '#7C3AED',     // violet-600
  pink: '#DB2777',       // pink-600
  slate: '#64748B',      // slate-500
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.warning, CHART_COLORS.purple, CHART_COLORS.pink, CHART_COLORS.danger];

export default function Dashboard({
  units, leases, interests, feedbacks, communities,
  visibleUnitIds, visibleLeaseIds,
}: DashboardProps) {
  const { lang } = useApp();
  const [timeRange, setTimeRange] = useState<'1m' | '6m' | '1y' | 'custom'>('6m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // ---- Date range filter ----
  const dateRange = useMemo(() => {
    const now = new Date();
    if (timeRange === '1m') return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (timeRange === '6m') return new Date(now.getFullYear(), now.getMonth() - 6, 1);
    if (timeRange === '1y') return new Date(now.getFullYear() - 1, now.getMonth(), 1);
    if (customStart) return new Date(customStart);
    return new Date(now.getFullYear(), now.getMonth() - 6, 1);
  }, [timeRange, customStart]);

  const dateRangeEnd = useMemo(() => {
    if (timeRange === 'custom' && customEnd) return new Date(customEnd);
    return new Date();
  }, [timeRange, customEnd]);

  // ---- Filtered data ----
  const visibleUnits = useMemo(() => units.filter(u => visibleUnitIds.includes(u.id)), [units, visibleUnitIds]);
  const visibleLeases = useMemo(() => leases.filter(l => visibleLeaseIds.includes(l.id)), [leases, visibleLeaseIds]);

  const filteredPayments = useMemo(() => {
    const all: any[] = [];
    visibleLeases.forEach((l: any) => {
      const rent = l.monthly_rent || 0;
      l.payments?.forEach((p: any) => all.push({ ...p, amount: p.amount || rent }));
    });
    return all.filter((p: any) => {
      const d = new Date(p.billing_month);
      return d >= dateRange && d <= dateRangeEnd;
    });
  }, [visibleLeases, dateRange, dateRangeEnd]);

  // ---- KPI Cards ----
  const kpis = useMemo(() => {
    const totalUnits = visibleUnits.length;
    const rentedUnits = visibleUnits.filter(u => u.status === 'rented').length;
    const occupancyRate = totalUnits > 0 ? Math.round((rentedUnits / totalUnits) * 100) : 0;

    const activeLeases = visibleLeases.filter(l => l.status === 'active').length;
    const expiringLeases = visibleLeases.filter(l => {
      if (l.status !== 'active') return false;
      const end = new Date(l.end_date);
      const diff = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    }).length;

    const paidCount = filteredPayments.filter(p => p.paid).length;
    const totalCount = filteredPayments.length;
    const collectionRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

    const overdue = filteredPayments.filter(p => !p.paid && new Date(p.billing_month) < new Date()).length;

    const totalCollected = filteredPayments.filter(p => p.paid).reduce((s, p) => s + (p.amount || 0), 0);
    const totalReceivable = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);

    return { totalUnits, rentedUnits, occupancyRate, activeLeases, expiringLeases, collectionRate, overdue, totalCollected, totalReceivable };
  }, [visibleUnits, visibleLeases, filteredPayments]);

  // ---- Monthly Revenue Chart ----
  const revenueData = useMemo(() => {
    const map: Record<string, { month: string; collected: number; receivable: number }> = {};
    filteredPayments.forEach(p => {
      const key = p.billing_month.slice(0, 7);
      if (!map[key]) map[key] = { month: key, collected: 0, receivable: 0 };
      map[key].receivable += (p.amount || 0);
      if (p.paid) map[key].collected += (p.amount || 0);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredPayments]);

  // ---- Room Type Distribution ----
  const roomTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    visibleUnits.forEach(u => { map[u.room_type] = (map[u.room_type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visibleUnits]);

  // ---- Community Distribution ----
  const communityData = useMemo(() => {
    const map: Record<string, number> = {};
    visibleUnits.forEach(u => {
      const comm = communities.find(c => c.id === u.community_id);
      const name = comm?.name || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visibleUnits, communities]);

  // ---- Interest Funnel ----
  const interestFunnel = useMemo(() => {
    const active = interests.filter(i => i.status !== 'left');
    const interested = active.filter(i => i.status === 'interested').length;
    const confirmed = active.filter(i => i.status === 'confirmed').length;
    return { interested, confirmed, total: interested + confirmed };
  }, [interests]);

  // ---- Maintenance Stats ----
  const maintenanceStats = useMemo(() => {
    const open = feedbacks.filter(f => f.status === 'pending' || f.status === 'in_progress').length;
    const resolved = feedbacks.filter(f => f.status === 'resolved').length;
    const avgDays = (() => {
      const resolvedItems = feedbacks.filter(f => f.resolved_at);
      if (resolvedItems.length === 0) return 0;
      const total = resolvedItems.reduce((s, f) => {
        const diff = (new Date(f.resolved_at!).getTime() - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return s + diff;
      }, 0);
      return Math.round(total / resolvedItems.length);
    })();
    return { open, resolved, avgDays };
  }, [feedbacks]);

  // ---- Urgent Items ----
  const urgentItems = useMemo(() => {
    const items: { icon: React.ReactNode; text: string; color: string }[] = [];
    if (kpis.overdue > 0) items.push({ icon: <DollarSign size={14} />, text: `${kpis.overdue} ${lang === 'zh' ? '笔账单逾期未付' : 'bills overdue'}`, color: 'var(--danger)' });
    if (maintenanceStats.open > 0) items.push({ icon: <Wrench size={14} />, text: `${maintenanceStats.open} ${lang === 'zh' ? '条报修工单待处理' : 'maintenance tickets open'}`, color: 'var(--warning)' });
    if (kpis.expiringLeases > 0) items.push({ icon: <Clock size={14} />, text: `${kpis.expiringLeases} ${lang === 'zh' ? '个租约将在30天内到期' : 'leases expiring within 30 days'}`, color: 'var(--primary)' });
    return items;
  }, [kpis, maintenanceStats, lang]);

  // ---- Design Tokens (following ui-ux-pro-max skill recommendations) ----
  const cardStyle: React.CSSProperties = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 12,
    padding: '18px 20px',
    transition: 'all 0.2s ease',
  };

  const kpiCardStyle: React.CSSProperties = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'default',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--text-h)',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  };

  const subStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-h)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    letterSpacing: '-0.01em',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
      {/* ---- Header + Time Range Selector ---- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-h)', margin: 0, letterSpacing: '-0.02em' }}>
            {lang === 'zh' ? '数据看板' : 'Dashboard'}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: 3 }}>
          {(['1m', '6m', '1y'] as const).map(r => (
            <button key={r} onClick={() => setTimeRange(r)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                background: timeRange === r ? 'var(--primary)' : 'transparent',
                color: timeRange === r ? '#fff' : 'var(--text-muted)',
                border: 'none',
                transition: 'all 0.2s ease',
              }}>
              {r === '1m' ? (lang === 'zh' ? '1个月' : '1M') : r === '6m' ? (lang === 'zh' ? '6个月' : '6M') : (lang === 'zh' ? '1年' : '1Y')}
            </button>
          ))}
          <button onClick={() => setTimeRange('custom')}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              background: timeRange === 'custom' ? 'var(--primary)' : 'transparent',
              color: timeRange === 'custom' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              transition: 'all 0.2s ease',
            }}>
            {lang === 'zh' ? '自定义' : 'Custom'}
          </button>
        </div>
      </div>

      {/* ---- Custom Date Inputs ---- */}
      {timeRange === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-body)', fontSize: '0.78rem', cursor: 'pointer' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{lang === 'zh' ? '至' : 'to'}</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-body)', fontSize: '0.78rem', cursor: 'pointer' }} />
        </div>
      )}

      {/* ---- KPI Cards Row ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {/* Occupancy */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <span style={labelStyle}>{lang === 'zh' ? '出租率' : 'Occupancy'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, color: 'var(--success)' }}>
              <TrendingUp size={12} />
              <span>{kpis.occupancyRate}%</span>
            </div>
          </div>
          <div style={valueStyle}>{kpis.rentedUnits}<span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>/{kpis.totalUnits}</span></div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--glass-border)', marginTop: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${kpis.occupancyRate}%`, background: `linear-gradient(90deg, ${CHART_COLORS.primary}, ${CHART_COLORS.success})`, borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
        </div>

        {/* Active Leases */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37, 99, 235, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={16} style={{ color: CHART_COLORS.blue }} />
              </div>
              <span style={labelStyle}>{lang === 'zh' ? '有效租约' : 'Leases'}</span>
            </div>
            {kpis.expiringLeases > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, color: 'var(--warning)' }}>
                <AlertTriangle size={12} />
                <span>{kpis.expiringLeases}</span>
              </div>
            )}
          </div>
          <div style={valueStyle}>{kpis.activeLeases}</div>
          <span style={subStyle}>
            {kpis.expiringLeases > 0
              ? (lang === 'zh' ? `${kpis.expiringLeases} 个即将到期` : `${kpis.expiringLeases} expiring soon`)
              : (lang === 'zh' ? '暂无到期租约' : 'No leases expiring')
            }
          </span>
        </div>

        {/* Collection Rate */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={16} style={{ color: 'var(--success)' }} />
              </div>
              <span style={labelStyle}>{lang === 'zh' ? '收租率' : 'Collection'}</span>
            </div>
          </div>
          <div style={{ ...valueStyle, color: kpis.collectionRate >= 80 ? 'var(--success)' : kpis.collectionRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
            {kpis.collectionRate}%
          </div>
          <span style={subStyle}>RM {kpis.totalCollected.toLocaleString()}</span>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--glass-border)', marginTop: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${kpis.collectionRate}%`, background: kpis.collectionRate >= 80 ? CHART_COLORS.success : CHART_COLORS.warning, borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
        </div>

        {/* Overdue */}
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: kpis.overdue > 0 ? 'var(--danger-light)' : 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={16} style={{ color: kpis.overdue > 0 ? 'var(--danger)' : 'var(--success)' }} />
              </div>
              <span style={labelStyle}>{lang === 'zh' ? '逾期' : 'Overdue'}</span>
            </div>
          </div>
          <div style={{ ...valueStyle, color: kpis.overdue > 0 ? 'var(--danger)' : 'var(--success)' }}>{kpis.overdue}</div>
          <span style={subStyle}>
            {kpis.overdue > 0
              ? (lang === 'zh' ? '笔未付款项' : 'unpaid bills')
              : (lang === 'zh' ? '全部按时' : 'All on time')
            }
          </span>
        </div>
      </div>

      {/* ---- Charts Row 1: Revenue + Room Type ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
        {/* Revenue Trend */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
            {lang === 'zh' ? '月收入趋势' : 'Monthly Revenue'}
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60}
                  tickFormatter={(v: number) => `RM${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface-solid, #1e1e24)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 10,
                    fontSize: '0.78rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  }}
                  cursor={{ fill: 'var(--primary-light)', radius: 4 }}
                  formatter={(value: any) => [`RM ${Number(value).toLocaleString()}`, '']}
                />
                <Bar dataKey="collected" name={lang === 'zh' ? '已收' : 'Collected'} fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="receivable" name={lang === 'zh' ? '应收' : 'Receivable'} fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} opacity={0.25} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', flexDirection: 'column', gap: 8 }}>
              <BarChart3 size={28} style={{ opacity: 0.4 }} />
              {lang === 'zh' ? '暂无收入数据' : 'No revenue data'}
            </div>
          )}
        </div>

        {/* Room Type Pie */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <Building2 size={16} style={{ color: 'var(--primary)' }} />
            {lang === 'zh' ? '房源分布' : 'Room Types'}
          </div>
          {roomTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={roomTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                  style={{ fontSize: '0.7rem', fill: 'var(--text-body)' }}>
                  {roomTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface-solid, #1e1e24)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 10,
                    fontSize: '0.78rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', flexDirection: 'column', gap: 8 }}>
              <Home size={28} style={{ opacity: 0.4 }} />
              {lang === 'zh' ? '暂无房源' : 'No listings'}
            </div>
          )}
        </div>
      </div>

      {/* ---- Charts Row 2: Community + Interest/Maintenance ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Community Distribution */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <Building2 size={16} style={{ color: 'var(--primary)' }} />
            {lang === 'zh' ? '按小区分布' : 'By Community'}
          </div>
          {communityData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {communityData.sort((a, b) => b.value - a.value).slice(0, 6).map((c, i) => {
                const max = Math.max(...communityData.map(x => x.value));
                const pct = max > 0 ? (c.value / max) * 100 : 0;
                return (
                  <div key={i} style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{c.value}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--glass-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]}, ${PIE_COLORS[i % PIE_COLORS.length]}dd)`, borderRadius: 4, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {lang === 'zh' ? '暂无数据' : 'No data'}
            </div>
          )}
        </div>

        {/* Interest Funnel + Maintenance */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <Users size={16} style={{ color: 'var(--primary)' }} />
            {lang === 'zh' ? '意向与报修' : 'Interests & Maintenance'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Funnel bars */}
            {[
              { label: lang === 'zh' ? '意向中' : 'Interested', value: interestFunnel.interested, color: CHART_COLORS.blue },
              { label: lang === 'zh' ? '已确认' : 'Confirmed', value: interestFunnel.confirmed, color: CHART_COLORS.success },
            ].map((item, i) => {
              const max = Math.max(interestFunnel.interested, interestFunnel.confirmed, 1);
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{item.value}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--glass-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(item.value / max) * 100}%`, background: item.color, borderRadius: 4, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </div>
                </div>
              );
            })}

            {/* Maintenance summary */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={14} style={{ color: 'var(--warning)' }} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)' }}>
                  {lang === 'zh' ? '报修概览' : 'Maintenance'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning)' }}>{maintenanceStats.open}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '待处理' : 'Open'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>{maintenanceStats.resolved}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '已解决' : 'Resolved'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-body)' }}>{maintenanceStats.avgDays}<span style={{ fontSize: '0.72rem', fontWeight: 400 }}>{lang === 'zh' ? '天' : 'd'}</span></div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '平均处理' : 'Avg Time'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Urgent Items ---- */}
      {urgentItems.length > 0 && (
        <div style={{ ...cardStyle, borderLeft: '3px solid var(--danger)', background: 'var(--danger-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)' }}>
              {lang === 'zh' ? '待办事项' : 'Action Required'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {urgentItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', padding: '4px 0' }}>
                <div style={{ color: item.color, display: 'flex', alignItems: 'center' }}>{item.icon}</div>
                <span style={{ color: item.color, fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
