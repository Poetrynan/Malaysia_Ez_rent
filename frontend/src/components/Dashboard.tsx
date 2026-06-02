'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Home, FileText, DollarSign, AlertTriangle, Wrench, TrendingUp, Clock, Users, Building2, BarChart3, HelpCircle } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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
  onNavigate?: (tab: string) => void;
}

// Color palette using design system CSS variables for perfect light/dark mode adaptability
const COLORS = [
  'var(--primary)',      // Teal
  'var(--info)',         // Blue
  'var(--accent)',       // Gold/Orange
  'var(--success)',      // Green
  '#7C3AED',             // Purple
  '#DB2777'              // Pink
];

export default function Dashboard({
  units, leases, interests, feedbacks, communities,
  visibleUnitIds, visibleLeaseIds, onNavigate,
}: DashboardProps) {
  const { lang } = useApp();
  const [timeRange, setTimeRange] = useState<'1m' | '6m' | '1y' | 'custom'>('6m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    return monthsList.map(month => map[month] || { month, collected: 0, receivable: 0 });
  }, [filteredPayments, monthsList]);

  const roomTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    visibleUnits.forEach(u => { map[u.room_type] = (map[u.room_type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visibleUnits]);

  const communityChartData = useMemo(() => {
    const map: Record<string, number> = {};
    visibleUnits.forEach(u => {
      const comm = communities.find(c => c.id === u.community_id);
      map[comm?.name || 'Unknown'] = (map[comm?.name || 'Unknown'] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [visibleUnits, communities]);

  const interestChartData = useMemo(() => {
    const active = interests.filter((i: any) => i.status !== 'left');
    const interested = active.filter((i: any) => i.status === 'interested').length;
    const confirmed = active.filter((i: any) => i.status === 'confirmed').length;
    return [
      { name: lang === 'zh' ? '意向中' : 'Interested', value: interested, color: 'var(--info)' },
      { name: lang === 'zh' ? '已确认' : 'Confirmed', value: confirmed, color: 'var(--success)' }
    ];
  }, [interests, lang]);

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

  // Recharts custom tooltips
  const CustomRevenueTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const collected = payload.find((p: any) => p.dataKey === 'collected')?.value || 0;
      const receivable = payload.find((p: any) => p.dataKey === 'receivable')?.value || 0;
      const unpaid = Math.max(0, receivable - collected);
      const rate = receivable > 0 ? Math.round((collected / receivable) * 100) : 0;
      return (
        <div style={{
          background: 'var(--bg-surface-solid)',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: 'var(--glass-shadow)',
          fontFamily: 'inherit',
          color: 'var(--text-body)'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-h)', marginBottom: 6, borderBottom: '1px solid var(--glass-border)', paddingBottom: 4, fontSize: '0.78rem' }}>
            {label}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: '0.72rem', padding: '2px 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '已收租金:' : 'Collected:'}</span>
            <span style={{ fontWeight: 600, color: 'var(--success)' }}>RM {collected.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: '0.72rem', padding: '2px 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '应收租金:' : 'Receivable:'}</span>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>RM {receivable.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: '0.72rem', padding: '2px 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '未收/逾期:' : 'Unpaid/Overdue:'}</span>
            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>RM {unpaid.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: '0.72rem', marginTop: 4, borderTop: '1px dashed var(--glass-border)', paddingTop: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '收租比例:' : 'Collection:'}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{rate}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomHorizontalTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-surface-solid)',
          border: '1px solid var(--glass-border)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '0.72rem',
          color: 'var(--text-h)',
          boxShadow: 'var(--glass-shadow)'
        }}>
          <span style={{ fontWeight: 600 }}>{payload[0].name}: </span>
          <span>{payload[0].value} {lang === 'zh' ? '套' : 'units'}</span>
        </div>
      );
    }
    return null;
  };

  // ---- Styles ----
  const card: React.CSSProperties = { background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '18px 20px', transition: 'all 0.2s ease', position: 'relative', minWidth: 0 };
  const kpiCard: React.CSSProperties = { ...card, display: 'flex', flexDirection: 'column', gap: 8 };
  const label: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.03em' };
  const value: React.CSSProperties = { fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-h)', lineHeight: 1, letterSpacing: '-0.02em' };
  const sub: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)' };
  const title: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 };

  // If not mounted (SSR), render a gorgeous loader card layout to ensure no flash of unstyled content
  if (!mounted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0', minHeight: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-h)', margin: 0 }}>{lang === 'zh' ? '数据看板' : 'Dashboard'}</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[1, 2, 3, 4].map(i => <div key={i} style={{ ...kpiCard, height: 110, opacity: 0.5 }} />)}
        </div>
      </div>
    );
  }

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
          background-color: var(--bg-surface-solid);
          color: var(--text-body);
          text-align: left;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 500;
          box-shadow: var(--glass-shadow);
          border: 1px solid var(--glass-border);
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
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .legend-item:hover {
          transform: translateX(2px);
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
            <div style={{ height: '100%', width: `${kpis.occupancyRate}%`, background: 'var(--gradient-primary)', borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <span style={sub}>{kpis.occupancyRate}% {lang === 'zh' ? '已出租' : 'rented'}</span>
        </div>

        {/* Active Leases */}
        <div style={kpiCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--info-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} style={{ color: 'var(--info)' }} /></div>
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
            <div style={{ height: '100%', width: `${kpis.collectionRate}%`, background: kpis.collectionRate >= 80 ? 'var(--success)' : 'var(--warning)', borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 12 }}>
        {/* Recharts Monthly Revenue Chart */}
        <div style={card}>
          <div style={title}>
            <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span>{lang === 'zh' ? '月收入趋势' : 'Monthly Revenue'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '115%', left: 0, transform: 'none', width: 250 }}>
                {lang === 'zh'
                  ? '展示所选周期内，各月份实际已收妥租金与应收租金总额的对比趋势。'
                  : 'Receivable rent vs. actual collected rent for each month in the selected range.'}
              </div>
            </div>
          </div>
          
          {revenueData.length > 0 ? (
            <div style={{ width: '100%', height: 180, minWidth: 0 }}>
              <ResponsiveContainer width="99%" height={180}>
                <LineChart data={revenueData} margin={{ top: 10, right: 5, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={m => m.slice(5)} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomRevenueTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.1)' }} />
                  <Line type="monotone" dataKey="collected" name="collected" stroke="var(--success)" strokeWidth={2} dot={{ fill: 'var(--success)', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="receivable" name="receivable" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)', r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'zh' ? '暂无数据' : 'No data'}</div>
          )}
          
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 2, borderRadius: 1, background: 'var(--success)', display: 'inline-block' }} />{lang === 'zh' ? '已收' : 'Collected'}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 2, borderRadius: 1, background: 'var(--primary)', display: 'inline-block', borderTop: '2px dashed var(--primary)' }} />{lang === 'zh' ? '应收' : 'Receivable'}</span>
          </div>
        </div>

        {/* Room Type Donut using Recharts (Stabilized width/height to avoid infinite loops) */}
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
            // Build conic-gradient stops
            let acc = 0;
            const stops = roomTypeData.map((d, i) => {
              const start = (acc / total) * 360;
              acc += d.value;
              const end = (acc / total) * 360;
              return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`;
            }).join(', ');
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center', height: 180 }}>
                {/* Donut via conic-gradient */}
                <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                  <div style={{
                    width: 120, height: 120, borderRadius: '50%',
                    background: `conic-gradient(${stops})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-surface-solid, var(--glass-bg))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '总房源' : 'Total'}</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-h)' }}>{total}</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '间' : 'units'}</span>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roomTypeData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{d.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'zh' ? '暂无房源' : 'No listings'}</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
        {/* Community Distribution with Recharts */}
        <div style={card}>
          <div style={{ ...title, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} style={{ color: 'var(--primary)' }} />
              <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
                <span>{lang === 'zh' ? '按小区分布' : 'By Community'}</span>
                <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                <div className="tooltip-text" style={{ bottom: '115%', left: 0, transform: 'none', width: 220 }}>
                  {lang === 'zh'
                    ? '已登记房源在不同住宅公寓小区的分布套数排行。'
                    : 'Property counts and ranking based on apartment community registration.'}
                </div>
              </div>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('properties')}
                style={{
                  fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 6px',
                  borderRadius: 4, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--primary)'; }}
              >
                {lang === 'zh' ? '查看全部 →' : 'View All →'}
              </button>
            )}
          </div>
          
          {communityChartData.length > 0 ? (
            <div style={{ width: '100%', height: 180, minWidth: 0 }}>
              <ResponsiveContainer width="99%" height={180}>
                <BarChart
                  data={communityChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} width={110} tickFormatter={(v) => v.length > 19 ? `${v.substring(0, 17)}...` : v} />
                  <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} content={<CustomHorizontalTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={12} style={{ cursor: 'pointer' }}>
                    {communityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{lang === 'zh' ? '暂无数据' : 'No data'}</div>
          )}
        </div>

        {/* Interest Funnel using Recharts + Maintenance Summary */}
        <div style={card}>
          <div style={title}>
            <Users size={16} style={{ color: 'var(--primary)' }} />
            <div className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
              <span>{lang === 'zh' ? '意向与报修' : 'Interests & Maintenance'}</span>
              <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div className="tooltip-text" style={{ bottom: '115%', left: 0, transform: 'none', width: 220 }}>
                {lang === 'zh'
                  ? '租客看房意向分类，以及报修工单的历史处理效率概览。'
                  : 'Overview of tenant rental interests and maintenance request resolution efficiency.'}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 180, justifyContent: 'space-between' }}>
            <div style={{ width: '100%', height: 75, minWidth: 0 }}>
              <ResponsiveContainer width="99%" height={75}>
                <BarChart
                  data={interestChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} width={100} />
                  <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} content={<CustomHorizontalTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={12} style={{ cursor: 'pointer' }}>
                    {interestChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
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
    </div>
  );
}
