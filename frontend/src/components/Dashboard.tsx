'use client';

import React, { useMemo, useState } from 'react';
import { Home, FileText, DollarSign, AlertTriangle, Wrench, TrendingUp, Clock, Users, Building2, BarChart3, HelpCircle } from 'lucide-react';
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
  const [hoveredSlice, setHoveredSlice] = useState<{ name: string; value: number; percent: number } | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (timeRange === '1m') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (timeRange === '6m') return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    if (timeRange === '1y') return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    if (customStart) return new Date(customStart);
    return new Date(now.getFullYear(), now.getMonth() - 5, 1);
  }, [timeRange, customStart]);

  const dateRangeEnd = useMemo(() => {
    if (timeRange === 'custom' && customEnd) return new Date(customEnd);
    return new Date();
  }, [timeRange, customEnd]);

  // Generate complete list of months in format 'YYYY-MM' between dateRange and dateRangeEnd
  const monthsList = useMemo(() => {
    const list: string[] = [];
    let current = new Date(dateRange.getFullYear(), dateRange.getMonth(), 1);
    const end = new Date(dateRangeEnd.getFullYear(), dateRangeEnd.getMonth(), 1);
    
    let limit = 0;
    while (current <= end && limit < 100) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      list.push(`${yyyy}-${mm}`);
      current.setMonth(current.getMonth() + 1);
      limit++;
    }
    return list;
  }, [dateRange, dateRangeEnd]);

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
    // Map across monthsList so we have empty slots for months with no data
    return monthsList.map(month => map[month] || { month, collected: 0, receivable: 0 });
  }, [filteredPayments, monthsList]);

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
  const kpiCard: React.CSSProperties = { ...card, display: 'flex', flexDirection: 'column', gap: 8 };
  const label: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.03em' };
  const value: React.CSSProperties = { fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-h)', lineHeight: 1, letterSpacing: '-0.02em' };
  const sub: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)' };
  const title: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
      <style>{`
        .tooltip-container {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .tooltip-text {
          visibility: hidden;
          position: absolute;
          background-color: var(--bg-surface-solid, #1e293b);
          color: var(--text-body, #f8fafc);
          text-align: left;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 500;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
          z-index: 999;
          pointer-events: none;
          white-space: normal;
          line-height: 1.45;
          font-family: inherit;
        }
        .tooltip-container:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
          transform: translateY(-4px) !important;
        }
        
        .bar-group {
          transition: transform 0.2s ease, filter 0.2s ease;
          cursor: pointer;
        }
        .bar-group:hover {
          transform: scaleY(1.02);
          filter: brightness(1.1);
        }
        
        .donut-segment {
          transition: stroke-width 0.25s ease, filter 0.2s ease;
          cursor: pointer;
        }
        .donut-segment:hover {
          stroke-width: 4.5;
          filter: brightness(1.1);
        }
      `}</style>

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
        {/* Occupancy Rate */}
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Home size={16} style={{ color: 'var(--primary)' }} /></div>
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span style={label}>{lang === 'zh' ? '出租率' : 'Occupancy'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '125%', left: 0, transform: 'none', width: 220 }}>
                {lang === 'zh' 
                  ? '已出租的房源占总登记房源数量的比例。公式：(已出住房源数 / 总房源数) × 100%' 
                  : 'Percentage of registered properties currently rented out. Formula: (Rented Units / Total Units) * 100%'}
              </div>
            </div>
          </div>
          <div style={value}>{kpis.rentedUnits}<span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>/{kpis.totalUnits}</span></div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${kpis.occupancyRate}%`, background: 'linear-gradient(90deg, #0D9488, #059669)', borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <span style={sub}>{kpis.occupancyRate}% {lang === 'zh' ? '已出租' : 'rented'}</span>
        </div>

        {/* Active Leases */}
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} style={{ color: '#2563EB' }} /></div>
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span style={label}>{lang === 'zh' ? '有效租约' : 'Leases'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '125%', left: '50%', transform: 'translateX(-50%)', width: 220 }}>
                {lang === 'zh'
                  ? '当前处于激活且尚未过期的租约协议总数。不包含历史已过期或暂未生效的合同。'
                  : 'Total number of active and unexpired lease agreements. Excludes expired and pending leases.'}
              </div>
            </div>
          </div>
          <div style={value}>{kpis.activeLeases}</div>
          <span style={sub}>{kpis.expiringLeases > 0 ? `${kpis.expiringLeases} ${lang === 'zh' ? '即将到期' : 'expiring'}` : (lang === 'zh' ? '暂无到期' : 'None expiring')}</span>
        </div>

        {/* Collection Rate */}
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={16} style={{ color: 'var(--success)' }} /></div>
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span style={label}>{lang === 'zh' ? '收租率' : 'Collection'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '125%', left: '50%', transform: 'translateX(-50%)', width: 220 }}>
                {lang === 'zh'
                  ? '所选时间段内，已缴付的账单笔数占应缴总账单数比例。公式：(已缴账单 / 应收总账单) × 100%'
                  : 'Percentage of paid bills within the selected time range. Formula: (Paid Bills / Total Due Bills) * 100%'}
              </div>
            </div>
          </div>
          <div style={{ ...value, color: kpis.collectionRate >= 80 ? 'var(--success)' : kpis.collectionRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{kpis.collectionRate}%</div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${kpis.collectionRate}%`, background: kpis.collectionRate >= 80 ? '#059669' : '#D97706', borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <span style={sub}>RM {kpis.totalCollected.toLocaleString()}</span>
        </div>

        {/* Overdue */}
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: kpis.overdue > 0 ? 'var(--danger-light)' : 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={16} style={{ color: kpis.overdue > 0 ? 'var(--danger)' : 'var(--success)' }} /></div>
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span style={label}>{lang === 'zh' ? '逾期' : 'Overdue'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '125%', right: 0, left: 'auto', transform: 'none', width: 220 }}>
                {lang === 'zh'
                  ? '所选时间段内，账期截止日已过但租客仍然没有支付的租金账单总笔数。'
                  : 'Number of unpaid rent bills in the selected range that have already passed their due date.'}
              </div>
            </div>
          </div>
          <div style={{ ...value, color: kpis.overdue > 0 ? 'var(--danger)' : 'var(--success)' }}>{kpis.overdue}</div>
          <span style={sub}>{kpis.overdue > 0 ? (lang === 'zh' ? '笔未付' : 'unpaid') : (lang === 'zh' ? '全部按时' : 'All on time')}</span>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
        {/* Revenue Bar Chart (Pure CSS + SVG Interactivity) */}
        <div style={card}>
          <div style={title}>
            <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span>{lang === 'zh' ? '月收入趋势' : 'Monthly Revenue'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '115%', left: 0, transform: 'none', width: 250 }}>
                {lang === 'zh'
                  ? '展示所选周期内，各月份实际已收妥租金（绿色）与应收租金总额（蓝色背景）的对比趋势。'
                  : 'Receivable rent (blue backdrop) vs. actual collected rent (green bar) for each month in the selected range.'}
              </div>
            </div>
          </div>
          
          {revenueData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, padding: '0 4px' }}>
              {revenueData.map((d, i) => {
                const showCollectedK = (d.collected / 1000).toFixed(1).replace('.0', '');
                return (
                  <div key={i} className="tooltip-container bar-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    {/* Top Label */}
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {d.receivable > 0 ? `RM${showCollectedK}k` : 'RM0'}
                    </div>
                    
                    {/* Columns */}
                    <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
                      <div style={{ flex: 1, height: `${(d.collected / maxRevenue) * 100}%`, background: '#059669', borderRadius: '3px 3px 0 0', transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)', minHeight: d.collected > 0 ? 2 : 0 }} />
                      <div style={{ flex: 1, height: `${(d.receivable / maxRevenue) * 100}%`, background: '#2563EB', borderRadius: '3px 3px 0 0', opacity: 0.25, transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)', minHeight: d.receivable > 0 ? 2 : 0 }} />
                    </div>
                    
                    {/* X Axis Label */}
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{d.month.slice(5)}</div>

                    {/* Tooltip Content */}
                    <div className="tooltip-text" style={{ bottom: '105%', left: '50%', transform: 'translateX(-50%)', width: 170 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
                        {d.month}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '2px 0' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '已收租金:' : 'Collected:'}</span>
                        <span style={{ fontWeight: 600, color: '#34D399' }}>RM {d.collected.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '2px 0' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '应收租金:' : 'Receivable:'}</span>
                        <span style={{ fontWeight: 600, color: '#60A5FA' }}>RM {d.receivable.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '2px 0' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '未收/逾期:' : 'Unpaid/Overdue:'}</span>
                        <span style={{ fontWeight: 600, color: '#F87171' }}>RM {(d.receivable - d.collected).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '收租比例:' : 'Collection Rate:'}</span>
                        <span style={{ fontWeight: 700 }}>
                          {d.receivable > 0 ? Math.round((d.collected / d.receivable) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'zh' ? '暂无数据' : 'No data'}</div>
          )}
          
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#059669', display: 'inline-block' }} />{lang === 'zh' ? '已收' : 'Collected'}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563EB', opacity: 0.25, display: 'inline-block' }} />{lang === 'zh' ? '应收' : 'Receivable'}</span>
          </div>
        </div>

        {/* Room Type Donut (SVG + State-based Interactivity) */}
        <div style={card}>
          <div style={title}>
            <Building2 size={16} style={{ color: 'var(--primary)' }} />
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span>{lang === 'zh' ? '房源分布' : 'Room Types'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '115%', left: 0, transform: 'none', width: 220 }}>
                {lang === 'zh'
                  ? '展示目前已录入系统的房源按房间户型分布的占比统计。'
                  : 'Distribution of registered properties grouped by room types.'}
              </div>
            </div>
          </div>
          
          {roomTypeData.length > 0 ? (() => {
            const total = roomTypeData.reduce((s, d) => s + d.value, 0);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
                {/* Interactive SVG Donut */}
                {(() => {
                  if (total === 0) return null;
                  
                  let accumulatedPercent = 0;
                  return (
                    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="120" height="120" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--glass-border)" strokeWidth="3" />
                        {roomTypeData.map((d, i) => {
                          const percent = (d.value / total) * 100;
                          const offset = 100 - accumulatedPercent;
                          accumulatedPercent += percent;
                          const strokeColor = COLORS[i % COLORS.length];
                          
                          return (
                            <circle
                              key={i}
                              className="donut-segment"
                              cx="21"
                              cy="21"
                              r="15.91549430918954"
                              fill="transparent"
                              stroke={strokeColor}
                              strokeWidth="3.5"
                              strokeDasharray={`${percent} ${100 - percent}`}
                              strokeDashoffset={offset}
                              onMouseEnter={() => setHoveredSlice({ name: d.name, value: d.value, percent: Math.round(percent) })}
                              onMouseLeave={() => setHoveredSlice(null)}
                              style={{
                                transition: 'stroke-width 0.25s ease, filter 0.2s ease',
                                cursor: 'pointer',
                              }}
                            />
                          );
                        })}
                      </svg>
                      
                      {/* Donut Center Display */}
                      <div style={{
                        position: 'absolute',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        width: 70,
                        height: 70,
                        borderRadius: '50%',
                      }}>
                        {hoveredSlice ? (
                          <>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                              {hoveredSlice.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                              {hoveredSlice.value}{lang === 'zh' ? '间' : ' units'}
                            </span>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                              {hoveredSlice.percent}%
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {lang === 'zh' ? '总房源' : 'Total'}
                            </span>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-h)' }}>
                              {total}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {lang === 'zh' ? '间' : 'units'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                {/* Legend with Interactive Hover Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {roomTypeData.map((d, i) => {
                    const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    const isHovered = hoveredSlice && hoveredSlice.name === d.name;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          opacity: hoveredSlice ? (isHovered ? 1 : 0.4) : 1,
                          transform: isHovered ? 'scale(1.05) translateX(2px)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={() => setHoveredSlice({ name: d.name, value: d.value, percent })}
                        onMouseLeave={() => setHoveredSlice(null)}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-body)', fontWeight: isHovered ? 700 : 500 }}>{d.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>{d.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'zh' ? '暂无房源' : 'No listings'}</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Community Distribution */}
        <div style={card}>
          <div style={title}>
            <Building2 size={16} style={{ color: 'var(--primary)' }} />
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span>{lang === 'zh' ? '按小区分布' : 'By Community'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '115%', left: 0, transform: 'none', width: 220 }}>
                {lang === 'zh'
                  ? '已登记房源在不同住宅公寓小区的分布套数与排行。'
                  : 'Property counts and ranking based on apartment community registration.'}
              </div>
            </div>
          </div>
          
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
          <div style={title}>
            <Users size={16} style={{ color: 'var(--primary)' }} />
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span>{lang === 'zh' ? '意向与报修' : 'Interests & Maintenance'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '115%', left: 0, transform: 'none', width: 220 }}>
                {lang === 'zh'
                  ? '租客看房意向分类，以及报修工单的历史处理效率指标概览。'
                  : 'Overview of tenant rental interests and maintenance request resolution efficiency.'}
              </div>
            </div>
          </div>
          
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
