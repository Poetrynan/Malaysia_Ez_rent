'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { isMockDatabase } from '@/lib/supabase';

interface FavoritesManagerProps {
  unitId: string;
  userId: string | null;
  size?: number;
  onToggle?: (isFavorite: boolean) => void;
}

export default function FavoritesManager({ unitId, userId, size = 20, onToggle }: FavoritesManagerProps) {
  const { lang } = useApp();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  // 检查是否已收藏
  useEffect(() => {
    if (!userId || !unitId) return;

    const checkFavorite = async () => {
      if (isMockDatabase) {
        const favorites = JSON.parse(localStorage.getItem('ez_favorites') || '[]');
        setIsFavorite(favorites.some((f: any) => f.user_id === userId && f.unit_id === unitId));
      } else {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('unit_id', unitId)
            .maybeSingle();
          setIsFavorite(!!data);
        } catch (e) {
          console.error('Check favorite error:', e);
        }
      }
    };

    checkFavorite();
  }, [userId, unitId]);

  // 切换收藏状态
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      alert(lang === 'zh' ? '请先登录' : 'Please login first');
      return;
    }
    if (loading) return;

    setLoading(true);
    const newStatus = !isFavorite;

    if (isMockDatabase) {
      const favorites = JSON.parse(localStorage.getItem('ez_favorites') || '[]');
      if (newStatus) {
        favorites.push({ user_id: userId, unit_id: unitId, created_at: new Date().toISOString() });
      } else {
        const idx = favorites.findIndex((f: any) => f.user_id === userId && f.unit_id === unitId);
        if (idx !== -1) favorites.splice(idx, 1);
      }
      localStorage.setItem('ez_favorites', JSON.stringify(favorites));
      setIsFavorite(newStatus);
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        if (newStatus) {
          await supabase.from('favorites').insert({ user_id: userId, unit_id: unitId });
        } else {
          await supabase.from('favorites').delete().eq('user_id', userId).eq('unit_id', unitId);
        }
        setIsFavorite(newStatus);
      } catch (e) {
        console.error('Toggle favorite error:', e);
      }
    }

    setLoading(false);
    onToggle?.(newStatus);
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading || !userId}
      style={{
        background: 'none',
        border: 'none',
        padding: 4,
        cursor: userId ? 'pointer' : 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s',
        transform: loading ? 'scale(0.8)' : 'scale(1)',
      }}
      title={isFavorite ? (lang === 'zh' ? '取消收藏' : 'Remove from favorites') : (lang === 'zh' ? '收藏' : 'Add to favorites')}
    >
      <Heart
        size={size}
        fill={isFavorite ? '#ef4444' : 'none'}
        color={isFavorite ? '#ef4444' : 'var(--text-muted)'}
        style={{ transition: 'all 0.2s' }}
      />
    </button>
  );
}
