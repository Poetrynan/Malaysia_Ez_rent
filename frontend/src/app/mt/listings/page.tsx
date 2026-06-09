'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import { supabase as sb, isMockDatabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Bed, Bath, Maximize, Heart, ChevronLeft, ChevronRight, Grid3X3, List, Filter, X } from 'lucide-react';

const ROOM_TYPES = ['Studio', 'Master Room', 'Medium Room', 'Small Room', 'Ensuite', 'Whole Unit'];
const AMENITIES = ['gym', 'pool', 'laundry', 'study', 'parking', 'security', 'wifi', 'mart'];

export default function MobileListingsPage() {
  const { role } = useAuth();
  const { lang } = useApp();
  const router = useRouter();

  const [units, setUnits] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [detailUnit, setDetailUnit] = useState<any | null>(null);
  const perPage = 8;

  useEffect(() => {
    // Check sessionStorage cache first
    const cached = sessionStorage.getItem('mt_listings_cache');
    if (cached) {
      try {
        const { units: cu, communities: cc } = JSON.parse(cached);
        if (cu?.length) { setUnits(cu); setCommunities(cc || []); setLoading(false); return; }
      } catch {}
    }

    const load = async () => {
      try {
        // Use supabase client for both mock and live (mock auto-returns defaults)
        const { supabase } = await import('@/lib/supabase');
        const [unitsRes, commRes] = await Promise.all([
          supabase.from('units').select('*, communities(*)').eq('status', 'available').order('created_at', { ascending: false }),
          supabase.from('communities').select('*'),
        ]);
        const u = unitsRes.data || [];
        const c = commRes.data || [];
        setUnits(u); setCommunities(c);
        sessionStorage.setItem('mt_listings_cache', JSON.stringify({ units: u, communities: c }));
      } catch (e) { console.error('Load listings error:', e); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = units;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => {
        const comm = u.communities || communities.find(c => c.id === u.community_id);
        return (comm?.name || '').toLowerCase().includes(q) || (u.description || '').toLowerCase().includes(q);
      });
    }
    if (typeFilter.length) result = result.filter(u => typeFilter.includes(u.room_type));
    if (maxPrice) result = result.filter(u => u.rent <= Number(maxPrice));
    return result;
  }, [units, communities, search, typeFilter, maxPrice]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleFav = (id: string) => {
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ width: 28, height: 28, border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 4 }}>
        {lang === 'zh' ? '找房' : 'Find a Room'}
      </h2>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        {lang === 'zh' ? `${filtered.length} 套房源` : `${filtered.length} listings`}
      </p>

      {/* Search + filter toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={lang === 'zh' ? '搜索小区...' : 'Search...'} style={{
            width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, fontSize: '0.82rem',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-h)', outline: 'none', boxSizing: 'border-box',
          }} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{
          padding: '10px 12px', borderRadius: 10, border: '1px solid var(--glass-border)',
          background: showFilters ? 'var(--primary-light)' : 'var(--glass-bg)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, color: showFilters ? 'var(--primary)' : 'var(--text-muted)',
        }}>
          <Filter size={16} />
        </button>
        <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} style={{
          padding: '10px 12px', borderRadius: 10, border: '1px solid var(--glass-border)',
          background: 'var(--glass-bg)', cursor: 'pointer', color: 'var(--text-muted)',
        }}>
          {viewMode === 'grid' ? <List size={16} /> : <Grid3X3 size={16} />}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 14,
          padding: '14px', marginBottom: 14,
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            {lang === 'zh' ? '房型' : 'Room Type'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {ROOM_TYPES.map(t => (
              <button key={t} onClick={() => { setTypeFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]); setPage(1); }} style={{
                padding: '6px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                background: typeFilter.includes(t) ? 'var(--primary)' : 'var(--glass-bg)',
                color: typeFilter.includes(t) ? 'white' : 'var(--text-body)',
                border: `1px solid ${typeFilter.includes(t) ? 'var(--primary)' : 'var(--glass-border)'}`,
                transition: 'all 0.2s',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            {lang === 'zh' ? '最高月租 (RM)' : 'Max Rent (RM)'}
          </div>
          <input type="number" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); setPage(1); }} placeholder="2000" style={{
            width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: '0.82rem',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-h)', outline: 'none', boxSizing: 'border-box',
          }} />
        </div>
      )}

      {/* Listings */}
      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          {paged.map(u => {
            const comm = u.communities || communities.find(c => c.id === u.community_id);
            const img = u.media_urls?.[0] || `https://picsum.photos/seed/${u.id}/300/200`;
            return (
              <div key={u.id} onClick={() => setDetailUnit(u)} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 14,
                overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <div style={{ position: 'relative' }}>
                  <img src={img} alt={u.room_type} style={{ width: '100%', height: 120, objectFit: 'cover' }} loading="lazy" />
                  <button onClick={e => { e.stopPropagation(); toggleFav(u.id); }} style={{
                    position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Heart size={14} fill={favorites.has(u.id) ? '#EF4444' : 'none'} style={{ color: favorites.has(u.id) ? '#EF4444' : 'white' }} />
                  </button>
                  <div style={{
                    position: 'absolute', bottom: 6, left: 6, padding: '3px 8px', borderRadius: 6,
                    background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.68rem', fontWeight: 600,
                  }}>{u.room_type}</div>
                </div>
                <div style={{ padding: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>
                    RM {Number(u.rent).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={10} /> {comm?.name || '—'}
                  </div>
                  {u.area && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Maximize size={10} /> {u.area} sqft
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {paged.map(u => {
            const comm = u.communities || communities.find(c => c.id === u.community_id);
            const img = u.media_urls?.[0] || `https://picsum.photos/seed/${u.id}/300/200`;
            return (
              <div key={u.id} onClick={() => setDetailUnit(u)} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 14,
                overflow: 'hidden', cursor: 'pointer', display: 'flex', gap: 12, padding: 10,
              }}>
                <img src={img} alt={u.room_type} style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} loading="lazy" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>RM {Number(u.rent).toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-h)', fontWeight: 600 }}>{u.room_type}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={10} /> {comm?.name || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {u.bedrooms && <span><Bed size={10} /> {u.bedrooms}</span>}
                    {u.bathrooms && <span><Bath size={10} /> {u.bathrooms}</span>}
                    {u.area && <span><Maximize size={10} /> {u.area}ft²</span>}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleFav(u.id); }} style={{
                  alignSelf: 'center', width: 28, height: 28, borderRadius: '50%', background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Heart size={14} fill={favorites.has(u.id) ? '#EF4444' : 'none'} style={{ color: favorites.has(u.id) ? '#EF4444' : 'var(--text-muted)' }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)',
          }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)',
          }}><ChevronRight size={16} /></button>
        </div>
      )}

      {/* Detail drawer */}
      {detailUnit && (
        <div onClick={() => setDetailUnit(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-surface-solid)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520,
            maxHeight: '80vh', overflow: 'auto', padding: '20px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>{detailUnit.room_type}</h3>
              <button onClick={() => setDetailUnit(null)} style={{
                width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: '0.9rem',
              }}>×</button>
            </div>
            {detailUnit.media_urls?.[0] && (
              <img src={detailUnit.media_urls[0]} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 14, marginBottom: 16 }} />
            )}
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
              RM {Number(detailUnit.rent).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-body)', marginBottom: 12 }}>
              {detailUnit.bedrooms && <span><Bed size={14} style={{ verticalAlign: -2 }} /> {detailUnit.bedrooms} {lang === 'zh' ? '卧室' : 'BR'}</span>}
              {detailUnit.bathrooms && <span><Bath size={14} style={{ verticalAlign: -2 }} /> {detailUnit.bathrooms} {lang === 'zh' ? '卫生间' : 'BA'}</span>}
              {detailUnit.area && <span><Maximize size={14} style={{ verticalAlign: -2 }} /> {detailUnit.area} sqft</span>}
            </div>
            {detailUnit.description && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 12 }}>{detailUnit.description}</p>
            )}
            {detailUnit.available_from && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                📅 {lang === 'zh' ? '可入住' : 'Available'}: {new Date(detailUnit.available_from).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <Search size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{lang === 'zh' ? '未找到房源' : 'No listings found'}</div>
        </div>
      )}
    </div>
  );
}
