'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, SlidersHorizontal, MapPin, Bed, Bath, DollarSign, Tag,
  Building2, X, ChevronRight, ChevronLeft, CheckCircle2, Car, Footprints,
  Bus, Wifi, ShieldCheck, ParkingCircle, Dumbbell, Waves, Star, Video,
  Phone, MessageCircle, Mail, ChevronDown, Shirt, BookOpen, Store
} from 'lucide-react';
import { isMockDatabase } from '@/lib/supabase';

// Define mapped amenities with icons and bilingual names (respecting admin checkboxes)
const AMENITY_DETAILS: Record<string, { icon: React.ReactNode; zh: string; en: string }> = {
  security: { icon: <ShieldCheck size={16} />, zh: '24小时门卫', en: '24-hr Security' },
  pool: { icon: <Waves size={16} />, zh: '游泳池', en: 'Swimming Pool' },
  gym: { icon: <Dumbbell size={16} />, zh: '健身房', en: 'Gymnasium' },
  parking: { icon: <ParkingCircle size={16} />, zh: '停车场', en: 'Parking' },
  wifi: { icon: <Wifi size={16} />, zh: '公共 Wi-Fi', en: 'Common Wi-Fi' },
  laundry: { icon: <Shirt size={16} />, zh: '洗衣房', en: 'Laundry' },
  study: { icon: <BookOpen size={16} />, zh: '自习室', en: 'Study Room' },
  mart: { icon: <Store size={16} />, zh: '便利店', en: 'Mini Mart' },
};

import MapAndCard from './MapAndCard';
import { useApp } from '@/lib/ThemeProvider';

interface Unit {
  id: string; community_id: string; unit_number?: string | null;
  room_type: string; rent: number; status: string; description: string; max_occupants?: number; media_urls?: string[];
  video_url?: string | null;
  bedrooms?: number; bathrooms?: number;
}
interface Community {
  id: string; name: string; address: string; lat: number; lng: number; amenities?: string[];
}
interface UnitWithCommunity extends Unit { community: Community | null; }

const ROOM_TYPES = ['Studio', 'Master Room', 'Medium Room', 'Small Room', 'Whole Unit'];

const FACILITY_ICONS: Record<string, React.ReactNode> = {
  '24小时门卫': <ShieldCheck size={16} />, '24-hr Security': <ShieldCheck size={16} />,
  '游泳池': <Waves size={16} />, 'Swimming Pool': <Waves size={16} />,
  '健身房': <Dumbbell size={16} />, 'Gymnasium': <Dumbbell size={16} />,
  '停车场': <ParkingCircle size={16} />, 'Parking': <ParkingCircle size={16} />,
  '公共 Wi-Fi': <Wifi size={16} />, 'Common Wi-Fi': <Wifi size={16} />,
  '巴士站': <Bus size={16} />, 'Bus Stop': <Bus size={16} />,
};

// Load real uploaded images; fall back to picsum placeholder
const getUnitImages = (unitId: string, mediaUrls?: string[]): string[] => {
  if (mediaUrls && mediaUrls.length > 0) return mediaUrls;
  try {
    const stored = JSON.parse(localStorage.getItem('ez_unit_media') || '{}');
    if (stored[unitId]?.images?.length > 0) return stored[unitId].images;
  } catch {}
  return Array.from({ length: 4 }, (_, i) => `https://picsum.photos/seed/${unitId}${i}/600/400`);
};
const getUnitVideo = (unitId: string, videoUrl?: string | null): string | null => {
  if (videoUrl) return videoUrl;
  try {
    const stored = JSON.parse(localStorage.getItem('ez_unit_media') || '{}');
    return stored[unitId]?.video || null;
  } catch { return null; }
};

const lightboxNavBtnStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.12)',
  border: 'none',
  color: 'white',
  width: 44,
  height: 44,
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
};

interface AdminContact {
  display_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  wechat_id: string | null;
  email: string;
}

interface TenantInterest { id: string; unit_id: string; user_id: string; email: string; full_name?: string; phone?: string; note?: string; status: string; created_at: string; }

export default function PropertyListings() {
  const { t, lang } = useApp();
  const [units, setUnits] = useState<UnitWithCommunity[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available'>('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<UnitWithCommunity | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [admins, setAdmins] = useState<AdminContact[]>([]);
  const [expandedAdmin, setExpandedAdmin] = useState<number | null>(null);
  const [interests, setInterests] = useState<TenantInterest[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(isMockDatabase ? 'tenant-123' : null);
  const [myInterest, setMyInterest] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [interestFeedback, setInterestFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const refreshInterests = async (supabase: Awaited<ReturnType<typeof import('@/utils/supabase/client').createClient>>, userId?: string) => {
    const { data, error } = await supabase.from('tenant_interests').select('*').neq('status', 'left');
    if (error) {
      console.error('[refreshInterests]', error);
      return;
    }
    if (data) {
      setInterests(data);
      const uid = userId ?? authUserId;
      if (uid) {
        const mine = data.find((i: TenantInterest) => String(i.user_id) === String(uid) && i.status !== 'left');
        setMyInterest(mine ? mine.unit_id : null);
      }
    }
  };

  useEffect(() => {
    if (isMockDatabase) return;
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted && user) setAuthUserId(user.id);
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) setAuthUserId(session?.user?.id ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const closeDetail = () => {
    setSelected(null);
    setLightboxOpen(false);
    setVideoOpen(false);
    setImgIdx(0);
  };

  const openLightbox = (index: number) => {
    setImgIdx(index);
    setLightboxOpen(true);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      const imgs = getUnitImages(selected.id, selected.media_urls);
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') setImgIdx(i => (i - 1 + imgs.length) % imgs.length);
      if (e.key === 'ArrowRight') setImgIdx(i => (i + 1) % imgs.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, selected]);

  useEffect(() => {
    if (isMockDatabase) {
      const allUnits: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
      const allCommunities: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      setUnits(allUnits.map(u => ({
        ...u,
        community: allCommunities.find(c => c.id === u.community_id) || null,
      })));
    } else {
      (async () => {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const [unitRes, commRes] = await Promise.all([
            supabase.from('units').select('*'),
            supabase.from('communities').select('*'),
          ]);
          const allUnits: Unit[] = unitRes.data || [];
          const allCommunities: Community[] = commRes.data || [];
          setUnits(allUnits.map(u => ({
            ...u,
            community: allCommunities.find(c => c.id === u.community_id) || null,
          })));
        } catch {}
      })();
    }

    // Fetch admin contacts
    if (isMockDatabase) {
      const stored = JSON.parse(localStorage.getItem('ez_admin_contacts') || '[]');
      setAdmins(stored.length > 0 ? stored : [{ display_name: '管理员', phone: '+6012-345 6789', whatsapp: '+6012-345 6789', wechat_id: null, email: 'admin@ezrent.my' }]);
    } else {
      (async () => {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data } = await supabase
            .from('admin_users')
            .select('display_name, phone, whatsapp, wechat_id, email');
          if (data) setAdmins(data as AdminContact[]);
        } catch {}
      })();
    }

    // Fetch tenant interests (public read — no login required to see counts)
    if (isMockDatabase) {
      const all: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      const active = all.filter(i => i.status !== 'left');
      setInterests(active);
      const mine = active.find(i => i.user_id === 'tenant-123');
      if (mine) setMyInterest(mine.unit_id);
    } else {
      (async () => {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          await refreshInterests(supabase, user?.id);
        } catch (e) {
          console.error('[load interests]', e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (!selected || isMockDatabase) return;
    (async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await refreshInterests(supabase, user?.id);
      } catch {}
    })();
  }, [selected?.id]);

  const expressInterest = async (unitId: string, noteOverride?: string) => {
    const note = (noteOverride ?? noteInput).trim();
    setInterestFeedback(null);

    if (isMockDatabase) {
      const all: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      const existingIdx = all.findIndex(i => i.unit_id === unitId && i.user_id === 'tenant-123');
      let next = [...all];
      if (existingIdx >= 0) {
        next[existingIdx] = { ...next[existingIdx], note, status: 'interested' };
      } else {
        next.push({
          id: `i-${Date.now()}`, unit_id: unitId, user_id: 'tenant-123', email: 'student@ezrent.my',
          full_name: 'Alex Lim', note, status: 'interested', created_at: new Date().toISOString(),
        });
      }
      localStorage.setItem('ez_interests', JSON.stringify(next));
      setInterests(next.filter(i => i.status !== 'left'));
      setMyInterest(unitId);
      setNoteInput('');
      setShowNoteInput(false);
      setInterestFeedback({ type: 'success', msg: t('coRentSubmitSuccess') });
      return;
    }

    setSubmittingInterest(true);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInterestFeedback({ type: 'error', msg: t('coRentLoginRequired') });
        return;
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc('submit_tenant_interest', {
        p_unit_id: unitId,
        p_note: note,
      });

      if (!rpcError && rpcResult?.success) {
        setMyInterest(unitId);
        setNoteInput('');
        setShowNoteInput(false);
        setInterestFeedback({ type: 'success', msg: t('coRentSubmitSuccess') });
        await refreshInterests(supabase, user.id);
        return;
      }

      if (rpcResult?.error === 'not_authenticated') {
        setInterestFeedback({ type: 'error', msg: t('coRentLoginRequired') });
        return;
      }

      // Fallback when RPC not deployed yet (run 015 migration)
      const profile = {
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        note,
        status: 'interested' as const,
      };

      const { data: existing } = await supabase
        .from('tenant_interests')
        .select('id, status')
        .eq('unit_id', unitId)
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase.from('tenant_interests').update(profile).eq('id', existing.id));
      } else {
        ({ error } = await supabase.from('tenant_interests').insert({
          unit_id: unitId,
          user_id: user.id,
          ...profile,
        }));
      }

      if (error) {
        console.error('[expressInterest]', rpcError || error);
        setInterestFeedback({
          type: 'error',
          msg: rpcError?.message?.includes('submit_tenant_interest')
            ? (lang === 'zh' ? '请在 Supabase 执行 015_tenant_interest_rpc.sql 后重试' : 'Run migration 015_tenant_interest_rpc.sql in Supabase, then retry')
            : t('coRentSubmitFailed'),
        });
        return;
      }

      setMyInterest(unitId);
      setNoteInput('');
      setShowNoteInput(false);
      setInterestFeedback({ type: 'success', msg: t('coRentSubmitSuccess') });
      await refreshInterests(supabase, user.id);
    } catch (e) {
      console.error(e);
      setInterestFeedback({ type: 'error', msg: t('coRentSubmitFailed') });
    } finally {
      setSubmittingInterest(false);
    }
  };

  const cancelInterest = async (unitIdOverride?: string) => {
    const unitId = unitIdOverride ?? myInterest ?? selected?.id;
    if (!unitId) return;
    setInterestFeedback(null);
    if (isMockDatabase) {
      const all: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      const updated = all.map(i => (i.unit_id === unitId && i.user_id === 'tenant-123') ? { ...i, status: 'left' } : i);
      localStorage.setItem('ez_interests', JSON.stringify(updated));
      setInterests(updated.filter(i => i.status !== 'left'));
      setMyInterest(null);
      setInterestFeedback({ type: 'success', msg: t('coRentCancelSuccess') });
      return;
    }
    setSubmittingInterest(true);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInterestFeedback({ type: 'error', msg: t('coRentLoginRequired') });
        return;
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc('cancel_tenant_interest', {
        p_unit_id: unitId,
      });

      if (!rpcError && rpcResult?.success) {
        if (myInterest === unitId) setMyInterest(null);
        setInterestFeedback({ type: 'success', msg: t('coRentCancelSuccess') });
        await refreshInterests(supabase, user.id);
        return;
      }

      const { error } = await supabase
        .from('tenant_interests')
        .update({ status: 'left' })
        .eq('unit_id', unitId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[cancelInterest]', rpcError || error);
        setInterestFeedback({ type: 'error', msg: t('coRentSubmitFailed') });
        return;
      }
      if (myInterest === unitId) setMyInterest(null);
      setInterestFeedback({ type: 'success', msg: t('coRentCancelSuccess') });
      await refreshInterests(supabase, user.id);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingInterest(false);
    }
  };

  const filtered = useMemo(() => {
    let res = [...units];
    if (search) res = res.filter(u =>
      u.community?.name.toLowerCase().includes(search.toLowerCase()) ||
      u.community?.address.toLowerCase().includes(search.toLowerCase())
    );
    if (typeFilter) res = res.filter(u => u.room_type === typeFilter);
    if (maxRent) res = res.filter(u => u.rent <= parseFloat(maxRent));
    if (statusFilter === 'available') res = res.filter(u => u.status === 'available');
    res.sort((a, b) => sort === 'asc' ? a.rent - b.rent : b.rent - a.rent);
    return res;
  }, [units, search, typeFilter, maxRent, statusFilter, sort]);

  const sameCommUnits = selected
    ? units.filter(u => u.community_id === selected.community_id && u.id !== selected.id)
    : [];


  return (
    <div className="listings-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ fontSize: '1.4rem' }}>{t('listingsTitle')}</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {filtered.length} {t('listingsSubtitle')}
        </span>
      </div>

      {/* ── Filter Bar ── */}
      <div className="glass-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
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

          {/* Room type */}
          <select className="form-select" style={{ flex: '0 1 160px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">{t('filterByType')}: {t('filterAll')}</option>
            {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Max rent */}
          <div style={{ position: 'relative', flex: '0 1 160px' }}>
            <DollarSign size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="number" className="form-input" style={{ paddingLeft: 30 }} placeholder={t('filterMaxRent')} value={maxRent} onChange={e => setMaxRent(e.target.value)} />
          </div>

          {/* Status toggle */}
          <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            {(['all', 'available'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s', background: statusFilter === s ? 'var(--primary)' : 'transparent', color: statusFilter === s ? 'white' : 'var(--text-muted)' }}>
                {s === 'all' ? t('filterAll') : t('filterAvailable')}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select className="form-select" style={{ flex: '0 1 170px' }} value={sort} onChange={e => setSort(e.target.value as 'asc' | 'desc')}>
            <option value="asc">{t('sortPriceAsc')}</option>
            <option value="desc">{t('sortPriceDesc')}</option>
          </select>
        </div>
      </div>

      {/* ── Card Grid ── */}
      {filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p>{t('noListings')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.map(u => (
            <PropertyCard key={u.id} unit={u} onSelect={() => { setSelected(u); setImgIdx(0); }} t={t} />
          ))}
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }}>
          {/* Backdrop */}
          <div onClick={closeDetail} style={{ flex: 1, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />

          {/* Panel */}
          <div style={{
            width: 'min(640px, 95vw)', height: '100vh', overflowY: 'auto',
            background: 'var(--bg-surface-solid)', borderLeft: '1px solid var(--glass-border)',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
            animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Image gallery */}
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
                      onError={(e: any) => { e.target.style.display = 'none'; }}
                      title={lang === 'zh' ? '点击查看大图' : 'Click to view full size'}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)', pointerEvents: 'none' }} />
                    <button onClick={closeDetail} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                      <X size={18} />
                    </button>
                    <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, display: 'flex', gap: 6, flexWrap: 'wrap', zIndex: 2 }}>
                      {imgs.slice(0, 9).map((src, i) => (
                        <div
                          key={i}
                          onClick={(e) => { e.stopPropagation(); openLightbox(i); }}
                          style={{ width: 52, height: 36, borderRadius: 4, overflow: 'hidden', border: imgIdx === i ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.3)', cursor: 'zoom-in', flexShrink: 0 }}
                          title={lang === 'zh' ? '点击查看大图' : 'Click to view full size'}
                        >
                          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        </div>
                      ))}
                      {vid && (
                        <div
                          style={{ width: 52, height: 36, borderRadius: 4, background: 'rgba(0,0,0,0.7)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setVideoOpen(true); }}
                          title={lang === 'zh' ? '播放看房视频' : 'Play walkthrough video'}
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

            {/* Content */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Title row */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{selected.community?.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <MapPin size={13} /> {selected.community?.address || '—'}
                    </div>
                  </div>
                  <span className={`status-badge ${selected.status}`} style={{ flexShrink: 0 }}>
                    {selected.status === 'available' ? t('available') : t('rented')}
                  </span>
                </div>
                {/* Tags */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {[selected.room_type].filter(Boolean).map((tag, i) => (
                    <span key={i} style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600 }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Property details grid — iProperty style checkmarks */}
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 14 }}>{t('detailProperty')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                   {[
                    [t('detailType'), selected.room_type],
                    [t('detailRent'), `RM ${selected.rent.toLocaleString()}/mo`],
                    [t('detailBedrooms'), `${selected.bedrooms || 1} ${t('bedroomsUnit')}`],
                    [t('detailBathrooms'), `${selected.bathrooms || 1} ${t('bathroomsUnit')}`],
                    [t('detailCommunity'), selected.community?.name || '—'],
                    [t('detailStatus'), selected.status === 'available' ? t('available') : t('rented')],
                    [t('detailAddress'), selected.community?.address || '—'],
                    [t('detailCoords'), selected.community ? `${selected.community.lat.toFixed(4)}, ${selected.community.lng.toFixed(4)}` : '—'],
                  ].map(([label, val], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                      <CheckCircle2 size={15} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 1 }}>{label}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-h)', fontWeight: 500 }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selected.description && (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>
                    About {selected.community?.name}
                  </h3>
                  <div style={{ width: 3, height: '100%', background: 'var(--primary)', borderRadius: 2, display: 'inline-block', marginRight: 10, verticalAlign: 'middle' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.75, borderLeft: '3px solid var(--primary)', paddingLeft: 14 }}>
                    {selected.description}
                  </p>
                </div>
              )}

              {/* Facilities */}
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 14 }}>{t('detailFacilities')}</h3>
                {selected.community?.amenities && selected.community.amenities.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                    {selected.community.amenities.map((key: string) => {
                      const detail = AMENITY_DETAILS[key];
                      if (!detail) return null;
                      const displayName = lang === 'zh' ? detail.zh : detail.en;
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--text-body)' }}>
                          <span style={{ color: 'var(--primary)', display: 'flex' }}>{detail.icon}</span>
                          {displayName}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {lang === 'zh' ? '暂无公共设施信息' : 'No facility information available'}
                  </div>
                )}
              </div>

              {/* Rent / Co-renting */}
              <div>
                {(() => {
                  const unitInterests = interests.filter(i => i.unit_id === selected.id && i.status !== 'left');
                  const confirmed = unitInterests.filter(i => i.status === 'confirmed').length;
                  const interested = unitInterests.filter(i => i.status === 'interested').length;
                  const registered = confirmed + interested;
                  const max = selected.max_occupants || 1;
                  const isFull = confirmed >= max;
                  const myEntry = authUserId
                    ? unitInterests.find(i => String(i.user_id) === String(authUserId))
                    : undefined;
                  const hasMyInterest = !!myEntry;
                  const isWholeUnit = selected.room_type === 'Whole Unit';

                  // Non–Whole Unit: simple rent button
                  if (!isWholeUnit) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {!hasMyInterest && !isFull && (
                          <button onClick={() => expressInterest(selected.id)} style={{
                            padding: '10px 24px', borderRadius: 8, border: 'none',
                            background: 'var(--primary)', color: 'white',
                            fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>{t('coRentJoin')}</button>
                        )}
                        {hasMyInterest && (
                          <button onClick={() => cancelInterest(selected.id)} disabled={submittingInterest} style={{
                            padding: '10px 24px', borderRadius: 8, border: '1px solid var(--danger)',
                            background: 'transparent', color: 'var(--danger)',
                            fontSize: '0.88rem', fontWeight: 600, cursor: submittingInterest ? 'wait' : 'pointer', fontFamily: 'inherit',
                          }}>{t('coRentCancel')}</button>
                        )}
                        {isFull && <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>{t('coRentFull')}</span>}
                      </div>
                    );
                  }

                  // Whole Unit: full co-renting flow
                  return (
                    <>
                      <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>{t('coRentTitle')}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {t('coRentOccupancy')}: <strong style={{ color: 'var(--text-h)' }}>{registered}/{max}</strong>
                          <span style={{ marginLeft: 6, fontSize: '0.75rem' }}>
                            ({t('coRentOccupancyConfirmed')} {confirmed} · {t('coRentInterested')} {interested})
                          </span>
                        </span>
                        {!hasMyInterest && !isFull && !showNoteInput && (
                          <button onClick={() => { setShowNoteInput(true); setInterestFeedback(null); }} disabled={submittingInterest} style={{
                            padding: '8px 18px', borderRadius: 8, border: 'none',
                            background: 'var(--primary)', color: 'white',
                            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>{t('coRentJoin')}</button>
                        )}
                        {hasMyInterest && (
                          <button onClick={() => cancelInterest(selected.id)} disabled={submittingInterest} style={{
                            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--danger)',
                            background: 'transparent', color: 'var(--danger)',
                            fontSize: '0.82rem', fontWeight: 600, cursor: submittingInterest ? 'wait' : 'pointer', fontFamily: 'inherit',
                            opacity: submittingInterest ? 0.7 : 1,
                          }}>{t('coRentCancel')}</button>
                        )}
                        {isFull && <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>{t('coRentFull')}</span>}
                      </div>

                      {interestFeedback && (
                        <div style={{
                          marginBottom: 12, padding: '10px 12px', borderRadius: 8, fontSize: '0.78rem',
                          background: interestFeedback.type === 'success' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                          color: interestFeedback.type === 'success' ? '#16A34A' : 'var(--danger)',
                          border: `1px solid ${interestFeedback.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        }}>
                          {interestFeedback.msg}
                        </div>
                      )}

                      {/* Note input */}
                      {showNoteInput && !hasMyInterest && (
                        <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('coRentNoteLabel')}</label>
                          <textarea className="form-textarea" rows={3} value={noteInput} onChange={e => setNoteInput(e.target.value)}
                            placeholder={t('coRentNotePlaceholder')}
                            style={{ resize: 'vertical', fontSize: '0.82rem', marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => expressInterest(selected.id)} disabled={submittingInterest} style={{
                              padding: '7px 16px', borderRadius: 6, border: 'none', background: 'var(--primary)',
                              color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: submittingInterest ? 'wait' : 'pointer', fontFamily: 'inherit',
                              opacity: submittingInterest ? 0.7 : 1,
                            }}>{submittingInterest ? '…' : t('coRentSubmit')}</button>
                            <button onClick={() => expressInterest(selected.id, '')} disabled={submittingInterest} style={{
                              padding: '7px 16px', borderRadius: 6, border: '1px solid var(--glass-border)',
                              background: 'transparent', color: 'var(--text-body)',
                              fontSize: '0.78rem', cursor: submittingInterest ? 'wait' : 'pointer', fontFamily: 'inherit',
                              opacity: submittingInterest ? 0.7 : 1,
                            }}>{t('coRentNoteSkip')}</button>
                          </div>
                        </div>
                      )}

                      {unitInterests.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {unitInterests.map(i => {
                            const isMe = authUserId && String(i.user_id) === String(authUserId);
                            return (
                            <div key={i.id}>
                              <div onClick={() => !isMe && i.note && setExpandedNote(expandedNote === i.id ? null : i.id)} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                                borderRadius: expandedNote === i.id ? '8px 8px 0 0' : 8,
                                background: isMe ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.04)',
                                border: i.status === 'confirmed' ? '1px solid rgba(22,163,74,0.2)' : isMe ? '1px solid rgba(59,130,246,0.25)' : '1px solid var(--glass-border)',
                                cursor: !isMe && i.note ? 'pointer' : 'default', transition: 'all 0.15s',
                              }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                                  {(i.full_name || i.email)[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)' }}>
                                    {i.full_name || i.email.split('@')[0]}
                                    {isMe && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--primary)' }}>({lang === 'zh' ? '我' : 'Me'})</span>}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{i.email}</div>
                                </div>
                                {isMe ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); cancelInterest(selected.id); }}
                                    disabled={submittingInterest}
                                    style={{
                                      padding: '4px 10px', borderRadius: 6, border: '1px solid var(--danger)',
                                      background: 'transparent', color: 'var(--danger)',
                                      fontSize: '0.68rem', fontWeight: 600, cursor: submittingInterest ? 'wait' : 'pointer', fontFamily: 'inherit',
                                    }}
                                  >{t('coRentCancel')}</button>
                                ) : (
                                  i.note && <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expandedNote === i.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                )}
                                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6,
                                  background: i.status === 'confirmed' ? 'rgba(22,163,74,0.12)' : 'rgba(59,130,246,0.1)',
                                  color: i.status === 'confirmed' ? '#16A34A' : 'var(--primary)',
                                }}>{i.status === 'confirmed' ? t('coRentConfirmed') : t('coRentInterested')}</span>
                              </div>
                              {expandedNote === i.id && i.note && (
                                <div style={{
                                  padding: '10px 12px 10px 50px', fontSize: '0.78rem', color: 'var(--text-body)', lineHeight: 1.6,
                                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderTop: 'none',
                                  borderRadius: '0 0 8px 8px',
                                }}>
                                  {i.note}
                                </div>
                              )}
                            </div>
                          );})}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Commute map */}
              {selected.community && (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>{t('detailCommute')}</h3>
                  <MapAndCard
                    origin_name={selected.community.name}
                    origin_lat={selected.community.lat}
                    origin_lng={selected.community.lng}
                    rent={selected.rent}
                    room_type={selected.room_type}
                    unit_id={selected.id}
                  />
                </div>
              )}

              {/* More units in same community */}
              {sameCommUnits.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>{t('detailMoreUnits')}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sameCommUnits.slice(0, 4).map(u => (
                      <div key={u.id} onClick={() => { setSelected(u); setImgIdx(0); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}>
                        <img src={getUnitImages(u.id, u.media_urls)[0]} alt="" style={{ width: 56, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-h)' }}>{u.room_type}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>RM {u.rent.toLocaleString()}{t('perMonth')}</div>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div style={{ padding: '20px 0 0', borderTop: '1px solid var(--glass-border)' }}>
                <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} onClick={() => setShowContact(true)}>
                  {t('detailContactBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image lightbox (full-size gallery) ── */}
      {lightboxOpen && selected && (() => {
        const imgs = getUnitImages(selected.id, selected.media_urls);
        if (!imgs.length) return null;
        const current = imgs[imgIdx] || imgs[0];
        const goPrev = () => setImgIdx(i => (i - 1 + imgs.length) % imgs.length);
        const goNext = () => setImgIdx(i => (i + 1) % imgs.length);
        return (
          <div
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 600,
              background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '20px 16px',
            }}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)',
                border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', marginBottom: 12 }}>
              {imgIdx + 1} / {imgs.length} · {selected.community?.name}
            </div>
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 960, flex: 1, minHeight: 0 }}
            >
              {imgs.length > 1 && (
                <button onClick={goPrev} style={lightboxNavBtnStyle} aria-label="Previous">
                  <ChevronLeft size={28} />
                </button>
              )}
              <img
                src={current}
                alt=""
                style={{ maxWidth: 'min(92vw, 960px)', maxHeight: 'min(72vh, 720px)', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 8, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
              />
              {imgs.length > 1 && (
                <button onClick={goNext} style={{ ...lightboxNavBtnStyle, right: 0, left: 'auto' }} aria-label="Next">
                  <ChevronRight size={28} />
                </button>
              )}
            </div>
            {imgs.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%', overflowX: 'auto', padding: '4px 0' }}>
                {imgs.map((src, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                    style={{
                      padding: 0, border: imgIdx === i ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.25)',
                      borderRadius: 6, overflow: 'hidden', width: 64, height: 44, cursor: 'pointer', background: 'transparent', flexShrink: 0,
                    }}
                  >
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Walkthrough video modal ── */}
      {videoOpen && selected && (() => {
        const vid = getUnitVideo(selected.id, selected.video_url);
        if (!vid) return null;
        return (
          <div
            onClick={() => setVideoOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 610,
              background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <button
              onClick={() => setVideoOpen(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
            <video
              src={vid}
              controls
              autoPlay
              playsInline
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 'min(92vw, 960px)', maxHeight: '85vh', borderRadius: 8, background: '#000' }}
            />
          </div>
        );
      })()}

      {/* ── Contact Admin Modal ── */}
      {showContact && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 500, padding: 20,
        }} onClick={() => setShowContact(false)}>
          <div style={{
            background: 'var(--bg-surface-solid)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '36px 32px', maxWidth: 420, width: '100%',
            boxShadow: 'var(--glass-shadow)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📞</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-h)', marginBottom: 6 }}>
                {t('contactTitle')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('contactDesc')}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {admins.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: '0.85rem' }}>
                  暂无管理员联系方式
                </div>
              ) : admins.map((admin, i) => {
                const isExpanded = expandedAdmin === i;
                return (
                  <div key={i} style={{
                    borderRadius: 12,
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                  }}>
                    {/* Header: name + expand button */}
                    <button
                      onClick={() => setExpandedAdmin(isExpanded ? null : i)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '14px 16px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.95rem' }}>
                        {admin.display_name || admin.email}
                      </span>
                      <ChevronDown size={18} style={{
                        color: 'var(--text-muted)',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }} />
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 16px 14px',
                        display: 'flex', flexDirection: 'column', gap: 8,
                        borderTop: '1px solid var(--border)',
                        paddingTop: 12,
                      }}>
                        {admin.phone && (
                          <a href={`tel:${admin.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-body)', textDecoration: 'none', fontSize: '0.85rem' }}>
                            <Phone size={14} style={{ color: 'var(--primary)' }} />
                            <span>{admin.phone}</span>
                          </a>
                        )}
                        {admin.whatsapp && (
                          <a href={`https://wa.me/${admin.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-body)', textDecoration: 'none', fontSize: '0.85rem' }}>
                            <MessageCircle size={14} style={{ color: '#25D366' }} />
                            <span>WhatsApp: {admin.whatsapp}</span>
                          </a>
                        )}
                        {admin.wechat_id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-body)', fontSize: '0.85rem' }}>
                            <MessageCircle size={14} style={{ color: '#07C160' }} />
                            <span>微信: {admin.wechat_id}</span>
                          </div>
                        )}
                        <a href={`mailto:${admin.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-body)', textDecoration: 'none', fontSize: '0.85rem' }}>
                          <Mail size={14} style={{ color: 'var(--primary)' }} />
                          <span>{admin.email}</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={() => setShowContact(false)} style={{
              width: '100%', marginTop: 20, padding: '12px', borderRadius: 12,
              background: 'var(--glass-bg)', border: '1px solid var(--border)',
              color: 'var(--text-body)', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer',
            }}>
              {t('detailClose')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Property Card ── */
function PropertyCard({ unit, onSelect, t }: { unit: UnitWithCommunity; onSelect: () => void; t: (k: any) => string }) {
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
      {/* Image */}
      <div style={{ position: 'relative', height: 190, overflow: 'hidden', background: '#0B1622' }}>
        <img
          src={getUnitImages(unit.id, unit.media_urls)[0]}
          alt={unit.room_type}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
          onError={(e: any) => { e.target.style.display = 'none'; }}
        />
        {/* Gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
        {/* Status pill */}
        <span className={`status-badge ${unit.status}`}
          style={{ position: 'absolute', top: 12, right: 12 }}>
          {unit.status === 'available' ? t('available') : t('rented')}
        </span>
        {/* Room type tag */}
        <span style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
          {unit.room_type}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px' }}>
        {/* Community name + address */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h4 style={{ fontSize: '0.95rem', lineHeight: 1.3, flex: 1 }}>{unit.community?.name || '—'}</h4>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
              RM {unit.rent.toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {unit.community?.address || '—'}
            </span>
          </div>
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[unit.room_type].filter(Boolean).map((tag, i) => (
            <span key={i} style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 600 }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Per-month + View */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 10, marginTop: 2 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Bed size={13} />
              <span>{unit.bedrooms || 1} {t('bedroomsUnit')}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Bath size={13} />
              <span>{unit.bathrooms || 1} {t('bathroomsUnit')}</span>
            </span>
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
            {t('viewDetail')} <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}
