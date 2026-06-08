'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, MapPin, Bed, Bath, DollarSign, Building2, X, ChevronRight,
  CheckCircle2, Video, Grid, List, User, Calendar, RefreshCw, Tag,
  ShieldCheck, Waves, Dumbbell, ParkingCircle, Wifi, Shirt, BookOpen, Store,
  Maximize, Star
} from 'lucide-react';
import { isMockDatabase } from '@/lib/supabase';
import { useApp } from '@/lib/ThemeProvider';
import ReviewSystem from './ReviewSystem';
import { useAuth } from '@/lib/AuthContext';
import { nonNegativeInputValue } from '@/lib/numberInput';
import { useListingsData, type UnitWithCommunity } from '@/lib/ListingsDataContext';
import {
  ROOM_TYPES,
  getUnitImages,
  getUnitVideo,
  getListingAgentLabel,
} from '@/lib/listingDisplayUtils';

const AMENITY_LABELS: Record<string, { icon: React.ReactNode; zh: string; en: string }> = {
  security: { icon: <ShieldCheck size={16} />, zh: '24小时门卫', en: '24-hr Security' },
  pool: { icon: <Waves size={16} />, zh: '游泳池', en: 'Swimming Pool' },
  gym: { icon: <Dumbbell size={16} />, zh: '健身房', en: 'Gymnasium' },
  parking: { icon: <ParkingCircle size={16} />, zh: '停车场', en: 'Parking' },
  wifi: { icon: <Wifi size={16} />, zh: '公共 Wi-Fi', en: 'Common Wi-Fi' },
  laundry: { icon: <Shirt size={16} />, zh: '洗衣房', en: 'Laundry' },
  study: { icon: <BookOpen size={16} />, zh: '自习室', en: 'Study Room' },
  mart: { icon: <Store size={16} />, zh: '便利店', en: 'Mini Mart' },
};

export default function AdminListingsBrowse() {
  const { t, lang } = useApp();
  const {
    units,
    admins,
    listingsError,
    isListingsLoaded,
    isRefreshing,
    loadListings,
    loadAdmins,
  } = useListingsData();

  const listingsLoading = !isListingsLoaded;
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available'>('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = viewMode === 'grid' ? 10 : 8;
  const [selected, setSelected] = useState<UnitWithCommunity | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [showAllCommunityUnits, setShowAllCommunityUnits] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'editor' | null>(null);

  useEffect(() => {
    loadListings();
    loadAdmins();
  }, [loadListings, loadAdmins]);

  useEffect(() => {
    if (isMockDatabase) {
      setAuthUserId(localStorage.getItem('ez_tenant_id') || 'admin-123');
      const mockRole = localStorage.getItem('ez_user_role');
      setUserRole(mockRole === 'admin' ? 'super_admin' : null);
      return;
    }
    let mounted = true;
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted && user) {
        setAuthUserId(user.id);
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (mounted && adminData) setUserRole(adminData.role as 'super_admin' | 'editor');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const sameCommUnits = useMemo(() => {
    return selected
      ? units.filter(u => u.community_id === selected.community_id && u.id !== selected.id)
      : [];
  }, [selected, units]);

  const filtered = useMemo(() => {
    let res = [...units];
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(u =>
        u.community?.name.toLowerCase().includes(q) ||
        u.community?.address.toLowerCase().includes(q),
      );
    }
    if (typeFilter) res = res.filter(u => u.room_type === typeFilter);
    if (maxRent) res = res.filter(u => u.rent <= parseFloat(maxRent));
    if (statusFilter === 'available') res = res.filter(u => u.status === 'available');
    res.sort((a, b) => (sort === 'asc' ? a.rent - b.rent : b.rent - a.rent));
    return res;
  }, [units, search, typeFilter, maxRent, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, typeFilter, maxRent, statusFilter, sort, viewMode]);

  const closeDetail = () => {
    setSelected(null);
    setImgIdx(0);
    setLightboxOpen(false);
    setVideoOpen(false);
    setShowAllCommunityUnits(false);
  };

  const openLightbox = (idx: number) => {
    setImgIdx(idx);
    setLightboxOpen(true);
  };

  return (
    <div className="listings-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
          {lang === 'zh' ? '房源浏览' : 'Browse Listings'}
        </h2>
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '3px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>
          {filtered.length} {t('listingsSubtitle')}
        </span>
        <button
          type="button"
          onClick={() => { loadListings({ force: true }); loadAdmins({ force: true }); }}
          disabled={listingsLoading || isRefreshing}
          title={lang === 'zh' ? '刷新房源列表' : 'Refresh listings'}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', border: '1px solid var(--glass-border)',
            borderRadius: 8, background: 'var(--glass-bg)', cursor: (listingsLoading || isRefreshing) ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)',
            transition: 'all 0.2s', opacity: (listingsLoading || isRefreshing) ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: (listingsLoading || isRefreshing) ? 'spin 1s linear infinite' : 'none' }} />
          {lang === 'zh' ? '刷新' : 'Refresh'}
        </button>
      </div>

      <div className="glass-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder={t('filterSearch')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ flex: '0 1 160px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">{t('filterByType')}: {t('filterAll')}</option>
            {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div style={{ position: 'relative', flex: '0 1 160px' }}>
            <DollarSign size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="number" min={0} className="form-input" style={{ paddingLeft: 30 }} placeholder={t('filterMaxRent')} value={maxRent} onChange={e => setMaxRent(nonNegativeInputValue(e.target.value))} />
          </div>
          <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            {(['all', 'available'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s', background: statusFilter === s ? 'var(--gradient-primary)' : 'transparent', color: statusFilter === s ? 'white' : 'var(--text-muted)' }}>
                {s === 'all' ? t('filterAll') : t('filterAvailable')}
              </button>
            ))}
          </div>
          <select className="form-select" style={{ flex: '0 1 170px' }} value={sort} onChange={e => setSort(e.target.value as 'asc' | 'desc')}>
            <option value="asc">{t('sortPriceAsc')}</option>
            <option value="desc">{t('sortPriceDesc')}</option>
          </select>
          <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            <button type="button" onClick={() => setViewMode('grid')}
              style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === 'grid' ? 'var(--gradient-primary)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)' }}>
              <Grid size={15} />
            </button>
            <button type="button" onClick={() => setViewMode('list')}
              style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === 'list' ? 'var(--gradient-primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-muted)' }}>
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {listingsLoading ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon"><RefreshCw size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
          <p>{lang === 'zh' ? '正在加载房源…' : 'Loading listings…'}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon"><Building2 size={32} /></div>
          {listingsError ? (
            <>
              <p style={{ color: 'var(--danger)' }}>
                {lang === 'zh' ? '加载房源失败' : 'Failed to load listings'}: {listingsError}
              </p>
              <button type="button" className="btn btn-primary empty-cta" onClick={() => loadListings({ force: true })}>
                {lang === 'zh' ? '重试' : 'Retry'}
              </button>
            </>
          ) : (
            <p>
              {units.length === 0
                ? (isMockDatabase
                  ? (lang === 'zh' ? '暂无房源。' : 'No listings.')
                  : t('noListings'))
                : (lang === 'zh' ? '没有符合筛选条件的房源' : 'No listings match your filters')}
            </p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {paginated.map(u => (
            <AdminListingCard
              key={u.id}
              unit={u}
              agentLabel={getListingAgentLabel(u, admins, lang)}
              onSelect={() => { setSelected(u); setImgIdx(0); }}
              t={t}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {paginated.map(u => (
            <AdminListingRow
              key={u.id}
              unit={u}
              agentLabel={getListingAgentLabel(u, admins, lang)}
              onSelect={() => { setSelected(u); setImgIdx(0); }}
              t={t}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--glass-border)', background: page === 1 ? 'transparent' : 'var(--glass-bg)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-h)', fontSize: '0.82rem', fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: page === 1 ? 0.5 : 1 }}>
            {lang === 'zh' ? '上一页' : 'Prev'}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: p === page ? 'var(--primary)' : 'transparent', color: p === page ? 'white' : 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--glass-border)', background: page === totalPages ? 'transparent' : 'var(--glass-bg)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-h)', fontSize: '0.82rem', fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: page === totalPages ? 0.5 : 1 }}>
            {lang === 'zh' ? '下一页' : 'Next'}
          </button>
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }}>
          <div onClick={closeDetail} style={{ flex: 1, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            width: 'min(640px, 95vw)', height: '100vh', overflowY: 'auto',
            background: 'var(--bg-surface-solid)', borderLeft: '1px solid var(--glass-border)',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{ position: 'relative', height: 260, background: '#0B1622', overflow: 'hidden' }}>
              {(() => {
                const imgs = getUnitImages(selected.id, selected.media_urls);
                const vid = getUnitVideo(selected.id, selected.video_url);
                return (
                  <>
                    <img
                      src={imgs[imgIdx] || imgs[0]}
                      alt={selected.room_type}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9, cursor: 'zoom-in' }}
                      onClick={() => openLightbox(imgIdx)}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)', pointerEvents: 'none' }} />
                    <button onClick={closeDetail} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                      <X size={18} />
                    </button>
                    <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, display: 'flex', gap: 6, flexWrap: 'wrap', zIndex: 2 }}>
                      {imgs.slice(0, 9).map((src, i) => (
                        <div key={i} onClick={() => openLightbox(i)}
                          style={{ width: 52, height: 36, borderRadius: 4, overflow: 'hidden', border: imgIdx === i ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.3)', cursor: 'zoom-in', flexShrink: 0 }}>
                          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        </div>
                      ))}
                      {vid && (
                        <div
                          style={{ width: 52, height: 36, borderRadius: 4, background: 'rgba(0,0,0,0.7)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          onClick={() => setVideoOpen(true)}
                        >
                          <Video size={16} color="white" />
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'absolute', top: 16, left: 16, background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: 6, fontWeight: 800, fontSize: '1rem' }}>
                      RM {selected.rent.toLocaleString()}<span style={{ fontWeight: 400, fontSize: '0.8rem' }}>{t('perMonth')}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ padding: '12px', background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '14px' }}>ℹ️</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {lang === 'zh'
                    ? '此为管理员浏览视图。租房操作仅限租客；中介可通过「租约 & 财务台账」中的「租客意向」审核申请。'
                    : 'Admin browse view. Renting is for tenants only; agents review applications via Leases → Interest Management.'}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{selected.community?.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <MapPin size={13} /> {selected.community?.address || '—'}
                    </div>
                    {getListingAgentLabel(selected, admins, lang) && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--primary)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <User size={13} />
                        {getListingAgentLabel(selected, admins, lang)}
                      </div>
                    )}
                  </div>
                  <span className={`status-badge ${selected.status}`} style={{ flexShrink: 0 }}>
                    {selected.status === 'available' ? t('available') : t('rented')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600 }}>{selected.room_type}</span>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 14 }}>{t('detailProperty')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                  {([
                    { label: t('detailType'), val: selected.room_type, icon: <Grid size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} /> },
                    { label: t('detailRent'), val: `RM ${selected.rent.toLocaleString()}/mo`, icon: <DollarSign size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} /> },
                    { label: t('detailBedrooms'), val: `${selected.bedrooms || 1} ${t('bedroomsUnit')}`, icon: <Bed size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} /> },
                    { label: t('detailBathrooms'), val: `${selected.bathrooms || 1} ${t('bathroomsUnit')}`, icon: <Bath size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} /> },
                    { label: lang === 'zh' ? '房屋面积' : 'Property Size', val: selected.area ? `${selected.area} sqft` : '—', icon: <Maximize size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} /> },
                    { label: t('detailCommunity'), val: selected.community?.name || '—', icon: <Building2 size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} /> },
                    { label: t('detailStatus'), val: selected.status === 'available' ? t('available') : t('rented'), icon: <Tag size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} /> },
                    selected.available_from ? {
                      label: lang === 'zh' ? '可入住日期' : 'Available From',
                      val: new Date(selected.available_from).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                      icon: <Calendar size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                    } : null,
                    { label: t('detailAddress'), val: selected.community?.address || '—', icon: <MapPin size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} /> },
                  ] as any[]).filter(Boolean).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                      {item.icon}
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 1 }}>{item.label}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-h)', fontWeight: 500 }}>{item.val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selected.description && (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>About {selected.community?.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.75, borderLeft: '3px solid var(--primary)', paddingLeft: 14 }}>
                    {selected.description}
                  </p>
                </div>
              )}

              {selected.community?.amenities && selected.community.amenities.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 14 }}>{t('detailFacilities')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                    {selected.community.amenities.map((key: string) => {
                      const label = AMENITY_LABELS[key];
                      if (!label) return null;
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--text-body)' }}>
                          <span style={{ color: 'var(--primary)', display: 'flex' }}>{label.icon}</span>
                          <span>{lang === 'zh' ? label.zh : label.en}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* More units in same community */}
              {sameCommUnits.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-h)' }}>{t('detailMoreUnits')}</h3>
                    <span
                      onClick={() => setShowAllCommunityUnits(true)}
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.textDecoration = 'underline';
                        e.currentTarget.style.opacity = '0.85';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.textDecoration = 'none';
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      {lang === 'zh' ? '查看更多' : 'View More'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {sameCommUnits.slice(0, 5).map(u => (
                      <div
                        key={u.id}
                        onClick={() => { setSelected(u); setImgIdx(0); }}
                        style={{
                          flex: '1 1 calc(20% - 8px)',
                          minWidth: '76px',
                          maxWidth: '108px',
                          borderRadius: 8,
                          border: '1px solid var(--glass-border)',
                          background: 'var(--glass-bg)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--glass-border)';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <img
                          src={getUnitImages(u.id, u.media_urls)[0]}
                          alt=""
                          style={{ width: '100%', height: 48, objectFit: 'cover' }}
                        />
                        <div style={{ padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center', minWidth: 0 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.room_type}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                            RM {u.rent.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews section */}
              <div style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 12, color: 'var(--text-h)' }}>
                  {lang === 'zh' ? '租客评价' : 'Tenant Reviews'}
                </h3>
                <ReviewSystem unitId={selected.id} userId={authUserId} canDeleteAll={userRole === 'super_admin'} />
              </div>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && selected && (() => {
        const imgs = getUnitImages(selected.id, selected.media_urls);
        return (
          <div onClick={() => setLightboxOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={imgs[imgIdx]} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
            <button onClick={() => setLightboxOpen(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        );
      })()}

      {videoOpen && selected && (() => {
        const vid = getUnitVideo(selected.id, selected.video_url);
        if (!vid) return null;
        return (
          <div onClick={() => setVideoOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video src={vid} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh' }} onClick={e => e.stopPropagation()} />
            <button onClick={() => setVideoOpen(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        );
      })()}

      {/* ── Same Community Units Modal ── */}
      {showAllCommunityUnits && selected && (
        <div
          onClick={() => setShowAllCommunityUnits(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              animation: 'slideUp 0.25s ease-out',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
                {lang === 'zh' ? `同小区所有房源 (${sameCommUnits.length + 1})` : `All rooms in community (${sameCommUnits.length + 1})`}
              </h3>
              <button
                onClick={() => setShowAllCommunityUnits(false)}
                className="ctrl-btn"
                style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[selected, ...sameCommUnits].filter(Boolean).map(u => (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelected(u);
                    setImgIdx(0);
                    setShowAllCommunityUnits(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${selected?.id === u.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: selected?.id === u.id ? 'var(--primary-light)' : 'var(--glass-bg)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (selected?.id !== u.id) e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={e => {
                    if (selected?.id !== u.id) e.currentTarget.style.borderColor = 'var(--glass-border)';
                  }}
                >
                  <img
                    src={getUnitImages(u.id, u.media_urls)[0]}
                    alt=""
                    style={{ width: 56, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.room_type}
                      {selected?.id === u.id && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: 'white', padding: '1px 5px', borderRadius: 4 }}>
                          {lang === 'zh' ? '当前' : 'Current'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>RM {u.rent.toLocaleString()}{t('perMonth')}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminListingCard({ unit, agentLabel, onSelect, t, lang }: {
  unit: UnitWithCommunity;
  agentLabel?: string | null;
  onSelect: () => void;
  t: (k: any) => string;
  lang: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        background: 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'var(--primary)' : 'var(--glass-border)'}`,
        boxShadow: hovered ? '0 12px 32px rgba(59,130,246,0.15)' : 'var(--glass-shadow)',
        transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
    >
      <div style={{ position: 'relative', height: 160, overflow: 'hidden', background: '#0B1622' }}>
        <img
          src={getUnitImages(unit.id, unit.media_urls)[0]}
          alt={unit.room_type}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
        <span className={`status-badge ${unit.status}`} style={{ position: 'absolute', top: 12, right: 12 }}>
          {unit.status === 'available' ? t('available') : t('rented')}
        </span>
        <span style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
          {unit.room_type}
        </span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h4 style={{ fontSize: '0.9rem', lineHeight: 1.3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.community?.name || '—'}</h4>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
              RM {unit.rent.toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{unit.community?.address || '—'}</span>
          </div>
          {agentLabel && (
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <User size={12} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agentLabel}</span>
            </div>
          )}
          {unit.available_from && (
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />
              <span>{lang === 'zh' ? '可入住' : 'Available'}: {new Date(unit.available_from).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Bed size={12} />{unit.bedrooms || 1}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Bath size={12} />{unit.bathrooms || 1}</span>
            {unit.area ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Maximize size={12} />{unit.area} sqft</span>
            ) : null}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
            {t('viewDetail')} <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

function AdminListingRow({ unit, agentLabel, onSelect, t }: {
  unit: UnitWithCommunity;
  agentLabel?: string | null;
  onSelect: () => void;
  t: (k: any) => string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        background: 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'var(--primary)' : 'var(--glass-border)'}`,
        display: 'flex', gap: 16, padding: 12, alignItems: 'center',
        transition: 'all 0.25s',
      }}
    >
      <div style={{ position: 'relative', width: 180, height: 110, borderRadius: 10, overflow: 'hidden', background: '#0B1622', flexShrink: 0 }}>
        <img src={getUnitImages(unit.id, unit.media_urls)[0]} alt={unit.room_type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span className={`status-badge ${unit.status}`} style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.65rem' }}>
          {unit.status === 'available' ? t('available') : t('rented')}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{unit.community?.name || '—'}</h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} />{unit.community?.address || '—'}
            </div>
            {agentLabel && (
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>{agentLabel}</div>
            )}
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>RM {unit.rent.toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, borderTop: '1px solid var(--glass-border)', paddingTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 600 }}>{unit.room_type}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Bed size={12} />{unit.bedrooms || 1}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Bath size={12} />{unit.bathrooms || 1}</span>
              {unit.area ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Maximize size={12} />{unit.area} sqft</span>
              ) : null}
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)' }}>{t('viewDetail')} <ChevronRight size={13} /></span>
        </div>
      </div>
    </div>
  );
}
