'use client';

import React, { useMemo } from 'react';
import { useAdminDataLoader } from '@/lib/useAdminDataLoader';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';
import {
  Building2, DollarSign, AlertTriangle,
  TrendingUp, Users, Camera, MessageSquare
} from 'lucide-react';

export default function MobileDashboard() {
  const { lang } = useApp();
  const router = useRouter();
  const { units, leases, interests, feedbacks, isLoaded } = useAdminDataLoader();

  const kpis = useMemo(() => {
    const totalUnits = units.length;
    const rentedUnits = units.filter((u: any) => u.status === 'rented').length;
    const occupancyRate = totalUnits > 0 ? Math.round((rentedUnits / totalUnits) * 100) : 0;
    const activeLeases = leases.filter((l: any) => l.status === 'active').length;
    const pendingFeedbacks = feedbacks.filter((f: any) => f.status === 'pending' || f.status === 'in_progress').length;
    const totalCollected = leases.reduce((s: number, l: any) => {
      const paid = (l.payments || []).filter((p: any) => p.paid).reduce((ss: number, p: any) => ss + (p.amount || l.monthly_rent || 0), 0);
      return s + paid;
    }, 0);
    const pendingInterests = interests.filter((i: any) => i.status === 'interested').length;
    return { totalUnits, rentedUnits, occupancyRate, activeLeases, pendingFeedbacks, totalCollected, pendingInterests };
  }, [units, leases, feedbacks, interests]);

  const kpiCards = [
    {
      icon: Building2,
      labelZh: '总房源', labelEn: 'Total Units',
      value: kpis.totalUnits,
      subZh: `${kpis.rentedUnits} 已出租`, subEn: `${kpis.rentedUnits} rented`,
      color: 'var(--primary)',
    },
    {
      icon: TrendingUp,
      labelZh: '出租率', labelEn: 'Occupancy',
      value: `${kpis.occupancyRate}%`,
      subZh: `${kpis.activeLeases} 个活跃租约`, subEn: `${kpis.activeLeases} active leases`,
      color: 'var(--success)',
    },
    {
      icon: DollarSign,
      labelZh: '已收租金', labelEn: 'Collected',
      value: `RM ${kpis.totalCollected.toLocaleString()}`,
      subZh: '累计收款', subEn: 'Total collected',
      color: 'var(--accent)',
    },
    {
      icon: AlertTriangle,
      labelZh: '待处理反馈', labelEn: 'Open Feedback',
      value: kpis.pendingFeedbacks,
      subZh: '需要跟进', subEn: 'Needs attention',
      color: kpis.pendingFeedbacks > 0 ? 'var(--danger)' : 'var(--success)',
    },
    {
      icon: Users,
      labelZh: '新意向', labelEn: 'New Interests',
      value: kpis.pendingInterests,
      subZh: '待确认租户', subEn: 'Pending tenants',
      color: 'var(--info)',
    },
  ];

  const quickActions = [
    {
      icon: Camera,
      labelZh: '上传房源', labelEn: 'Upload Listing',
      descZh: '拍照上传新房源', descEn: 'Add new property',
      onClick: () => router.push('/m/upload'),
    },
    {
      icon: Building2,
      labelZh: '管理房源', labelEn: 'Manage Listings',
      descZh: '查看和编辑房源', descEn: 'View & edit properties',
      onClick: () => router.push('/m/properties'),
    },
    {
      icon: MessageSquare,
      labelZh: '查看消息', labelEn: 'View Messages',
      descZh: '处理租户反馈', descEn: 'Handle tenant feedback',
      onClick: () => router.push('/m/feedback'),
    },
  ];

  if (!isLoaded) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid var(--glass-border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {lang === 'zh' ? '加载数据中...' : 'Loading data...'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: '1.35rem',
          fontWeight: 700,
          color: 'var(--text-h)',
          marginBottom: 4,
          letterSpacing: '-0.025em',
          fontFamily: 'var(--font-display)',
        }}>
          {lang === 'zh' ? '工作台' : 'Dashboard'}
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          {lang === 'zh' ? '欢迎回来，这是您的业务概览' : 'Welcome back, here\'s your overview'}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 14,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <div style={{
                width: 42, height: 42,
                borderRadius: 10,
                background: card.color + '14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={20} style={{ color: card.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 2,
                }}>
                  {lang === 'zh' ? card.labelZh : card.labelEn}
                </div>
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: 'var(--text-h)',
                  lineHeight: 1.2,
                }}>
                  {card.value}
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}>
                  {lang === 'zh' ? card.subZh : card.subEn}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--text-h)',
          marginBottom: 14,
          letterSpacing: '-0.025em',
        }}>
          {lang === 'zh' ? '快捷操作' : 'Quick Actions'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={action.onClick}
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 14,
                  padding: '18px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 10,
                  background: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-h)',
                  textAlign: 'center',
                }}>
                  {lang === 'zh' ? action.labelZh : action.labelEn}
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}>
                  {lang === 'zh' ? action.descZh : action.descEn}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: 32,
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
      }}>
        Malaysia Ez Rent · {lang === 'zh' ? 'AI 智能租房系统' : 'AI Smart Rental System'}
      </div>
    </div>
  );
}
