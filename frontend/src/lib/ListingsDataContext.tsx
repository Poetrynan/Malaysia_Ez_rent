'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { isMockDatabase } from '@/lib/supabase';

export interface ListingsUnit {
  id: string;
  community_id: string;
  room_type: string;
  rent: number;
  status: string;
  description: string;
  max_occupants?: number;
  media_urls?: string[];
  video_url?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  agent_id?: string | null;
  available_from?: string | null;
}

export interface ListingsCommunity {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  amenities?: string[];
  image_url?: string | null;
}

export interface UnitWithCommunity extends ListingsUnit {
  community: ListingsCommunity | null;
}

export interface AdminContact {
  id?: string;
  display_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  wechat_id: string | null;
  email: string;
  avatar_url?: string | null;
  job_title?: string | null;
  agency_name?: string | null;
  agency_license?: string | null;
  agency_address?: string | null;
  bio?: string | null;
  experience_years?: number | null;
  experience_months?: number | null;
  area_expertise?: string[] | string | null;
  property_types?: string[] | string | null;
}

interface ListingsDataContextType {
  units: UnitWithCommunity[];
  admins: AdminContact[];
  favoriteUnitIds: Set<string>;
  listingsError: string | null;
  isListingsLoaded: boolean;
  isRefreshing: boolean;
  loadListings: (options?: { force?: boolean }) => Promise<void>;
  loadAdmins: (options?: { force?: boolean }) => Promise<void>;
  loadFavorites: (userId: string | null | undefined, options?: { force?: boolean }) => Promise<void>;
  invalidateListings: () => void;
}

const ListingsDataContext = createContext<ListingsDataContextType | undefined>(undefined);

export function ListingsDataProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnits] = useState<UnitWithCommunity[]>([]);
  const [admins, setAdmins] = useState<AdminContact[]>([]);
  const [favoriteUnitIds, setFavoriteUnitIds] = useState<Set<string>>(new Set());
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [isListingsLoaded, setIsListingsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const listingsFetchRef = useRef<Promise<void> | null>(null);
  const adminsLoadedRef = useRef(false);
  const favoritesUserIdRef = useRef<string | null>(null);

  const loadListings = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    const hasCache = isListingsLoaded;

    if (hasCache && !force) {
      if (listingsFetchRef.current) return listingsFetchRef.current;
      setIsRefreshing(true);
      listingsFetchRef.current = (async () => {
        try {
          await fetchListingsInto(setUnits, setListingsError, false);
        } finally {
          setIsRefreshing(false);
          listingsFetchRef.current = null;
        }
      })();
      return listingsFetchRef.current;
    }

    if (!hasCache) setListingsError(null);
    setIsRefreshing(force && hasCache);
    listingsFetchRef.current = (async () => {
      try {
        await fetchListingsInto(setUnits, setListingsError);
        setIsListingsLoaded(true);
      } finally {
        setIsRefreshing(false);
        listingsFetchRef.current = null;
      }
    })();
    return listingsFetchRef.current;
  }, [isListingsLoaded]);

  const loadAdmins = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    if (adminsLoadedRef.current && !force) return;
    await fetchAdminsInto(setAdmins);
    adminsLoadedRef.current = true;
  }, []);

  const loadFavorites = useCallback(async (userId: string | null | undefined, options?: { force?: boolean }) => {
    if (!userId) {
      setFavoriteUnitIds(new Set());
      favoritesUserIdRef.current = null;
      return;
    }
    const force = options?.force ?? false;
    if (!force && favoritesUserIdRef.current === userId) return;
    await fetchFavoritesInto(userId, setFavoriteUnitIds);
    favoritesUserIdRef.current = userId;
  }, []);

  const invalidateListings = useCallback(() => {
    setIsListingsLoaded(false);
    adminsLoadedRef.current = false;
  }, []);

  return (
    <ListingsDataContext.Provider
      value={{
        units,
        admins,
        favoriteUnitIds,
        listingsError,
        isListingsLoaded,
        isRefreshing,
        loadListings,
        loadAdmins,
        loadFavorites,
        invalidateListings,
      }}
    >
      {children}
    </ListingsDataContext.Provider>
  );
}

export function useListingsData() {
  const context = useContext(ListingsDataContext);
  if (context === undefined) {
    throw new Error('useListingsData must be used within a ListingsDataProvider');
  }
  return context;
}

async function fetchListingsInto(
  setUnits: React.Dispatch<React.SetStateAction<UnitWithCommunity[]>>,
  setListingsError: React.Dispatch<React.SetStateAction<string | null>>,
  clearOnError = true,
) {
  try {
    if (isMockDatabase) {
      const allUnits: ListingsUnit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
      const allCommunities: ListingsCommunity[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      setUnits(allUnits.map(u => ({
        ...u,
        community: allCommunities.find(c => c.id === u.community_id) || null,
      })));
      setListingsError(null);
      return;
    }

    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const [unitRes, commRes] = await Promise.all([
      supabase.from('units').select('*'),
      supabase.from('communities').select('*'),
    ]);

    if (unitRes.error || commRes.error) {
      const msg = unitRes.error?.message || commRes.error?.message || 'Failed to load listings';
      console.error('[listings] Supabase error:', unitRes.error, commRes.error);
      setListingsError(msg);
      if (!unitRes.data?.length) setUnits([]);
      return;
    }

    const allUnits: ListingsUnit[] = unitRes.data || [];
    const allCommunities: ListingsCommunity[] = commRes.data || [];
    setUnits(allUnits.map(u => ({
      ...u,
      community: allCommunities.find(c => c.id === u.community_id) || null,
    })));
    setListingsError(null);
  } catch (e) {
    console.error('[listings] load failed:', e);
    setListingsError(e instanceof Error ? e.message : 'Failed to load listings');
    if (clearOnError) setUnits([]);
  }
}

async function fetchAdminsInto(setAdmins: React.Dispatch<React.SetStateAction<AdminContact[]>>) {
  if (isMockDatabase) {
    const storedAdmins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
    if (storedAdmins.length > 0) {
      setAdmins(storedAdmins);
    } else {
      const defaultAgent: AdminContact = {
        id: 'admin-999',
        display_name: 'Nick Chan',
        phone: '+6012-345 6789',
        whatsapp: '60123456789',
        wechat_id: 'nick_chan_ren',
        email: 'admin@ezrent.my',
        avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nick',
        job_title: 'Senior Rental Manager',
        agency_name: 'VIVAHOMES REALTY SDN. BHD',
        agency_license: 'E (1) 1670',
        agency_address: 'No. 25-3, Jalan PJU 5/20, The Strand, Kota Damansara, 47810 Petaling Jaya, Selangor',
        bio: 'Specialist in student accommodations near Sunway, Monash and Taylor universities. With over 5 years of experience in the rental market, I help students find their perfect home away from home with premium, hassle-free services.',
        experience_years: 5,
        experience_months: 6,
        area_expertise: ['Bandar Sunway', 'Subang Jaya', 'Petaling Jaya'],
        property_types: ['Condo', 'Serviced Residence', 'Apartment', 'Room'],
      };
      setAdmins([defaultAgent]);
      localStorage.setItem('ez_admins', JSON.stringify([defaultAgent]));
    }
    return;
  }
  try {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const { data, error } = await supabase.from('admin_users').select('*');
    if (error) console.error('[listings] admin_users:', error);
    if (data) setAdmins(data as AdminContact[]);
  } catch (e) {
    console.error('[listings] load admins failed:', e);
  }
}

async function fetchFavoritesInto(
  userId: string,
  setFavoriteUnitIds: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  if (isMockDatabase) {
    const favorites = JSON.parse(localStorage.getItem('ez_favorites') || '[]');
    const ids = favorites.filter((f: { user_id: string }) => f.user_id === userId).map((f: { unit_id: string }) => f.unit_id);
    setFavoriteUnitIds(new Set(ids));
    return;
  }
  try {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const { data } = await supabase.from('favorites').select('unit_id').eq('user_id', userId);
    setFavoriteUnitIds(new Set((data || []).map((f: { unit_id: string }) => f.unit_id)));
  } catch (e) {
    console.error('Load favorites error:', e);
  }
}
