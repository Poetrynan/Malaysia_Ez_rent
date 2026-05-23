'use client';

import React, { useState } from 'react';
import { Home, MapPin, Compass, Navigation, Car, Footprints, Bus } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

interface MapAndCardProps {
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name: string;
  destination_lat: number;
  destination_lng: number;
  rent: number;
  room_type: string;
  unit_id: string;
}

export default function MapAndCard({
  origin_name, origin_lat, origin_lng,
  destination_name, destination_lat, destination_lng,
  rent, room_type
}: MapAndCardProps) {
  const { t, theme } = useApp();
  const [commuteMode, setCommuteMode] = useState<'driving' | 'walking' | 'transit'>('driving');

  const modes = [
    { key: 'driving' as const, icon: <Car size={13} />, label: t('driving') },
    { key: 'transit' as const, icon: <Bus size={13} />, label: t('transit') },
    { key: 'walking' as const, icon: <Footprints size={13} />, label: t('walking') },
  ];

  const pathColor = theme === 'dark' ? '#3B82F6' : '#2563EB';

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

      {/* Commute mode bar */}
      <div className="commute-bar">
        {modes.map(m => (
          <button
            key={m.key}
            className={`commute-btn ${commuteMode === m.key ? 'active' : ''}`}
            onClick={() => setCommuteMode(m.key)}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Real Google Maps Directions iframe */}
      <div className="map-placeholder" style={{ height: 220 }}>
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${origin_lat},${origin_lng}&destination=${destination_lat},${destination_lng}&mode=${commuteMode === 'transit' ? 'transit' : commuteMode === 'walking' ? 'walking' : 'driving'}`}
        />
      </div>
    </div>
  );
}
