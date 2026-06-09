'use client';

import React, { useState } from 'react';
import { Home, MapPin, Compass, Car, Footprints, Bus, Star, Shield, Sparkles, Wallet } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

interface MapAndCardProps {
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name?: string;
  destination_lat?: number;
  destination_lng?: number;
  rent?: number;
  room_type?: string;
  unit_id?: string;
  // Knowledge base mode props
  is_knowledge_base?: boolean;
  community_name?: string;
  university_name?: string;
  price_range?: { min: number; max: number; currency: string; unit: string };
  tenant_rating?: { overall: number; safety: number; cleanliness: number; value_for_money: number };
  description?: string;
  property_type?: string;
  auto_load?: boolean;
}

const MOCK_PLACES = [
  { name: 'Monash University Malaysia', address: 'Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya' },
  { name: 'Sunway University', address: 'Jalan Universiti, Bandar Sunway, 47500 Subang Jaya' },
  { name: 'Taylor\'s University Lakeside Campus', address: 'Jalan Taylors, Bandar Sunway, 47500 Subang Jaya' },
  { name: 'Sunway Pyramid Shopping Mall', address: 'Jalan PJS 11/15, Bandar Sunway, 47500 Subang Jaya' },
  { name: 'Sunway Lagoon BRT Station', address: 'Bandar Sunway, Subang Jaya' },
  { name: 'Subang Jaya LRT Station', address: 'Subang Jaya, Selangor' },
];

export default function MapAndCard({
  origin_name, origin_lat, origin_lng,
  destination_name, destination_lat, destination_lng,
  rent, room_type,
  is_knowledge_base, community_name, university_name,
  price_range, tenant_rating, description, property_type,
  auto_load
}: MapAndCardProps) {
  const { t, lang } = useApp();
  const [commuteMode, setCommuteMode] = useState<'driving' | 'walking' | 'transit'>('driving');

  // Debug log to verify props
  React.useEffect(() => {
    if (is_knowledge_base && community_name) {
      console.log(`[MapAndCard] Rendering KB card:`, {
        community_name,
        origin_lat,
        origin_lng,
        price_range,
        description: description?.substring(0, 50)
      });
    }
  }, [is_knowledge_base, community_name, origin_lat, origin_lng]);

  // If destination props are provided (commute case), show route directly
  const isCommuteMode = !!(destination_name && destination_lat && destination_lng);
  const isKBMode = !!is_knowledge_base;
  // Room listing mode: map only loads on user click (saves API quota) unless auto_load or is_knowledge_base is true
  const [roomMapLoaded, setRoomMapLoaded] = useState(!!(auto_load || is_knowledge_base));

  // Start point (origin) states — only used in non-commute (room listing) mode
  const [customStart, setCustomStart] = useState<string>('');
  const [activeStart, setActiveStart] = useState<{ name: string } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleStartSearch = (val: string) => {
    setCustomStart(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      autocompleteService.getPlacePredictions(
        {
          input: val,
          componentRestrictions: { country: 'my' },
          types: ['establishment', 'geocode']
        },
        (predictions, status) => {
          if (status === window.google!.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions.map((p) => ({
              description: p.description,
              place_id: p.place_id,
              main_text: p.structured_formatting.main_text,
              secondary_text: p.structured_formatting.secondary_text,
            })));
          } else {
            setSuggestions([]);
          }
        }
      );
    } else {
      // Fallback
      setSuggestions(MOCK_PLACES.filter(p => p.name.toLowerCase().includes(val.toLowerCase())).map(p => ({
        description: p.name + ', ' + p.address,
        place_id: '',
        main_text: p.name,
        secondary_text: p.address,
      })));
    }
  };

  const selectSuggestion = (s: any) => {
    const displayName = s.description || s.main_text;
    setCustomStart(displayName);
    setActiveStart({ name: displayName });
    setSuggestions([]);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart.trim()) {
      setActiveStart({ name: customStart.trim() });
      setSuggestions([]);
    }
  };

  const handleReset = () => {
    setCustomStart('');
    setActiveStart(null);
    setSuggestions([]);
  };

  const modes = [
    { key: 'driving' as const, icon: <Car size={13} />, label: lang === 'zh' ? '驾车' : 'Drive' },
    { key: 'transit' as const, icon: <Bus size={13} />, label: lang === 'zh' ? '公交/快铁' : 'Transit' },
    { key: 'walking' as const, icon: <Footprints size={13} />, label: lang === 'zh' ? '步行' : 'Walk' },
  ];

  // Construct iframe URL
  let mapUrl = '';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const modeParam = commuteMode === 'transit' ? 'transit' : commuteMode === 'walking' ? 'walking' : 'driving';
  const legacyModeParam = commuteMode === 'transit' ? 'r' : commuteMode === 'walking' ? 'w' : 'd';

  // Smart fail-safe: if API key is missing, empty, or placeholder/dummy, use keyless maps embed URLs
  const useKeyless = !apiKey || apiKey.includes('YOUR_') || apiKey.length < 10;

  if (useKeyless) {
    if (isCommuteMode && destination_lat && destination_lng) {
      mapUrl = `https://maps.google.com/maps?saddr=${origin_lat},${origin_lng}&daddr=${destination_lat},${destination_lng}&dirflg=${legacyModeParam}&output=embed`;
    } else if (activeStart) {
      mapUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(activeStart.name)}&daddr=${origin_lat},${origin_lng}&dirflg=${legacyModeParam}&output=embed`;
    } else {
      mapUrl = `https://maps.google.com/maps?q=${origin_lat},${origin_lng}&z=16&output=embed`;
    }
  } else {
    if (isCommuteMode && destination_lat && destination_lng) {
      // Commute mode: show route from origin to destination directly
      mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin_lat},${origin_lng}&destination=${destination_lat},${destination_lng}&mode=${modeParam}`;
    } else if (activeStart) {
      // Room listing mode with user-entered start point
      mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(activeStart.name)}&destination=${origin_lat},${origin_lng}&mode=${modeParam}`;
    } else {
      // Room listing mode: show single location marker
      mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${origin_lat},${origin_lng}&zoom=16`;
    }
  }

  return (
    <div className="map-card-wrapper" style={{ animation: 'slideUp 0.35s ease-out' }}>
      {/* Header: commute mode shows origin → destination, KB mode shows community profile, room mode shows property */}
      {isCommuteMode ? (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: isKBMode ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isKBMode ? <Sparkles size={22} color="white" /> : <MapPin size={22} color="#16A34A" />}
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-h)' }}>{community_name || origin_name}</div>
              {university_name && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>📍 {university_name} 附近</div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {lang === 'zh' ? '→ ' : '→ '}<strong>{destination_name}</strong>
              </div>
            </div>
          </div>
          {/* Community info row — price, rating, safety */}
          {isKBMode && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {price_range && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(34, 197, 94, 0.08)', padding: '4px 10px', borderRadius: 6 }}>
                  <Wallet size={12} style={{ color: '#22C55E' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22C55E' }}>
                    RM {price_range.min} - {price_range.max}{t('perMonth')}
                  </span>
                </div>
              )}
              {tenant_rating?.overall && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(234, 179, 8, 0.08)', padding: '4px 10px', borderRadius: 6 }}>
                  <Star size={12} style={{ color: '#EAB308', fill: '#EAB308' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#EAB308' }}>{tenant_rating.overall}</span>
                </div>
              )}
              {tenant_rating?.safety && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(59, 130, 246, 0.08)', padding: '4px 10px', borderRadius: 6 }}>
                  <Shield size={12} style={{ color: '#3B82F6' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3B82F6' }}>
                    {lang === 'zh' ? '安全 ' : 'Safe '}{tenant_rating.safety}
                  </span>
                </div>
              )}
            </div>
          )}
          {isKBMode && description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {description}
            </div>
          )}
        </div>
      ) : isKBMode ? (
        /* Knowledge Base Community Card */
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={22} color="white" />
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-h)' }}>{community_name || origin_name}</div>
              {university_name && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>📍 {university_name} 附近</div>
              )}
              {property_type && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{property_type}</div>
              )}
            </div>
          </div>
          {/* Price range + ratings row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {price_range && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(34, 197, 94, 0.08)', padding: '4px 10px', borderRadius: 6 }}>
                <Wallet size={12} style={{ color: '#22C55E' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22C55E' }}>
                  RM {price_range.min} - {price_range.max}{t('perMonth')}
                </span>
              </div>
            )}
            {tenant_rating?.overall && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(234, 179, 8, 0.08)', padding: '4px 10px', borderRadius: 6 }}>
                <Star size={12} style={{ color: '#EAB308', fill: '#EAB308' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#EAB308' }}>{tenant_rating.overall}</span>
              </div>
            )}
            {tenant_rating?.safety && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(59, 130, 246, 0.08)', padding: '4px 10px', borderRadius: 6 }}>
                <Shield size={12} style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3B82F6' }}>
                  {lang === 'zh' ? '安全 ' : 'Safe '}{tenant_rating.safety}
                </span>
              </div>
            )}
          </div>
          {description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {description}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Home size={22} color="var(--primary)" />
          </div>
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-h)' }}>{origin_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {room_type || (lang === 'zh' ? '地点位置' : 'Location')}
              {rent !== undefined && (
                <> · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>RM {rent}{t('perMonth')}</span></>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Starting Point Input — only in room listing mode (not commute) */}
      {!isCommuteMode && (
        <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--glass-border)', position: 'relative' }}>
          <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: 8, width: '100%' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder={lang === 'zh' ? '输入出发地点（例如：学校、地标）' : 'Enter starting point (e.g. school, landmark)'}
                value={customStart}
                onChange={e => handleStartSearch(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '6px 10px 6px 28px', height: 34, width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-body)' }}
              />
              <MapPin size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />

              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg-surface-solid, #1e1e24)',
                  border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm, 6px)',
                  zIndex: 50, boxShadow: 'var(--glass-shadow)', maxHeight: '180px', overflowY: 'auto', marginTop: 4
                }}>
                  {suggestions.map((s, i) => (
                    <div key={i} className="suggestion-item" onClick={() => selectSuggestion(s)}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.8rem' }}>{s.main_text}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.secondary_text || s.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {activeStart && (
              <button type="button" onClick={handleReset}
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, height: 34, flexShrink: 0 }}>
                {t('clearRoute')}
              </button>
            )}
          </form>
        </div>
      )}

      {/* Route info bar */}
      {isCommuteMode ? (
        <div style={{ padding: '8px 16px', background: 'rgba(22, 163, 74, 0.05)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <Compass size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {lang === 'zh' ? '🚗 通勤路线：' : '🚗 Commute route: '}
            <strong style={{ color: 'var(--text-h)' }}>{origin_name}</strong>
            {lang === 'zh' ? ' → ' : ' → '}
            <strong style={{ color: 'var(--text-h)' }}>{destination_name}</strong>
          </span>
        </div>
      ) : isKBMode ? (
        <div style={{ padding: '8px 16px', background: 'rgba(139, 92, 246, 0.05)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <Compass size={14} style={{ color: '#8B5CF6', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {lang === 'zh' ? '🏘️ 小区位置 · 在上方输入出发地可计算通勤路线' : '🏘️ Community location · Enter starting point above to calculate commute'}
          </span>
        </div>
      ) : !activeStart ? (
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

      {/* Commute mode bar — show in both commute mode and room+activeStart mode */}
      {(isCommuteMode || activeStart) && (
        <div className="commute-bar">
          {modes.map(m => (
            <button key={m.key} className={`commute-btn ${commuteMode === m.key ? 'active' : ''}`}
              onClick={() => setCommuteMode(m.key)}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Google Maps Embed iframe — commute: auto-load; room listing: only on click (saves API quota) */}
      <div className="map-placeholder" style={{ height: 260, position: 'relative', overflow: 'hidden' }}>
        {(isCommuteMode || roomMapLoaded) && mapUrl ? (
          <iframe
            key={mapUrl}
            width="100%" height="100%"
            style={{ border: 0, display: 'block' }}
            loading="lazy" allowFullScreen
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
              onClick={() => setRoomMapLoaded(true)}
              style={{
                background: 'var(--primary)', border: 'none', color: 'white',
                padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 6, transition: 'all 0.2s', boxShadow: 'var(--primary-glow) 0 4px 12px'
              }}
            >
              <MapPin size={12} /> {t('viewRoute')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
