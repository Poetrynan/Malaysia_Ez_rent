'use client';

import React, { useState, useEffect } from 'react';
import { Home, MapPin, Compass, Navigation, Car, Footprints, Bus, Search } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { supabase } from '@/lib/supabase';

interface MapAndCardProps {
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name?: string;
  destination_lat?: number;
  destination_lng?: number;
  rent: number;
  room_type: string;
  unit_id: string;
}

const MALAYSIAN_UNIVERSITIES = [
  { name: 'Monash University Malaysia', zhName: '莫纳什大学', lat: 3.0645, lng: 101.6000 },
  { name: 'Sunway University', zhName: '双威大学', lat: 3.0678, lng: 101.6033 },
  { name: 'Taylor\'s University Lakeside Campus', zhName: '泰莱大学', lat: 3.0593, lng: 101.6160 },
  { name: 'INTI International College Subang', zhName: '英迪国际大学', lat: 3.0782, lng: 101.5898 },
  { name: 'Asia Pacific University (APU)', zhName: '亚太科技大学 (APU)', lat: 3.0560, lng: 101.7000 },
  { name: 'UCSI University', zhName: '思特雅大学 (UCSI)', lat: 3.0795, lng: 101.7371 },
  { name: 'University of Malaya (UM)', zhName: '马来亚大学 (UM)', lat: 3.1209, lng: 101.6538 }
];

export default function MapAndCard({
  origin_name, origin_lat, origin_lng,
  rent, room_type
}: MapAndCardProps) {
  const { t, theme, lang } = useApp();
  const [commuteMode, setCommuteMode] = useState<'driving' | 'walking' | 'transit'>('driving');
  const [showMap, setShowMap] = useState(false);

  // University / Custom destination states
  const [dbUniversities, setDbUniversities] = useState<any[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<string>(''); // Name of selected university
  const [customDest, setCustomDest] = useState<string>(''); // Custom input text
  const [activeDest, setActiveDest] = useState<{ name: string; lat?: number; lng?: number } | null>(null);

  useEffect(() => {
    async function loadUniversities() {
      try {
        const { data } = await supabase.from('universities').select('*');
        if (data && data.length > 0) {
          setDbUniversities(data);
        }
      } catch (e) {
        console.error('Failed to load universities:', e);
      }
    }
    loadUniversities();
  }, []);

  const allUniversities = [
    ...dbUniversities,
    ...MALAYSIAN_UNIVERSITIES.filter(mu => !dbUniversities.some(du => du.name.toLowerCase() === mu.name.toLowerCase()))
  ];

  const handleUnivSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedUniv(val);
    if (!val) {
      setActiveDest(null);
      setCustomDest('');
      return;
    }

    if (val === '__custom__') {
      setActiveDest(null);
    } else {
      const u = allUniversities.find(x => x.name === val);
      if (u) {
        setActiveDest({ name: u.name, lat: u.lat, lng: u.lng });
        setShowMap(true);
      }
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDest.trim()) {
      setActiveDest({ name: customDest.trim() });
      setShowMap(true);
    }
  };

  const handleReset = () => {
    setSelectedUniv('');
    setCustomDest('');
    setActiveDest(null);
  };

  const modes = [
    { key: 'driving' as const, icon: <Car size={13} />, label: lang === 'zh' ? '驾车' : 'Drive' },
    { key: 'transit' as const, icon: <Bus size={13} />, label: lang === 'zh' ? '公交/快铁' : 'Transit' },
    { key: 'walking' as const, icon: <Footprints size={13} />, label: lang === 'zh' ? '步行' : 'Walk' },
  ];

  // Construct iframe URL:
  // If activeDest is null -> Google Maps Embed Place Mode (single marker at origin_lat, origin_lng)
  // If activeDest has lat/lng -> Directions mode with coords
  // If activeDest is custom text -> Directions mode with destination string query parameter
  let mapUrl = '';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!activeDest) {
    mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${origin_lat},${origin_lng}&zoom=16`;
  } else {
    const modeParam = commuteMode === 'transit' ? 'transit' : commuteMode === 'walking' ? 'walking' : 'driving';
    if (activeDest.lat !== undefined && activeDest.lng !== undefined) {
      mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin_lat},${origin_lng}&destination=${activeDest.lat},${activeDest.lng}&mode=${modeParam}`;
    } else {
      mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin_lat},${origin_lng}&destination=${encodeURIComponent(activeDest.name)}&mode=${modeParam}`;
    }
  }

  return (
    <div className="map-card-wrapper" style={{ animation: 'slideUp 0.35s ease-out' }}>
      {/* Property Header */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Home size={22} color="var(--primary)" />
        </div>
        <div style={{ flexGrow: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-h)' }}>{origin_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {room_type} · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>RM {rent}{t('perMonth')}</span>
          </div>
        </div>
      </div>

      {/* Destination Selector area */}
      <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="form-select"
            value={selectedUniv}
            onChange={handleUnivSelect}
            style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px', height: 34, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-body)' }}
          >
            <option value="">{t('selectUniversity')}</option>
            {allUniversities.map(u => (
              <option key={u.name} value={u.name}>
                {lang === 'zh' && u.zhName ? u.zhName : u.name}
              </option>
            ))}
            <option value="__custom__">🔍 {lang === 'zh' ? '输入自定义目的地...' : 'Custom Destination...'}</option>
          </select>

          {activeDest && (
            <button
              onClick={handleReset}
              style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444',
                padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, height: 34, transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              {t('clearRoute')}
            </button>
          )}
        </div>

        {selectedUniv === '__custom__' && (
          <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: 6, width: '100%', marginTop: 2 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder={lang === 'zh' ? '例如: Sunway Pyramid 或 路线地标' : 'e.g. Sunway Pyramid or address'}
                value={customDest}
                onChange={e => setCustomDest(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '6px 10px 6px 28px', height: 34, width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-body)' }}
              />
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            <button
              type="submit"
              style={{
                background: 'var(--primary)', border: 'none', color: 'white',
                padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, height: 34
              }}
            >
              {t('calculateRoute')}
            </button>
          </form>
        )}
      </div>

      {/* Place / Route description bar */}
      {!activeDest ? (
        <div style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.05)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {t('destPrompt')}
          </span>
        </div>
      ) : (
        <div style={{ padding: '8px 16px', background: 'rgba(22, 163, 74, 0.05)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <Compass size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {lang === 'zh' ? '📍 正在规划至 ' : '📍 Commuting to '}
            <strong style={{ color: 'var(--text-h)' }}>{activeDest.name}</strong>
            {lang === 'zh' ? ' 的路线' : ' route'}
          </span>
        </div>
      )}

      {/* Commute mode bar */}
      {activeDest && (
        <div className="commute-bar">
          {modes.map(m => (
            <button
              key={m.key}
              className={`commute-btn ${commuteMode === m.key ? 'active' : ''}`}
              onClick={() => {
                setCommuteMode(m.key);
                setShowMap(true);
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Google Maps Embed iframe */}
      <div className="map-placeholder" style={{ height: 260, position: 'relative', overflow: 'hidden' }}>
        {showMap ? (
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block' }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={mapUrl}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'var(--glass-bg)', padding: 20, textAlign: 'center'
          }}>
            <Compass size={32} style={{ color: 'var(--primary)', opacity: 0.8, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t('clickToLoadMapHint')}
            </span>
            <button
              onClick={() => setShowMap(true)}
              style={{
                background: 'var(--primary)', border: 'none', color: 'white',
                padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 6, transition: 'all 0.2s', boxShadow: 'var(--primary-glow) 0 4px 12px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
            >
              <MapPin size={12} /> {t('viewRoute')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
