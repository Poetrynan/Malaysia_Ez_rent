'use client';

import React, { useMemo, useState } from 'react';
import { useAdminDataLoader } from '@/lib/useAdminDataLoader';
import { useApp } from '@/lib/ThemeProvider';
import { useRouter } from 'next/navigation';
import { Building2, Bed, Bath, Maximize, MapPin, Edit3, Trash2, Plus, Search } from 'lucide-react';

export default function MobileProperties() {
  const { lang } = useApp();
  const router = useRouter();
  const { units, communities, isLoaded } = useAdminDataLoader();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'rented'>('all');

  const unitsWithCommunity = useMemo(() => {
    return units.map((u: any) => ({
      ...u,
      community: communities.find((c: any) => c.id === u.community_id),
    })).filter((u: any) => {
      if (filter === 'available' && u.status !== 'available') return false;
      if (filter === 'rented' && u.status !== 'rented') return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (u.community?.name || '').toLowerCase();
        const type = (u.room_type || '').toLowerCase();
        const desc = (u.description || '').toLowerCase();
        if (!name.includes(q) && !type.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    }).sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [units, communities, search, filter]);

  const handleDelete = async (unitId: string) => {
    if (!confirm(lang === 'zh' ? '确定删除这个房源吗？' : 'Delete this listing?')) return;
    try {
      const { supabase, isMockDatabase } = await import('@/lib/supabase');
      if (isMockDatabase) {
        const existing = JSON.parse(localStorage.getItem('ez_units') || '[]');
        localStorage.setItem('ez_units', JSON.stringify(existing.filter((u: any) => u.id !== unitId)));
        window.location.reload();
      } else {
        const { createClient } = await import('@/utils/supabase/client');
        const client = createClient();
        await client.from('units').delete().eq('id', unitId);
        window.location.reload();
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

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
          {lang === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-h)',
            marginBottom: 4, letterSpacing: '-0.025em', fontFamily: 'var(--font-display)',
          }}>
            {lang === 'zh' ? '我的房源' : 'My Listings'}
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            {lang === 'zh' ? `共 ${units.length} 个房源` : `${units.length} listings total`}
          </p>
        </div>
        <button
          onClick={() => router.push('/m/upload')}
          style={{
            background: 'var(--gradient-primary)', color: 'white', border: 'none',
            borderRadius: 10, padding: '10px 16px', fontSize: '0.82rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 14px var(--primary-glow)',
          }}
        >
          <Plus size={16} />
          {lang === 'zh' ? '新增' : 'Add'}
        </button>
      </div>

      {/* Search */}
      <div style={{
        position: 'relative', marginBottom: 14,
      }}>
        <Search size={16} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
        }} />
        <input
          type="text"
          placeholder={lang === 'zh' ? '搜索房源...' : 'Search listings...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: 10, padding: '10px 14px 10px 36px',
            fontSize: '0.85rem', color: 'var(--text-h)', outline: 'none',
            fontFamily: 'var(--font-body)',
          }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 18,
      }}>
        {(['all', 'available', 'rented'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 9999, border: 'none',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              background: filter === f ? 'var(--primary)' : 'var(--glass-bg)',
              color: filter === f ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            {f === 'all' ? (lang === 'zh' ? '全部' : 'All') :
             f === 'available' ? (lang === 'zh' ? '待租' : 'Available') :
             (lang === 'zh' ? '已租' : 'Rented')}
          </button>
        ))}
      </div>

      {/* Unit cards */}
      {unitsWithCommunity.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'var(--glass-bg)', borderRadius: 14,
          border: '1px solid var(--glass-border)',
        }}>
          <Building2 size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>
            {lang === 'zh' ? '暂无房源' : 'No listings yet'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {lang === 'zh' ? '点击上方"新增"按钮添加第一个房源' : 'Tap "Add" to create your first listing'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {unitsWithCommunity.map((unit: any) => {
            const thumbnail = unit.media_urls?.[0] || null;
            return (
              <div key={unit.id} style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', gap: 12, padding: 14 }}>
                  {/* Thumbnail */}
                  <div style={{
                    width: 80, height: 80, borderRadius: 10,
                    background: thumbnail ? `url(${thumbnail}) center/cover` : 'var(--primary-light)',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {!thumbnail && <Building2 size={28} style={{ color: 'var(--primary)' }} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)',
                      marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {unit.community?.name || (lang === 'zh' ? '未知社区' : 'Unknown')}
                    </div>
                    <div style={{
                      fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6,
                    }}>
                      {unit.room_type} · {lang === 'zh' ? 'RM' : 'RM'} {(unit.rent || 0).toLocaleString()}/{lang === 'zh' ? '月' : 'mo'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {unit.bedrooms && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Bed size={12} /> {unit.bedrooms}
                        </span>
                      )}
                      {unit.bathrooms && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Bath size={12} /> {unit.bathrooms}
                        </span>
                      )}
                      {unit.area && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Maximize size={12} /> {unit.area} sqft
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px',
                      borderRadius: 9999,
                      background: unit.status === 'available' ? 'var(--success-light)' : 'var(--warning-light)',
                      color: unit.status === 'available' ? 'var(--success)' : 'var(--warning)',
                    }}>
                      {unit.status === 'available' ? (lang === 'zh' ? '待租' : 'Available') : (lang === 'zh' ? '已租' : 'Rented')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex', borderTop: '1px solid var(--glass-border)',
                }}>
                  <button
                    onClick={() => router.push(`/m/upload?edit=${unit.id}`)}
                    style={{
                      flex: 1, padding: '10px', border: 'none', background: 'transparent',
                      color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Edit3 size={14} />
                    {lang === 'zh' ? '编辑' : 'Edit'}
                  </button>
                  <div style={{ width: 1, background: 'var(--glass-border)' }} />
                  <button
                    onClick={() => handleDelete(unit.id)}
                    style={{
                      flex: 1, padding: '10px', border: 'none', background: 'transparent',
                      color: 'var(--danger)', fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Trash2 size={14} />
                    {lang === 'zh' ? '删除' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: 'center', marginTop: 32, fontSize: '0.72rem', color: 'var(--text-muted)',
      }}>
        Malaysia Ez Rent · {lang === 'zh' ? 'AI 智能租房系统' : 'AI Smart Rental System'}
      </div>
    </div>
  );
}
