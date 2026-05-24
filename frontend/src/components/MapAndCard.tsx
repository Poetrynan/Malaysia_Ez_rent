'use client';

import React, { useState } from 'react';
import { Home, MapPin, Compass, Car, Footprints, Bus } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

interface MapAndCardProps {
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  rent: number;
  room_type: string;
  unit_id: string;
}

export default function MapAndCard({
  origin_name, origin_lat, origin_lng,
  rent, room_type
}: MapAndCardProps) {
  const { t, lang } = useApp();
  const [commuteMode, setCommuteMode] = useState<'driving' | 'walking' | 'transit'>('driving');
  const [showMap, setShowMap] = useState(false);

  // Start point (origin) states
  const [customStart, setCustomStart] = useState<string>(''); // User-typed start point
  const [activeStart, setActiveStart] = useState<{ name: string } | null>(null);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart.trim()) {
      setActiveStart({ name: customStart.trim() });
      setShowMap(true);
    }
  };

  const handleReset = () => {
    setCustomStart('');
    setActiveStart(null);
  };

  const modes = [
    { key: 'driving' as const, icon: <Car size={13} />, label: lang === 'zh' ? '驾车' : 'Drive' },
    { key: 'transit' as const, icon: <Bus size={13} />, label: lang === 'zh' ? '公交/快铁' : 'Transit' },
    { key: 'walking' as const, icon: <Footprints size={13} />, label: lang === 'zh' ? '步行' : 'Walk' },
  ];

  // Construct iframe URL:
  // If activeStart is null -> Google Maps Embed Place Mode (single marker at origin_lat, origin_lng)
  // If activeStart is entered -> Directions mode from activeStart.name to origin_lat, origin_lng
  let mapUrl = '';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!activeStart) {
    mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${origin_lat},${origin_lng}&zoom=16`;
  } else {
    const modeParam = commuteMode === 'transit' ? 'transit' : commuteMode === 'walking' ? 'walking' : 'driving';
    mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(activeStart.name)}&destination=${origin_lat},${origin_lng}&mode=${modeParam}`;
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

      {/* Starting Point Input area */}
      <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--glass-border)' }}>
        <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: 8, width: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'zh' ? '输入出发地点（例如：学校、火车站、地标）' : 'Enter starting point (e.g. school, station, landmark)'}
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 10px 6px 28px', height: 34, width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-body)' }}
            />
            <MapPin size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
          </div>
          
          <button
            type="submit"
            style={{
              background: 'var(--primary)', border: 'none', color: 'white',
              padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, height: 34, flexShrink: 0
            }}
          >
            {lang === 'zh' ? '计算通勤' : 'Commute'}
          </button>
          
          {activeStart && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444',
                padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, height: 34, flexShrink: 0, transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              {t('clearRoute')}
            </button>
          )}
        </form>
      </div>

      {/* Place / Route description bar */}
      {!activeStart ? (
        <div style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.05)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <Compass size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {lang === 'zh' ? '📍 当前显示房间位置。在上方输入出发地可计算至房间的通勤路线。' : '📍 Showing room location. Enter starting point above to calculate route to room.'}
          </span>
        </div>
      ) : (
        <div style={{ padding: '8px 16px', background: 'rgba(22, 163, 74, 0.05)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <Compass size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {lang === 'zh' ? '🚗 正在规划从 ' : '🚗 Commuting from '}
            <strong style={{ color: 'var(--text-h)' }}>{activeStart.name}</strong>
            {lang === 'zh' ? ' 到房间的路线' : ' to the room'}
          </span>
        </div>
      )}

      {/* Commute mode bar */}
      {activeStart && (
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
