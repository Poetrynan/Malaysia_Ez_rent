'use client';

import React, { useMemo, useState } from 'react';
import { Home, FileText, DollarSign, AlertTriangle, Wrench, TrendingUp, Clock, Users, Building2, BarChart3 } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Unit = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lease = any;
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

const COLORS = ['#0D9488', '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#DC2626'];

export default function Dashboard({
  units, leases, interests, feedbacks, communities,
  visibleUnitIds, visibleLeaseIds,
}: DashboardProps) {
  const { lang } = useApp();
  const [timeRange, setTimeRange] = useState<'1m' | '6m' | '1y' | 'custom'>('6m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

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

  const kpis = useMemo(() => {
    const totalUnits = visibleUnits.length;
    const rentedUnits = visibleUnits.filter(u => u.status === 'rented').length;
    const occupancyRate = totalUnits > 0 ? Math.round((rentedUnits / totalUnits) * 100) : 0;
    const activeLeases = visibleLeases.filter(l => l.status === 'active').length;
    const expiringLeases = visibleLeases.filter(l => {
      if (l.status !== 'active') return false;
      const diff = (new Date(l.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    }).length;
    const paidCount = filteredPayments.filter(p => p.paid).length;
    const totalCount = filteredPayments.length;
    const collectionRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
    const overdue = filteredPayments.filter(p => !p.paid && new Date(p.billing_month) < new Date()).length;
    const totalCollected = filteredPayments.filter(p => p.paid).reduce((s, p) => s + (p.amount || 0), 0);
    return { totalUnits, rentedUnits, occupancyRate, activeLeases, expiringLeases, collectionRate, overdue, totalCollected };
  }, [visibleUnits, visibleLeases, filteredPayments]);

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

  const roomTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    visibleUnits.forEach(u => { map[u.room_type] = (map[u.room_type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visibleUnits]);

  const communityData = useMemo(() => {
    const map: Record<string, number> = {};
    visibleUnits.forEach(u => {
      const comm = communities.find(c => c.id === u.community_id);
      map[comm?.name || 'Unknown'] = (map[comm?.name || 'Unknown'] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visibleUnits, communities]);

  const interestFunnel = useMemo(() => {
    const active = interests.filter((i: any) => i.status !== 'left');
    return {
      interested: active.filter((i: any) => i.status === 'interested').length,
      confirmed: active.filter((i: any) => i.status === 'confirmed').length,
    };
  }, [interests]);

  const maintenanceStats = useMemo(() => {
    const open = feedbacks.filter(f => f.status === 'pending' || f.status === 'in_progress').length;
    const resolved = feedbacks.filter(f => f.status === 'resolved').length;
    const avgDays = (() => {
      const items = feedbacks.filter(f => f.resolved_at);
      if (!items.length) return 0;
      return Math.round(items.reduce((s, f) => s + (new Date(f.resolved_at!).getTime() - new Date(f.created_at).getTime()) / 86400000, 0) / items.length);
    })();
    return { open, resolved, avgDays };
  }, [feedbacks]);

  const urgentItems = useMemo(() => {
    const items: { icon: React.ReactNode; text: string; color: string }[] = [];
    if (kpis.overdue > 0) items.push({ icon: <DollarSign size={14} />, text: `${kpis.overdue} ${lang === 'zh' ? '笔账单逾期未付' : 'bills overdue'}`, color: 'var(--danger)' });
    if (maintenanceStats.open > 0) items.push({ icon: <Wrench size={14} />, text: `${maintenanceStats.open} ${lang === 'zh' ? '条报修工单待处理' : 'tickets open'}`, color: 'var(--warning)' });
    if (kpis.expiringLeases > 0) items.push({ icon: <Clock size={14} />, text: `${kpis.expiringLeases} ${lang === 'zh' ? '个租约即将到期' : 'leases expiring'}`, color: 'var(--primary)' });
    return items;
  }, [kpis, maintenanceStats, lang]);

  const maxRevenue = useMemo(() => Math.max(...revenueData.map(d => d.receivable), 1), [revenueData]);

  // ---- Styles ----
  const card: React.CSSProperties = { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '18px 20px', transition: 'all 0.2s ease' };
  const kpiCard: React.CSSProperties = { ...card, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' };
  const label: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.03em' };
  const value: React.CSSProperties = { fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-h)', lineHeight: 1, letterSpacing: '-0.02em' };
  const sub: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)' };
  const title: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-h)', margin: 0 }}>{lang === 'zh' ? '数据看板' : 'Dashboard'}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: 3 }}>
          {(['1m', '6m', '1y'] as const).map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', background: timeRange === r ? 'var(--primary)' : 'transparent', color: timeRange === r ? '#fff' : 'var(--text-muted)', border: 'none', transition: 'all 0.2s' }}>
              {r === '1m' ? '1M' : r === '6m' ? '6M' : '1Y'}
            </button>
          ))}
          <button onClick={() => setTimeRange('custom')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', background: timeRange === 'custom' ? 'var(--primary)' : 'transparent', color: timeRange === 'custom' ? '#fff' : 'var(--text-muted)', border: 'none', transition: 'all 0.2s' }}>
            {lang === 'zh' ? '自定义' : 'Custom'}
          </button>
        </div>
      </div>

      {timeRange === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-body)', fontSize: '0.78rem', cursor: 'pointer' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{lang === 'zh' ? '至' : 'to'}</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-body)', fontSize: '0.78rem', cursor: 'pointer' }} />
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Home size={16} style={{ color: 'var(--primary)' }} /></div>
            <span style={label}>{lang === 'zh' ? '出租率' : 'Occupancy'}</span>
          </div>
          <div style={value}>{kpis.rentedUnits}<span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>/{kpis.totalUnits}</span></div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${kpis.occupancyRate}%`, background: 'linear-gradient(90deg, #0D9488, #059669)', borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <span style={sub}>{kpis.occupancyRate}% {lang === 'zh' ? '已出租' : 'rented'}</span>
        </div>
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} style={{ color: '#2563EB' }} /></div>
            <span style={label}>{lang === 'zh' ? '有效租约' : 'Leases'}</span>
          </div>
          <div style={value}>{kpis.activeLeases}</div>
          <span style={sub}>{kpis.expiringLeases > 0 ? `${kpis.expiringLeases} ${lang === 'zh' ? '即将到期' : 'expiring'}` : (lang === 'zh' ? '暂无到期' : 'None expiring')}</span>
        </div>
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={16} style={{ color: 'var(--success)' }} /></div>
            <span style={label}>{lang === 'zh' ? '收租率' : 'Collection'}</span>
          </div>
          <div style={{ ...value, color: kpis.collectionRate >= 80 ? 'var(--success)' : kpis.collectionRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{kpis.collectionRate}%</div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${kpis.collectionRate}%`, background: kpis.collectionRate >= 80 ? '#059669' : '#D97706', borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <span style={sub}>RM {kpis.totalCollected.toLocaleString()}</span>
        </div>
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: kpis.overdue > 0 ? 'var(--danger-light)' : 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={16} style={{ color: kpis.overdue > 0 ? 'var(--danger)' : 'var(--success)' }} /></div>
            <span style={label}>{lang === 'zh' ? '逾期' : 'Overdue'}</span>
          </div>
          <div style={{ ...value, color: kpis.overdue > 0 ? 'var(--danger)' : 'var(--success)' }}>{kpis.overdue}</div>
          <span style={sub}>{kpis.overdue > 0 ? (lang === 'zh' ? '笔未付' : 'unpaid') : (lang === 'zh' ? '全部按时' : 'All on time')}</span>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
        {/* Revenue Bar Chart (Pure CSS) */}
        <div style={card}>
          <div style={title}><TrendingUp size={16} style={{ color: 'var(--primary)' }} />{lang === 'zh' ? '月收入趋势' : 'Monthly Revenue'}</div>
          {revenueData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, padding: '0 4px' }}>
              {revenueData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>RM{(d.collected / 1000).toFixed(0)}k</div>
                  <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
                    <div style={{ flex: 1, height: `${(d.collected / maxRevenue) * 100}%`, background: '#059669', borderRadius: '3px 3px 0 0', transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)', minHeight: 2 }} />
                    <div style={{ flex: 1, height: `${(d.receivable / maxRevenue) * 100}%`, background: '#2563EB', borderRadius: '3px 3px 0 0', opacity: 0.25, transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)', minHeight: 2 }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{d.month.slice(5)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'zh' ? '暂无数据' : 'No data'}</div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#059669', display: 'inline-block' }} />{lang === 'zh' ? '已收' : 'Collected'}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563EB', opacity: 0.25, display: 'inline-block' }} />{lang === 'zh' ? '应收' : 'Receivable'}</span>
          </div>
        </div>

        {/* Room Type Donut (Pure CSS) */}
        <div style={card}>
          <div style={title}><Building2 size={16} style={{ color: 'var(--primary)' }} />{lang === 'zh' ? '房源分布' : 'Room Types'}</div>
          {roomTypeData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
              {/* Donut via conic-gradient */}
              {(() => {
                const total = roomTypeData.reduce((s, d) => s + d.value, 0);
                let acc = 0;
                const stops = roomTypeData.map((d, i) => {
                  const start = (acc / total) * 360;
                  acc += d.value;
                  const end = (acc / total) * 360;
                  return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`;
                }).join(', ');
                return (
                  <div style={{ width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(${stops})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-surface-solid, var(--glass-bg))' }} />
                  </div>
                );
              })()}
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {roomTypeData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-body)' }}>{d.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'zh' ? '暂无房源' : 'No listings'}</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Community Distribution */}
        <div style={card}>
          <div style={title}><Building2 size={16} style={{ color: 'var(--primary)' }} />{lang === 'zh' ? '按小区分布' : 'By Community'}</div>
          {communityData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {communityData.sort((a, b) => b.value - a.value).slice(0, 6).map((c, i) => {
                const max = Math.max(...communityData.map(x => x.value));
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{c.value}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--glass-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.value / max) * 100}%`, background: COLORS[i % COLORS.length], borderRadius: 4, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'zh' ? '暂无数据' : 'No data'}</div>}
        </div>

        {/* Interest + Maintenance */}
        <div style={card}>
          <div style={title}><Users size={16} style={{ color: 'var(--primary)' }} />{lang === 'zh' ? '意向与报修' : 'Interests & Maintenance'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: lang === 'zh' ? '意向中' : 'Interested', value: interestFunnel.interested, color: '#2563EB' },
              { label: lang === 'zh' ? '已确认' : 'Confirmed', value: interestFunnel.confirmed, color: '#059669' },
            ].map((item, i) => {
              const max = Math.max(interestFunnel.interested, interestFunnel.confirmed, 1);
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{item.value}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--glass-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(item.value / max) * 100}%`, background: item.color, borderRadius: 4, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
                  </div>
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wrench size={14} style={{ color: 'var(--warning)' }} /></div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)' }}>{lang === 'zh' ? '报修概览' : 'Maintenance'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning)' }}>{maintenanceStats.open}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '待处理' : 'Open'}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>{maintenanceStats.resolved}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '已解决' : 'Resolved'}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-body)' }}>{maintenanceStats.avgDays}<span style={{ fontSize: '0.72rem' }}>{lang === 'zh' ? '天' : 'd'}</span></div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '平均' : 'Avg'}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Items */}
      {urgentItems.length > 0 && (
        <div style={{ ...card, borderLeft: '3px solid var(--danger)', background: 'var(--danger-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)' }}>{lang === 'zh' ? '待办事项' : 'Action Required'}</span>
          </div>
          {urgentItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', padding: '4px 0' }}>
              <div style={{ color: item.color, display: 'flex' }}>{item.icon}</div>
              <span style={{ color: item.color, fontWeight: 500 }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
