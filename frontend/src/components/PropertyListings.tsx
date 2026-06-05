'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, SlidersHorizontal, MapPin, Bed, Bath, DollarSign, Tag,
  Building2, X, ChevronRight, ChevronLeft, CheckCircle2, Car, Footprints,
  Bus, Wifi, ShieldCheck, ParkingCircle, Dumbbell, Waves, Star, Video,
  Phone, MessageCircle, Mail, ChevronDown, Shirt, BookOpen, Store,
  Grid, List, User, Calendar, Globe, MessageSquare, XCircle, AlertTriangle,
  RefreshCw
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
import FavoritesManager from './FavoritesManager';
import ReviewSystem from './ReviewSystem';
import AgentRatingBadge from './AgentRatingBadge';
import { useApp } from '@/lib/ThemeProvider';
import { nonNegativeInputValue } from '@/lib/numberInput';

interface Unit {
  id: string; community_id: string;
  room_type: string; rent: number; status: string; description: string; max_occupants?: number; media_urls?: string[];
  video_url?: string | null;
  bedrooms?: number; bathrooms?: number;
  agent_id?: string | null;
  available_from?: string | null;
}
interface Community {
  id: string; name: string; address: string; lat: number; lng: number; amenities?: string[];
  image_url?: string | null;
}
interface UnitWithCommunity extends Unit { community: Community | null; }

const ROOM_TYPES = ['Studio', 'Master Room', 'Medium Room', 'Small Room', 'Ensuite', 'Whole Unit'];

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

const contactIconWrap = (size: number, color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: size,
  height: size,
  minWidth: size,
  minHeight: size,
  flexShrink: 0,
  color,
  lineHeight: 0,
  overflow: 'visible',
  background: 'transparent',
});

const ProgressFlow = ({ isAgreed, isActive, lang }: { isAgreed: boolean; isActive: boolean; lang: string }) => {
  let startWidth = '0%';
  let endWidth = '25%';
  let startLeft = '12.5%';
  let endLeft = '37.5%';

  if (isActive) {
    return (
      <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
          <div style={{ position: 'absolute', top: 10, left: '12.5%', right: '12.5%', height: 2, background: 'var(--glass-border)', zIndex: 0 }} />
          <div style={{ 
            position: 'absolute', 
            top: 10, 
            left: '12.5%', 
            width: '75%',
            height: 2, 
            background: 'var(--primary)', 
            zIndex: 0, 
            opacity: 0.6
          }} />
          {[
            { label: lang === 'zh' ? '发起确认' : 'Initiated', active: true },
            { label: lang === 'zh' ? '中介同意' : 'Agreed', active: true },
            { label: lang === 'zh' ? '合约生成' : 'Lease Created', active: true },
            { label: lang === 'zh' ? '租房中' : 'Renting', active: true },
          ].map((step, idx) => (
            <div key={idx} style={{ 
              flex: 1,
              zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: 'transform 0.3s ease',
              transform: 'scale(1.1)'
            }}>
              <div style={{ 
                width: 20, height: 20, borderRadius: '50%', 
                background: 'var(--primary)',
                border: '2px solid var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.5s ease',
                boxShadow: '0 0 12px var(--primary)'
              }}>
                <CheckCircle2 size={12} color="white" />
              </div>
              <span style={{ 
                fontSize: '0.6rem', fontWeight: 700, 
                color: 'var(--text-h)',
                transition: 'color 0.5s ease'
              }}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (isAgreed) {
    // 已到“中介同意”，向“合约生成”延伸
    startWidth = '25%';
    endWidth = '50%';
    startLeft = '37.5%';
    endLeft = '62.5%';
  } else {
    // 已发起，向“中介同意”延伸
    startWidth = '0%';
    endWidth = '25%';
    startLeft = '12.5%';
    endLeft = '37.5%';
  }

  return (
    <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
        <div style={{ position: 'absolute', top: 10, left: '12.5%', right: '12.5%', height: 2, background: 'var(--glass-border)', zIndex: 0 }} />
        {/* 已完成部分的固定实线 */}
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          left: '12.5%', 
          width: startWidth,
          height: 2, 
          background: 'var(--primary)', 
          zIndex: 0, 
          opacity: 0.6
        }} />
        {/* 正在进行部分的循环延伸线 */}
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          left: '12.5%', 
          height: 2, 
          background: 'var(--primary)', 
          zIndex: 0, 
          // @ts-ignore
          '--start-width': startWidth,
          '--end-width': endWidth,
          animation: 'loopExtend 2s infinite ease-in-out'
        } as React.CSSProperties} />
        {/* 循环移动的光点 */}
        <div style={{ 
          position: 'absolute', 
          top: 8, 
          width: 6, 
          height: 6, 
          borderRadius: '50%',
          background: 'var(--primary)',
          boxShadow: '0 0 12px var(--primary), 0 0 20px var(--primary)',
          zIndex: 1,
          marginLeft: '-3px',
          // @ts-ignore
          '--start-left': startLeft,
          '--end-left': endLeft,
          animation: 'loopGlow 2s infinite ease-in-out, glowPulse 1.5s ease-in-out infinite'
        } as React.CSSProperties} />

        {[
          { label: lang === 'zh' ? '发起确认' : 'Initiated', active: true },
          { label: lang === 'zh' ? '中介同意' : 'Agreed', active: isAgreed },
          { label: lang === 'zh' ? '合约生成' : 'Lease Created', active: false },
          { label: lang === 'zh' ? '租房中' : 'Renting', active: false },
        ].map((step, idx) => (
          <div key={idx} style={{ 
            flex: 1,
            zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            transition: 'transform 0.3s ease',
            transform: step.active ? 'scale(1.1)' : 'scale(1)'
          }}>
            <div style={{ 
              width: 20, height: 20, borderRadius: '50%', 
              background: step.active ? 'var(--primary)' : 'var(--bg-card)',
              border: `2px solid ${step.active ? 'var(--primary)' : 'var(--glass-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.5s ease',
              boxShadow: step.active ? '0 0 12px var(--primary)' : 'none'
            }}>
              {step.active && <CheckCircle2 size={12} color="white" />}
            </div>
            <span style={{ 
              fontSize: '0.6rem', fontWeight: 700, 
              color: step.active ? 'var(--text-h)' : 'var(--text-muted)',
              transition: 'color 0.5s ease'
            }}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WeChatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ display: 'block', flexShrink: 0, transform: 'scaleX(-1)' }}
    >
      <path d="M8.22 13.06c.4 0 .8-.05 1.18-.12-.34-1.3-.23-2.73.36-3.9-1.3-.65-3.04-1.04-4.96-1.04C2.15 8 0 9.87 0 12.18c0 1.25.63 2.39 1.68 3.16a.33.33 0 01.12.38l-.22.84c-.08.31-.02.49.25.31l2.33-1.34c.32-.06.66-.1 1-.1 1.22 0 2.36-.21 3.06-.57zM5.53 10.96a.66.66 0 110-1.32.66.66 0 010 1.32zm3.32 0a.66.66 0 110-1.32.66.66 0 010 1.32zm13.15.75c0-3.38-3.25-6.13-7.25-6.13S7.5 8.33 7.5 11.71c0 3.38 3.25 6.13 7.25 6.13a7.8 7.8 0 002.5-.4l2.42 1.4c.26.15.31-.03.24-.31l-.23-1c1.37-.9 2.32-2.14 2.32-3.82zm-6.75-2.07c.45 0 .82.37.82.83 0 .45-.37.82-.82.82a.83.83 0 01-.83-.82c0-.46.37-.83.83-.83zm3.75 0c.45 0 .82.37.82.83 0 .45-.37.82-.82.82a.83.83 0 01-.83-.82c0-.46.37-.83.83-.83z" />
    </svg>
  );
}

const WHATSAPP_OFFICIAL_URL = 'https://www.whatsapp.com/';

const formatWhatsAppLink = (num: string) => {
  let cleaned = num.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) cleaned = '6' + cleaned;
  return `https://wa.me/${cleaned}`;
};

function getWhatsAppHref(num: string | null | undefined): string {
  return hasConfiguredContact(num) ? formatWhatsAppLink(num!) : WHATSAPP_OFFICIAL_URL;
}

const contactRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: '0.82rem',
  lineHeight: 1.5,
  minHeight: 22,
};

function hasConfiguredContact(value: string | null | undefined): value is string {
  const v = value?.trim();
  return !!v && !v.includes('请填写');
}

/** Units listed on an agent profile — strict agent_id match only. */
function getUnitsForAgent(agentId: string | undefined, allUnits: UnitWithCommunity[]): UnitWithCommunity[] {
  if (!agentId) return [];
  return allUnits.filter(u => u.agent_id === agentId);
}

function getListingAgentLabel(unit: Unit, admins: AdminContact[], lang: string): string | null {
  if (!unit.agent_id) return null;
  const agent = admins.find(a => a.id === unit.agent_id);
  const name = agent?.display_name?.trim();
  if (!name) return null;
  return lang === 'zh' ? `中介：${name}` : `Agent: ${name}`;
}

const agentPriceInputStyle: React.CSSProperties = {
  width: 96,
  fontSize: '0.78rem',
  padding: '6px 10px',
  lineHeight: 1.4,
  minHeight: 32,
  boxSizing: 'border-box',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-h)',
  fontFamily: 'inherit',
  outline: 'none',
};

interface AdminContact {
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

interface TenantInterest { id: string; unit_id: string; user_id: string; email: string; full_name?: string; phone?: string; note?: string; status: string; created_at: string; }

const maskEmail = (email: string) => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
};

export default function PropertyListings({ readOnly = false, guestMode = false }: { readOnly?: boolean; guestMode?: boolean }) {
  const { t, lang } = useApp();
  const [units, setUnits] = useState<UnitWithCommunity[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'favorites'>('all');
  const [favoriteUnitIds, setFavoriteUnitIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<UnitWithCommunity | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminContact[]>([]);
  const filteredAdmins = useMemo(() => {
    if (!selected?.agent_id) return admins;
    const match = admins.filter(a => a.id === selected.agent_id);
    return match.length > 0 ? match : admins;
  }, [admins, selected]);
  const [expandedAdmin, setExpandedAdmin] = useState<number | null>(null);
  const [interests, setInterests] = useState<TenantInterest[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(isMockDatabase ? 'tenant-123' : null);
  const [userRole, setUserRole] = useState<'super_admin' | 'editor' | null>(null);
  const [myInterest, setMyInterest] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [myLeasedUnitIds, setMyLeasedUnitIds] = useState<string[]>([]);
  const [activeLeaseCounts, setActiveLeaseCounts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isAlert?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, isAlert = false) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      isAlert,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
  }, []);

  // Agent profile modal states
  const [showAgentProfile, setShowAgentProfile] = useState<AdminContact | null>(null);
  const [agentTab, setAgentTab] = useState<'all' | 'available' | 'rented'>('all');
  const [agentMinPrice, setAgentMinPrice] = useState('');
  const [agentMaxPrice, setAgentMaxPrice] = useState('');
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryMsg, setEnquiryMsg] = useState('Hi, I am interested in renting one of your units. Please contact me.');
  const [enquiryFeedback, setEnquiryFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  const refreshInterests = async (supabase: Awaited<ReturnType<typeof import('@/utils/supabase/client').createClient>>, userId?: string) => {
    // Note: We include 'left' status here so we can detect if a confirmed tenant tried to cancel,
    // ensuring we don't show the "I Want to Rent" button to an active tenant.
    const { data: interestsData, error: interestsError } = await supabase.from('tenant_interests').select('*');
    if (interestsError) {
      console.error('[refreshInterests]', interestsError);
      return;
    }

    const { data: unitsData, error: unitsError } = await supabase.from('units').select('id, status');
    if (unitsError) {
      console.error('[refreshInterests units]', unitsError);
      return;
    }

    if (interestsData && unitsData) {
      const uid = userId ?? authUserId;
      let activeLeasedUnitIds: string[] = [];

      // Fetch active lease counts per unit (for accurate occupancy display)
      if (isMockDatabase) {
        const mockLeases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
        const counts: Record<string, number> = {};
        mockLeases.filter((l: any) => l.status === 'active').forEach((l: any) => {
          counts[l.unit_id] = (counts[l.unit_id] || 0) + 1;
        });
        setActiveLeaseCounts(counts);
        if (uid) {
          activeLeasedUnitIds = mockLeases
            .filter((l: any) => String(l.tenant_id) === String(uid) && l.status === 'active')
            .map((l: any) => l.unit_id);
          setMyLeasedUnitIds(activeLeasedUnitIds);
        }
      } else {
        const { data: allActiveLeases, error: leaseCountError } = await supabase
          .from('leases')
          .select('unit_id')
          .eq('status', 'active');
        if (!leaseCountError && allActiveLeases) {
          const counts: Record<string, number> = {};
          allActiveLeases.forEach((l: any) => {
            counts[l.unit_id] = (counts[l.unit_id] || 0) + 1;
          });
          setActiveLeaseCounts(counts);
        }
        if (uid) {
          const { data: leasesData, error: leasesError } = await supabase
            .from('leases')
            .select('unit_id')
            .eq('tenant_id', uid)
            .eq('status', 'active');
          if (!leasesError && leasesData) {
            activeLeasedUnitIds = leasesData.map(l => l.unit_id);
            setMyLeasedUnitIds(activeLeasedUnitIds);
          } else {
            console.error('[refreshInterests leases]', leasesError);
          }
        }
      }

      // Filter interests and identify stale interests to force-reset (clean up)
      const staleInterestIds: string[] = [];
      const cleanInterests = interestsData.filter((i: TenantInterest) => {
        if (i.status === 'left') return false;

        const unit = unitsData.find(u => u.id === i.unit_id);
        if (unit) {
          const isRented = unit.status !== 'available';
          const isLeasedByMe = activeLeasedUnitIds.includes(i.unit_id);
          // If the unit is rented by someone else, this interest is stale!
          if (isRented && !isLeasedByMe) {
            if (uid && String(i.user_id) === String(uid)) {
              staleInterestIds.push(i.id);
            }
            return false;
          }
        }
        return true;
      });

      // Update state
      setInterests(cleanInterests);

      if (uid) {
        // Find MY active/confirmed interest. 
        // We look for ANY entry that isn't 'left' and isn't stale TO DRIVE THE UI.
        const mine = cleanInterests.find((i: TenantInterest) => String(i.user_id) === String(uid));
        setMyInterest(mine ? mine.unit_id : null);

        // Proactively reset/clean up stale interests in the database/mock database in the background
        if (staleInterestIds.length > 0) {
          (async () => {
            console.log('[refreshInterests] Force-resetting stale interests:', staleInterestIds);
            for (const id of staleInterestIds) {
              if (isMockDatabase) {
                const allInterests: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
                const idx = allInterests.findIndex(x => x.id === id);
                if (idx !== -1) {
                  allInterests[idx].status = 'left';
                  localStorage.setItem('ez_interests', JSON.stringify(allInterests));
                }
              } else {
                await supabase
                  .from('tenant_interests')
                  .update({ status: 'left' })
                  .eq('id', id);
              }
            }
          })();
        }
      }
    }
  };

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    setListingsError(null);
    try {
      if (isMockDatabase) {
        const allUnits: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
        const allCommunities: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
        setUnits(allUnits.map(u => ({
          ...u,
          community: allCommunities.find(c => c.id === u.community_id) || null,
        })));
        if (allUnits.length === 0) {
          console.warn('[listings] Mock mode: ez_units is empty — admin data is in browser localStorage only, not Supabase.');
        }
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
        setUnits([]);
        return;
      }

      const allUnits: Unit[] = unitRes.data || [];
      const allCommunities: Community[] = commRes.data || [];
      setUnits(allUnits.map(u => ({
        ...u,
        community: allCommunities.find(c => c.id === u.community_id) || null,
      })));
    } catch (e) {
      console.error('[listings] load failed:', e);
      setListingsError(e instanceof Error ? e.message : 'Failed to load listings');
      setUnits([]);
    } finally {
      setListingsLoading(false);
    }
  }, []);

  // 加载收藏列表
  const loadFavorites = useCallback(async () => {
    if (!authUserId) return;
    if (isMockDatabase) {
      const favorites = JSON.parse(localStorage.getItem('ez_favorites') || '[]');
      const ids = favorites.filter((f: any) => f.user_id === authUserId).map((f: any) => f.unit_id);
      setFavoriteUnitIds(new Set(ids));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.from('favorites').select('unit_id').eq('user_id', authUserId);
        setFavoriteUnitIds(new Set((data || []).map((f: any) => f.unit_id)));
      } catch (e) {
        console.error('Load favorites error:', e);
      }
    }
  }, [authUserId]);

  const loadAdmins = useCallback(async () => {
    if (isMockDatabase) {
      const storedAdmins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
      if (storedAdmins.length > 0) {
        setAdmins(storedAdmins);
      } else {
        const defaultAgent = {
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
          property_types: ['Condo', 'Serviced Residence', 'Apartment', 'Room']
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
  }, []);

  useEffect(() => {
    loadListings();
    loadAdmins();
    loadFavorites();
  }, [loadListings, loadAdmins, loadFavorites]);

  useEffect(() => {
    if (isMockDatabase) {
      // Mock: check role from localStorage
      const mockRole = localStorage.getItem('ez_user_role');
      setUserRole(mockRole === 'admin' ? 'super_admin' : null);
      return;
    }
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted && user) {
        setAuthUserId(user.id);
        // Check if user is admin
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (mounted && adminData) setUserRole(adminData.role as 'super_admin' | 'editor');
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (mounted) setAuthUserId(session?.user?.id ?? null);
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          loadListings();
          loadAdmins();
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [loadListings, loadAdmins]);

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
    // Fetch tenant interests (public read — no login required to see counts)
    (async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        let uid = undefined;
        if (user) {
          setAuthUserId(user.id);
          uid = user.id;
        } else if (isMockDatabase) {
          setAuthUserId('tenant-123');
          uid = 'tenant-123';
        }
        await refreshInterests(supabase, uid);
      } catch (e) {
        console.error('[load interests]', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected || isMockDatabase) return;
    // Initial load
    (async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await refreshInterests(supabase, user?.id);
      } catch {}
    })();
    // Poll every 10s so student sees admin confirmation in near-real-time
    const pollId = setInterval(async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await refreshInterests(supabase, user?.id);
      } catch {}
    }, 10000);
    return () => clearInterval(pollId);
  }, [selected?.id]);

  const expressInterest = async (unitId: string, noteOverride?: string) => {
    if (myLeasedUnitIds.length > 0) {
      showToast(
        lang === 'zh'
          ? '您当前已有生效的租约合同，无法在其他房源下发起新的意向。'
          : 'You already have an active lease contract and cannot submit new interests.',
        'warning'
      );
      return;
    }
    const note = (noteOverride ?? noteInput).trim();

    if (isMockDatabase) {
      const all: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      const existingIdx = all.findIndex(i => i.unit_id === unitId && i.user_id === 'tenant-123');
      let next = [...all];
      if (existingIdx >= 0) {
        next[existingIdx] = { ...next[existingIdx], note, status: 'interested' };
      } else {
        next.push({
          id: `i-${Date.now()}`, unit_id: unitId, user_id: 'tenant-123', email: 'tenant@ezrent.my',
          full_name: 'Alex Lim', note, status: 'interested', created_at: new Date().toISOString(),
        });
      }
      localStorage.setItem('ez_interests', JSON.stringify(next));
      setInterests(next.filter(i => i.status !== 'left'));
      setMyInterest(unitId);
      setNoteInput('');
      setShowNoteInput(false);
      showToast(t('coRentSubmitSuccess'), 'success');
      return;
    }

    setSubmittingInterest(true);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast(t('coRentLoginRequired'), 'error');
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
        showToast(t('coRentSubmitSuccess'), 'success');
        await refreshInterests(supabase, user.id);
        return;
      }

      if (rpcResult?.error === 'not_authenticated') {
        showToast(t('coRentLoginRequired'), 'error');
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
        showToast(
          rpcError?.message?.includes('submit_tenant_interest')
            ? (lang === 'zh' ? '请在 Supabase 执行 015_tenant_interest_rpc.sql 后重试' : 'Run migration 015_tenant_interest_rpc.sql in Supabase, then retry')
            : t('coRentSubmitFailed'),
          'error'
        );
        return;
      }

      setMyInterest(unitId);
      setNoteInput('');
      setShowNoteInput(false);
      showToast(t('coRentSubmitSuccess'), 'success');
      await refreshInterests(supabase, user.id);
    } catch (e) {
      console.error(e);
      showToast(t('coRentSubmitFailed'), 'error');
    } finally {
      setSubmittingInterest(false);
    }
  };

  const cancelInterest = async (unitIdOverride?: string) => {
    const unitId = unitIdOverride ?? myInterest ?? selected?.id;
    if (!unitId) return;
    if (isMockDatabase) {
      const all: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      const updated = all.map(i => (i.unit_id === unitId && i.user_id === 'tenant-123') ? { ...i, status: 'left' } : i);
      localStorage.setItem('ez_interests', JSON.stringify(updated));
      setInterests(updated.filter(i => i.status !== 'left'));
      setMyInterest(null);
      showToast(t('coRentCancelSuccess'), 'success');
      return;
    }
    setSubmittingInterest(true);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast(t('coRentLoginRequired'), 'error');
        return;
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc('cancel_tenant_interest', {
        p_unit_id: unitId,
      });

      if (!rpcError && rpcResult?.success) {
        if (myInterest === unitId) setMyInterest(null);
        showToast(t('coRentCancelSuccess'), 'success');
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
        showToast(t('coRentSubmitFailed'), 'error');
        return;
      }
      if (myInterest === unitId) setMyInterest(null);
      showToast(t('coRentCancelSuccess'), 'success');
      await refreshInterests(supabase, user.id);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingInterest(false);
    }
  };

  const handleAgentEnquirySubmit = async (unitId: string) => {
    if (!enquiryName.trim()) {
      setEnquiryFeedback({ type: 'error', msg: lang === 'zh' ? '请填写您的姓名' : 'Please enter your name' });
      return;
    }
    if (!enquiryPhone.trim()) {
      setEnquiryFeedback({ type: 'error', msg: lang === 'zh' ? '请填写您的电话号码' : 'Please enter your phone number' });
      return;
    }

    setSubmittingEnquiry(true);
    setEnquiryFeedback(null);

    // Save student profile fields to local storage so they are pre-filled next time
    const userProfile = {
      full_name: enquiryName.trim(),
      phone: enquiryPhone.trim(),
      email: isMockDatabase ? 'tenant@ezrent.my' : ''
    };
    localStorage.setItem('ez_user_profile', JSON.stringify(userProfile));

    // Submit interest
    const noteText = `[Agent Enquiry] ${enquiryMsg.trim()} (Phone: ${enquiryPhone.trim()})`;
    
    // We call the existing expressInterest function
    await expressInterest(unitId, noteText);
    
    setSubmittingEnquiry(false);
    setEnquiryFeedback({ type: 'success', msg: lang === 'zh' ? '咨询已成功发送给中介！' : 'Enquiry sent successfully to the agent!' });
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
    if (statusFilter === 'favorites') res = res.filter(u => favoriteUnitIds.has(u.id));
    res.sort((a, b) => sort === 'asc' ? a.rent - b.rent : b.rent - a.rent);
    return res;
  }, [units, search, typeFilter, maxRent, statusFilter, sort]);

  const sameCommUnits = selected
    ? units.filter(u => u.community_id === selected.community_id && u.id !== selected.id)
    : [];


  return (
    <div className="listings-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{t('listingsTitle')}</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {filtered.length} {t('listingsSubtitle')}
        </span>
        <button
          type="button"
          onClick={() => { loadListings(); }}
          disabled={listingsLoading}
          title={lang === 'zh' ? '刷新房源列表' : 'Refresh listings'}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', border: '1px solid var(--glass-border)',
            borderRadius: 8, background: 'var(--glass-bg)', cursor: listingsLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)',
            transition: 'all 0.2s', opacity: listingsLoading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!listingsLoading) { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; } }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
        >
          <RefreshCw size={14} style={{ animation: listingsLoading ? 'spin 1s linear infinite' : 'none' }} />
          {lang === 'zh' ? '刷新' : 'Refresh'}
        </button>
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
            <input type="number" min={0} className="form-input" style={{ paddingLeft: 30 }} placeholder={t('filterMaxRent')} value={maxRent} onChange={e => setMaxRent(nonNegativeInputValue(e.target.value))} />
          </div>

          {/* Status toggle */}
          <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            {(guestMode ? (['all', 'available'] as const) : (['all', 'available', 'favorites'] as const)).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s', background: statusFilter === s ? 'var(--primary)' : 'transparent', color: statusFilter === s ? 'white' : 'var(--text-muted)' }}>
                {s === 'all' ? t('filterAll') : s === 'available' ? t('filterAvailable') : (lang === 'zh' ? '我的收藏' : 'Favorites')}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select className="form-select" style={{ flex: '0 1 170px' }} value={sort} onChange={e => setSort(e.target.value as 'asc' | 'desc')}>
            <option value="asc">{t('sortPriceAsc')}</option>
            <option value="desc">{t('sortPriceDesc')}</option>
          </select>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
            <button type="button" onClick={() => setViewMode('grid')}
              style={{
                padding: '8px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
              title={lang === 'zh' ? '网格视图' : 'Grid View'}
            >
              <Grid size={15} />
            </button>
            <button type="button" onClick={() => setViewMode('list')}
              style={{
                padding: '8px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
              title={lang === 'zh' ? '列表视图' : 'List View'}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Card/List Grid ── */}
      {listingsLoading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p>{lang === 'zh' ? '正在加载房源…' : 'Loading listings…'}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          {listingsError ? (
            <>
              <p style={{ marginBottom: 12, color: 'var(--danger)' }}>
                {lang === 'zh' ? '加载房源失败' : 'Failed to load listings'}: {listingsError}
              </p>
              <button type="button" className="btn btn-primary" onClick={() => loadListings()}>
                {lang === 'zh' ? '重试' : 'Retry'}
              </button>
            </>
          ) : (
            <p>
              {units.length === 0
                ? (isMockDatabase
                  ? (lang === 'zh'
                    ? '暂无房源。沙盒模式下数据存在本机浏览器；若管理员在 Live 模式上架，请确认顶部显示 Live 模式且使用同一环境。'
                    : 'No listings. In sandbox mode data is stored in this browser only. If an admin added units in Live mode, ensure the top bar shows Live mode.')
                  : t('noListings'))
                : (lang === 'zh' ? '没有符合筛选条件的房源' : 'No listings match your filters')}
            </p>
          )}
        </div>
      ) : (
        viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {filtered.map(u => (
              <PropertyCard key={u.id} unit={u} agentLabel={getListingAgentLabel(u, admins, lang)} onSelect={() => { setSelected(u); setImgIdx(0); }} t={t} userId={authUserId} lang={lang} onFavoriteToggle={loadFavorites} guestMode={guestMode} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(u => (
              <PropertyRow key={u.id} unit={u} agentLabel={getListingAgentLabel(u, admins, lang)} onSelect={() => { setSelected(u); setImgIdx(0); }} t={t} />
            ))}
          </div>
        )
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

              {/* Property details grid */}
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 14 }}>{t('detailProperty')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                   {([
                    [t('detailType'), selected.room_type],
                    [t('detailRent'), `RM ${selected.rent.toLocaleString()}/mo`],
                    [t('detailBedrooms'), `${selected.bedrooms || 1} ${t('bedroomsUnit')}`],
                    [t('detailBathrooms'), `${selected.bathrooms || 1} ${t('bathroomsUnit')}`],
                    [t('detailCommunity'), selected.community?.name || '—'],
                    [t('detailStatus'), selected.status === 'available' ? t('available') : t('rented')],
                    selected.available_from ? [lang === 'zh' ? '可入住日期' : 'Available From', new Date(selected.available_from).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })] : null,
                    [t('detailAddress'), selected.community?.address || '—'],
                    [t('detailCoords'), selected.community ? `${selected.community.lat.toFixed(4)}, ${selected.community.lng.toFixed(4)}` : '—'],
                  ] as [string, string][]).filter((item): item is [string, string] => item !== null).map(([label, val], i) => (
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

                  // Occupancy is based on actual active leases, not just confirmed interests.
                  // A confirmed interest only means the agent agreed — the tenant hasn't moved in
                  // until a lease is created.
                  const confirmed = activeLeaseCounts[selected.id] || 0;

                  const interested = unitInterests.filter(i => i.status === 'interested').length;
                  const registered = confirmed + interested;
                  const max = selected.max_occupants || 1;
                  const isFull = confirmed >= max;
                  
                  const myEntry = authUserId
                    ? unitInterests.find(i => String(i.user_id) === String(authUserId))
                    : undefined;
                  
                  // Filter out confirmed interest if no lease exists and unit is available (stale data)
                  const isLeasedByMe = myLeasedUnitIds.includes(selected.id);
                  // Keep interest visible as long as it exists and isn't 'left'
                  // Previously this incorrectly hid confirmed interests when no lease existed yet,
                  // causing the button to revert to "我要租" after admin confirmation
                  const hasMyInterest = !!myEntry;
                  
                  const isWholeUnit = selected.room_type === 'Whole Unit';
                  const isRented = selected.status !== 'available';

                  // Non–Whole Unit: single rent (大房/中房/小房/Studio)
                  if (!isWholeUnit) {
                    return (
                      <div style={{ width: '100%' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>{lang === 'zh' ? '单租模式' : 'Single Rent'}</h3>

                        {/* Progress Flow - Always show if user has interest OR is already leasing */}
                        {(hasMyInterest || isLeasedByMe) && (
                          <ProgressFlow isAgreed={myEntry?.status === 'confirmed'} isActive={isLeasedByMe} lang={lang} />
                        )}

                        {isLeasedByMe ? (
                          <div style={{ padding: '12px', background: 'var(--success-light)', borderRadius: 10, border: '1px solid var(--success)' }}>
                            <span style={{ fontSize: '0.88rem', color: 'var(--success)', fontWeight: 600 }}>
                              ✓ {lang === 'zh' ? '您已承租此房源' : 'You are currently renting this room'}
                            </span>
                          </div>
                        ) : isRented ? (
                          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.06)', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <span style={{ fontSize: '0.88rem', color: 'var(--danger)', fontWeight: 600 }}>
                              ✕ {lang === 'zh' ? '该房源已被承租' : 'This property is already rented'}
                            </span>
                          </div>
                        ) : guestMode ? (
                          <div style={{ padding: '12px', background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              {lang === 'zh' ? '登录后即可收藏房源、表达租房意向，享受平台保障' : 'Login to save favorites, express interest, and enjoy platform protection'}
                            </span>
                            <a href="/login" style={{
                              padding: '6px 16px', borderRadius: 6, background: 'var(--primary)', color: 'white',
                              fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
                            }}>
                              {lang === 'zh' ? '立即登录' : 'Login'}
                            </a>
                          </div>
                        ) : readOnly ? (
                          <div style={{ padding: '12px', background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '14px' }}>ℹ️</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              {lang === 'zh' ? '租房操作仅限租客使用，中介可通过"租约 & 财务台账"中的"租客意向"审核租客申请。' : 'Renting is for tenants only. Agents can review applications via "Interest Management".'}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {!readOnly && !guestMode && !hasMyInterest && !isFull && (
                              <button onClick={() => expressInterest(selected.id)} style={{
                                padding: '10px 24px', borderRadius: 8, border: 'none',
                                background: 'var(--primary)', color: 'white',
                                fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                              }}>{lang === 'zh' ? '我要租' : 'Express Interest'}</button>
                            )}
                            {!readOnly && !guestMode && hasMyInterest && (
                              <button onClick={() => {
                                if (myEntry?.status === 'confirmed') {
                                  // Check if the lease actually exists for this user and unit
                                  const leaseExists = myLeasedUnitIds.includes(selected.id);
                                  
                                  if (leaseExists) {
                                    showConfirm(
                                      lang === 'zh' ? '提示' : 'Notice',
                                      lang === 'zh' ? '您的租约已生效。如需查看详情或缴纳房租，请前往"我的租约"面板。' : 'Your lease is active. Please visit the "My Lease" panel to view details or pay rent.',
                                      () => {},
                                      true
                                    );
                                  } else {
                                    showConfirm(
                                      lang === 'zh' ? '处理中' : 'Processing',
                                      lang === 'zh' ? '中介已同意您的入住意向，正在为您准备正式合约，请稍后再次查看。' : 'Agent has agreed to your interest and is preparing the official lease. Please check back shortly.',
                                      () => {},
                                      true
                                    );
                                  }
                                } else {
                                  showConfirm(
                                    lang === 'zh' ? '取消租房意向' : 'Cancel Interest',
                                    lang === 'zh' ? '确定要取消对该房源的租房意向吗？取消后您可以随时重新提交。' : 'Are you sure you want to cancel your interest in this listing? You can always resubmit later.',
                                    () => cancelInterest(selected.id)
                                  );
                                }
                              }} disabled={submittingInterest} style={{
                                padding: '10px 24px', borderRadius: 8, border: '1px solid var(--danger)',
                                background: 'transparent', color: 'var(--danger)',
                                fontSize: '0.88rem', fontWeight: 600, cursor: submittingInterest ? 'wait' : 'pointer', fontFamily: 'inherit',
                                width: '100%', textAlign: 'center'
                              }}>
                                {myEntry?.status === 'confirmed' ? (lang === 'zh' ? '查看状态 / 合约' : 'View Status / Lease') : (lang === 'zh' ? '取消意向' : 'Cancel Interest')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Whole Unit: full co-renting flow
                  return (
                    <>
                      <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>{t('coRentTitle')}</h3>

                      {/* Interest Progress Flow (Whole Unit) */}
                      {(hasMyInterest || isLeasedByMe) && (
                        <ProgressFlow isAgreed={myEntry?.status === 'confirmed'} isActive={isLeasedByMe} lang={lang} />
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {t('coRentOccupancy')}: <strong style={{ color: 'var(--text-h)' }}>{registered}/{max}</strong>
                          <span style={{ marginLeft: 6, fontSize: '0.75rem' }}>
                            ({t('coRentOccupancyConfirmed')} {confirmed} · {t('coRentInterested')} {interested})
                          </span>
                        </span>
                        {isLeasedByMe ? (
                          <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600, marginLeft: 12 }}>
                            {lang === 'zh' ? '您已承租此房源' : 'You are currently renting this unit'}
                          </span>
                        ) : isRented ? (
                          <span style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600, marginLeft: 12 }}>
                            {lang === 'zh' ? '该房源已被承租' : 'This property is already rented'}
                          </span>
                        ) : guestMode ? (
                          <a href="/login" style={{
                            padding: '8px 18px', borderRadius: 8, background: 'var(--primary)', color: 'white',
                            fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none',
                          }}>
                            {lang === 'zh' ? '登录后加入合租' : 'Login to Join'}
                          </a>
                        ) : (
                          <>
                            {!guestMode && !hasMyInterest && !isFull && !showNoteInput && (
                              <button onClick={() => {
                                if (myLeasedUnitIds.length > 0) {
                                  showToast(
                                    lang === 'zh'
                                      ? '您当前已有生效的租约合同，无法在其他房源下发起新的意向。'
                                      : 'You already have an active lease contract and cannot submit new interests.',
                                    'warning'
                                  );
                                  return;
                                }
                                setShowNoteInput(true);
                              }} disabled={submittingInterest} style={{
                                padding: '8px 18px', borderRadius: 8, border: 'none',
                                background: 'var(--primary)', color: 'white',
                                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                              }}>{t('coRentJoin')}</button>
                            )}

                            {isFull && <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>{t('coRentFull')}</span>}
                          </>
                        )}
                      </div>

                      {/* Note input — hidden for guests */}
                      {!guestMode && showNoteInput && !hasMyInterest && (
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
                                    {i.full_name || (isMe 
                                      ? i.email.split('@')[0]
                                      : (i.email.split('@')[0].length <= 2 
                                        ? `${i.email.split('@')[0][0]}***` 
                                        : `${i.email.split('@')[0].slice(0, 2)}***${i.email.split('@')[0].slice(-1)}`
                                      )
                                    )}
                                    {isMe && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--primary)' }}>({lang === 'zh' ? '我' : 'Me'})</span>}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isMe ? i.email : maskEmail(i.email)}</div>
                                </div>
                                {!guestMode && isMe ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (i.status === 'confirmed') {
                                        showConfirm(
                                          lang === 'zh' ? '提示' : 'Notice',
                                          lang === 'zh' ? '您已被确认为该房源租客并生成租约合同。如需终止租约，请前往“我的租约”面板办理终止手续。' : 'You are confirmed as a tenant with an active lease. To terminate, please go to the "My Lease" panel.',
                                          () => {},
                                          true
                                        );
                                      } else {
                                        showConfirm(
                                          lang === 'zh' ? '取消合租意向' : 'Cancel Interest',
                                          lang === 'zh' ? '确定要取消对该房源的合租意向吗？' : 'Are you sure you want to cancel your interest?',
                                          () => cancelInterest(selected.id)
                                        );
                                      }
                                    }}
                                    disabled={submittingInterest}
                                    style={{
                                      padding: '4px 10px', borderRadius: 6, border: '1px solid var(--danger)',
                                      background: 'transparent', color: 'var(--danger)',
                                      fontSize: '0.68rem', fontWeight: 600, cursor: submittingInterest ? 'wait' : 'pointer', fontFamily: 'inherit',
                                    }}
                                  >
                                    {i.status === 'confirmed' ? (lang === 'zh' ? '已租：不可直接取消' : 'Rented') : t('coRentCancel')}
                                  </button>
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

              {/* Reviews section */}
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 12, color: 'var(--text-h)' }}>
                  {lang === 'zh' ? '租客评价' : 'Tenant Reviews'}
                </h3>
                <ReviewSystem unitId={selected.id} userId={authUserId} canDeleteAll={userRole === 'super_admin'} />
              </div>

              {/* Assigned agent */}
              {(() => {
                const agent = admins.find(a => a.id === selected.agent_id) || admins[0];
                if (!agent) return null;
                const openAgentProfile = () => {
                  setShowAgentProfile(agent);
                  setEnquiryName(localStorage.getItem('ez_user_profile') ? JSON.parse(localStorage.getItem('ez_user_profile')!).full_name : '');
                  setEnquiryPhone(localStorage.getItem('ez_user_profile') ? JSON.parse(localStorage.getItem('ez_user_profile')!).phone : '');
                  setEnquiryFeedback(null);
                };
                return (
                  <div style={{ marginTop: 20 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 10, color: 'var(--text-h)' }}>
                      {lang === 'zh' ? '所属中介：' : 'Your Agent:'}
                    </h3>
                    <div style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                    }}>
                      <img 
                        src={agent.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nick'} 
                        alt={agent.display_name || ''} 
                        style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover', background: 'var(--bg-surface)' }}
                        onError={(e: any) => { e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nick'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-h)' }}>
                            {agent.display_name || 'Nick Chan'}
                          </span>
                          {agent.id && <AgentRatingBadge agentId={agent.id} size="medium" />}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                          {agent.job_title || 'Real Estate Negotiator'}
                        </div>
                        {agent.agency_name && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {agent.agency_name}
                          </div>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={openAgentProfile}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-body)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-body)'; }}
                      >
                        {lang === 'zh' ? '查看主页' : 'View Profile'}
                      </button>
                    </div>
                  </div>
                );
              })()}
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
              {filteredAdmins.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: '0.85rem' }}>
                  暂无管理员联系方式
                </div>
              ) : filteredAdmins.map((admin, i) => {
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
                        <a
                          href={getWhatsAppHref(admin.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', lineHeight: 1.5, minHeight: 20, color: hasConfiguredContact(admin.whatsapp) ? 'var(--text-body)' : 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
                          title={lang === 'zh' ? (hasConfiguredContact(admin.whatsapp) ? '点击跳转 WhatsApp' : '打开 WhatsApp 官网') : (hasConfiguredContact(admin.whatsapp) ? 'Open WhatsApp chat' : 'Open WhatsApp website')}
                          onMouseEnter={e => { if (hasConfiguredContact(admin.whatsapp)) e.currentTarget.style.color = '#25D366'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = hasConfiguredContact(admin.whatsapp) ? 'var(--text-body)' : 'var(--text-muted)'; }}
                        >
                          <span style={contactIconWrap(14, '#25D366')}>
                            <WhatsAppIcon size={14} />
                          </span>
                          <span>
                            WhatsApp: {hasConfiguredContact(admin.whatsapp) ? admin.whatsapp : (lang === 'zh' ? '暂无' : 'N/A')}
                          </span>
                        </a>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', lineHeight: 1.5, minHeight: 20 }}>
                          <span style={contactIconWrap(14, '#07C160')}>
                            <WeChatIcon size={14} />
                          </span>
                          {hasConfiguredContact(admin.wechat_id) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span 
                                style={{ color: 'var(--text-body)', cursor: 'pointer', transition: 'color 0.2s' }}
                                onClick={() => {
                                  navigator.clipboard.writeText(admin.wechat_id!);
                                  setCopySuccess(`admin-${admin.id}`);
                                  setTimeout(() => setCopySuccess(null), 2000);
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#07C160'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-body)'}
                                title={lang === 'zh' ? '点击复制微信号' : 'Click to copy WeChat ID'}
                              >
                                {lang === 'zh' ? '微信' : 'WeChat'}: {admin.wechat_id}
                              </span>
                              {copySuccess === `admin-${admin.id}` && (
                                <span style={{ fontSize: '0.65rem', color: '#07C160', fontWeight: 600 }}>
                                  {lang === 'zh' ? '已复制' : 'Copied'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>{lang === 'zh' ? '微信: 暂无' : 'WeChat: N/A'}</span>
                          )}
                        </div>
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

      {/* ── Agent Profile Modal ── */}
      {showAgentProfile && (() => {
        // filter units managed by this agent
        const agentUnits = getUnitsForAgent(showAgentProfile.id, units);
        
        // filter stats
        const totalCount = agentUnits.length;
        const availableCount = agentUnits.filter(u => u.status === 'available').length;
        const rentedCount = agentUnits.filter(u => u.status === 'rented').length;

        // apply min/max price & status tab filters
        let filteredAgentUnits = agentUnits;
        if (agentTab === 'available') filteredAgentUnits = filteredAgentUnits.filter(u => u.status === 'available');
        if (agentTab === 'rented') filteredAgentUnits = filteredAgentUnits.filter(u => u.status === 'rented');
        if (agentMinPrice) filteredAgentUnits = filteredAgentUnits.filter(u => u.rent >= parseFloat(agentMinPrice));
        if (agentMaxPrice) filteredAgentUnits = filteredAgentUnits.filter(u => u.rent <= parseFloat(agentMaxPrice));

        // Areas and property types representation
        const areas = Array.isArray(showAgentProfile.area_expertise) 
          ? showAgentProfile.area_expertise 
          : (showAgentProfile.area_expertise ? String(showAgentProfile.area_expertise).split(',').map(s => s.trim()) : []);
        
        const propTypes = Array.isArray(showAgentProfile.property_types) 
          ? showAgentProfile.property_types 
          : (showAgentProfile.property_types ? String(showAgentProfile.property_types).split(',').map(s => s.trim()) : []);

        // Pre-filled unit for enquiry
        const defaultEnquiryUnitId = selected?.id || (agentUnits[0]?.id || '');
        const currentEnquiryUnit = agentUnits.find(u => u.id === defaultEnquiryUnitId) || agentUnits[0];

        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(9, 11, 20, 0.85)',
            backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 450, padding: '24px 16px',
            animation: 'fadeIn 0.25s ease'
          }} onClick={() => setShowAgentProfile(null)}>
            
            <div style={{
              background: 'var(--bg-surface-solid)',
              border: '1px solid var(--glass-border)',
              borderRadius: 24,
              width: '100%',
              maxWidth: 1080,
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.01)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-h)', letterSpacing: '0.03em' }}>
                    {lang === 'zh' ? '中介专业主页' : 'Agent Professional Profile'}
                  </span>
                </div>
                <button 
                  onClick={() => setShowAgentProfile(null)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'var(--text-muted)',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-h)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="custom-scroll" style={{
                flex: 1,
                overflowY: 'auto',
                padding: 24,
                display: 'grid',
                gridTemplateColumns: '320px 1fr',
                gap: 24,
              }}>
                
                {/* Left Column: Agent Card, Contact details, Agency info, Enquiry form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Agent Card */}
                  <div className="glass-card" style={{ padding: 20, textAlign: 'center', background: 'var(--glass-bg)' }}>
                    <img 
                      src={showAgentProfile.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nick'} 
                      alt={showAgentProfile.display_name || ''} 
                      style={{ width: 96, height: 96, borderRadius: '50%', border: '3px solid var(--primary)', objectFit: 'cover', margin: '0 auto 12px', display: 'block', background: 'var(--bg-surface)' }}
                      onError={(e: any) => { e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nick'; }}
                    />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>
                      {showAgentProfile.display_name}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 12 }}>
                      {showAgentProfile.job_title || 'Real Estate Negotiator'}
                    </div>

                    {/* Contact links */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                      {showAgentProfile.phone && (
                        <a href={`tel:${showAgentProfile.phone}`} title={lang === 'zh' ? '拨打电话' : 'Call Phone'} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-body)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-body)'}>
                          <Phone size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span>{showAgentProfile.phone}</span>
                        </a>
                      )}
                      <a
                        href={getWhatsAppHref(showAgentProfile.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...contactRowStyle,
                          textDecoration: 'none',
                          color: hasConfiguredContact(showAgentProfile.whatsapp) ? 'var(--text-body)' : 'var(--text-muted)',
                          transition: 'color 0.2s',
                        }}
                        title={lang === 'zh'
                          ? (hasConfiguredContact(showAgentProfile.whatsapp) ? '点击跳转 WhatsApp' : '打开 WhatsApp 官网')
                          : (hasConfiguredContact(showAgentProfile.whatsapp) ? 'Open WhatsApp chat' : 'Open WhatsApp website')}
                        onMouseEnter={e => { if (hasConfiguredContact(showAgentProfile.whatsapp)) e.currentTarget.style.color = '#25D366'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = hasConfiguredContact(showAgentProfile.whatsapp) ? 'var(--text-body)' : 'var(--text-muted)'; }}
                      >
                        <span style={contactIconWrap(18, '#25D366')}>
                          <WhatsAppIcon size={18} />
                        </span>
                        <span>
                          {hasConfiguredContact(showAgentProfile.whatsapp) ? showAgentProfile.whatsapp : (lang === 'zh' ? '暂无' : 'N/A')}
                        </span>
                      </a>
                      <div style={contactRowStyle}>
                        <span style={contactIconWrap(18, '#07C160')}>
                          <WeChatIcon size={18} />
                        </span>
                        {hasConfiguredContact(showAgentProfile.wechat_id) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span 
                              style={{ color: 'var(--text-body)', cursor: 'pointer', transition: 'color 0.2s' }}
                              onClick={() => {
                                navigator.clipboard.writeText(showAgentProfile.wechat_id!);
                                setCopySuccess(showAgentProfile.id || 'wechat');
                                setTimeout(() => setCopySuccess(null), 2000);
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#07C160'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-body)'; }}
                              title={lang === 'zh' ? '点击复制微信号' : 'Click to copy WeChat ID'}
                            >
                              {showAgentProfile.wechat_id}
                            </span>
                            {copySuccess === (showAgentProfile.id || 'wechat') && (
                              <span style={{ fontSize: '0.65rem', color: '#07C160', fontWeight: 600, animation: 'fadeIn 0.2s ease' }}>
                                {lang === 'zh' ? '已复制' : 'Copied'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            {lang === 'zh' ? '暂无' : 'N/A'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{availableCount}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '在租房源' : 'Available'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-muted)' }}>{rentedCount}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang === 'zh' ? '已租房源' : 'Rented'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Agency Branding */}
                  {showAgentProfile.agency_name && (
                    <div className="glass-card" style={{ padding: 16 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 8 }}>
                        {lang === 'zh' ? '所属代理公司' : 'Representing Agency'}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-h)', marginBottom: 4 }}>
                        {showAgentProfile.agency_name}
                      </div>
                      {showAgentProfile.agency_license && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: 8, fontWeight: 500 }}>
                          {lang === 'zh' ? '执照号' : 'License'}: {showAgentProfile.agency_license}
                        </div>
                      )}
                      {showAgentProfile.agency_address && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', display: 'flex', gap: 6 }}>
                          <MapPin size={12} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary)' }} />
                          <span>{showAgentProfile.agency_address}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct Contact Form */}
                  {!readOnly && (
                  <div className="glass-card" style={{ padding: 18, background: 'var(--glass-bg)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-h)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MessageSquare size={14} style={{ color: 'var(--primary)' }} />
                      {lang === 'zh' ? '直接预约咨询' : 'Direct Inquiry'}
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); if (currentEnquiryUnit) handleAgentEnquirySubmit(currentEnquiryUnit.id); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input 
                        type="text" 
                        placeholder={lang === 'zh' ? '您的姓名 *' : 'Your Name *'} 
                        value={enquiryName}
                        onChange={e => setEnquiryName(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                        required
                      />
                      <input 
                        type="text" 
                        placeholder={lang === 'zh' ? '您的手机号码 *' : 'Your Phone Number *'} 
                        value={enquiryPhone}
                        onChange={e => setEnquiryPhone(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                        required
                      />
                      <textarea 
                        rows={2}
                        placeholder={lang === 'zh' ? '咨询留言...' : 'Message...'} 
                        value={enquiryMsg}
                        onChange={e => setEnquiryMsg(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.8rem', padding: '8px 12px', resize: 'vertical' }}
                      />
                      
                      {currentEnquiryUnit && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6, border: '1px solid var(--glass-border)' }}>
                          📍 {lang === 'zh' ? '咨询房源' : 'Target Property'}: <strong>{currentEnquiryUnit.room_type}</strong> - {currentEnquiryUnit.community?.name}
                        </div>
                      )}

                      {enquiryFeedback && (
                        <div style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          background: enquiryFeedback.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                          color: enquiryFeedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
                          border: enquiryFeedback.type === 'success' ? '1px solid var(--success-glow)' : '1px solid var(--danger-glow)',
                          textAlign: 'center'
                        }}>
                          {enquiryFeedback.msg}
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ padding: 10, fontSize: '0.82rem', marginTop: 4 }}
                        disabled={submittingEnquiry}
                      >
                        {submittingEnquiry ? (lang === 'zh' ? '发送中...' : 'Sending...') : (lang === 'zh' ? '发送租房咨询' : 'Send Enquiry')}
                      </button>
                    </form>
                  </div>
                  )}

                </div>

                {/* Right Column: Bio, Expertise, Grid of Listings with price filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Bio Description */}
                  {showAgentProfile.bio && (
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 10px', borderLeft: '3px solid var(--primary)', paddingLeft: 8 }}>
                        {lang === 'zh' ? `关于 ${showAgentProfile.display_name}` : `About ${showAgentProfile.display_name}`}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {showAgentProfile.bio}
                      </p>
                    </div>
                  )}

                  {/* Expertise list */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', padding: 16, borderRadius: 16 }}>
                    <div>
                      <h5 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>
                        {lang === 'zh' ? '擅长区域' : 'Expertise Areas'}
                      </h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {areas.length > 0 ? areas.map((area: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: 6, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>
                            {area}
                          </span>
                        )) : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sunway, Subang Jaya</span>}
                      </div>
                    </div>

                    <div>
                      <h5 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>
                        {lang === 'zh' ? '主营房源' : 'Property Types'}
                      </h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {propTypes.length > 0 ? propTypes.map((t: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'var(--text-body)', fontWeight: 500 }}>
                            {t}
                          </span>
                        )) : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Condo, Room</span>}
                      </div>
                    </div>

                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--glass-border)', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-body)' }}>
                      <Calendar size={14} style={{ color: 'var(--primary)' }} />
                      <span>
                        {lang === 'zh' ? '从业时间' : 'Experience'}: <strong>{showAgentProfile.experience_years || 0} {lang === 'zh' ? '年' : 'Years'} {showAgentProfile.experience_months || 0} {lang === 'zh' ? '个月' : 'Months'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Listings Tab Swapper & Filters */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['all', 'available', 'rented'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setAgentTab(tab)}
                            style={{
                              padding: '8px 16px',
                              background: 'none',
                              border: 'none',
                              borderBottom: agentTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                              color: agentTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                              fontWeight: agentTab === tab ? 700 : 500,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              paddingBottom: 10
                            }}
                          >
                            {tab === 'all' && (lang === 'zh' ? `全部房源 (${totalCount})` : `All Listings (${totalCount})`)}
                            {tab === 'available' && (lang === 'zh' ? `可租房源 (${availableCount})` : `Available (${availableCount})`)}
                            {tab === 'rented' && (lang === 'zh' ? `已租房源 (${rentedCount})` : `Rented (${rentedCount})`)}
                          </button>
                        ))}
                      </div>

                      {/* Price filter inputs */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingBottom: 2 }}>
                        <DollarSign size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                          type="number"
                          min={0}
                          placeholder={lang === 'zh' ? '最低价格' : 'Min RM'}
                          value={agentMinPrice}
                          onChange={e => setAgentMinPrice(nonNegativeInputValue(e.target.value))}
                          style={agentPriceInputStyle}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                        <input
                          type="number"
                          min={0}
                          placeholder={lang === 'zh' ? '最高价格' : 'Max RM'}
                          value={agentMaxPrice}
                          onChange={e => setAgentMaxPrice(nonNegativeInputValue(e.target.value))}
                          style={agentPriceInputStyle}
                        />
                        {(agentMinPrice || agentMaxPrice) && (
                          <button
                            onClick={() => { setAgentMinPrice(''); setAgentMaxPrice(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                          >
                            {lang === 'zh' ? '重置' : 'Reset'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Listings Grid */}
                    {filteredAgentUnits.length === 0 ? (
                      <div style={{ padding: '48px 16px', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: 16, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {lang === 'zh' ? '暂无符合过滤条件的房源' : 'No properties matched your filters.'}
                      </div>
                    ) : (
                      <div className="custom-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                        {filteredAgentUnits.map(unit => (
                          <div 
                            key={unit.id}
                            onClick={() => {
                              // Open this unit's detail view
                              setSelected(unit);
                              setImgIdx(0);
                              setShowAgentProfile(null); // Close the profile so they see details drawer
                            }}
                            style={{
                              borderRadius: 12,
                              overflow: 'hidden',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--glass-border)',
                              cursor: 'pointer',
                              transition: 'all 0.22s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                          >
                            <div style={{ position: 'relative', height: 110, background: '#070f17' }}>
                              <img 
                                src={getUnitImages(unit.id, unit.media_urls)[0]} 
                                alt="" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{
                                position: 'absolute', top: 8, right: 8,
                                padding: '2px 8px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700,
                                background: unit.status === 'available' ? 'var(--success-light)' : 'rgba(255,255,255,0.06)',
                                color: unit.status === 'available' ? 'var(--success)' : 'var(--text-muted)'
                              }}>
                                {unit.status === 'available' ? t('available') : t('rented')}
                              </div>
                            </div>
                            <div style={{ padding: 12 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {unit.room_type}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 6px' }}>
                                {unit.community?.name || 'Unknown Community'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 8 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)' }}>
                                  RM {unit.rent.toLocaleString()}
                                </div>
                                <div style={{ display: 'flex', gap: 6, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Bed size={10} /> {unit.bedrooms || 1}
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Bath size={10} /> {unit.bathrooms || 1}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>
        );
      })()}
      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, pointerEvents: 'none',
          animation: 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '12px 24px', borderRadius: 12,
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit',
            width: 'fit-content', maxWidth: '90vw',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: 'var(--text-h)',
            border: `1px solid ${
              toast.type === 'error' ? 'rgba(239, 68, 68, 0.45)' :
              toast.type === 'warning' ? 'rgba(217, 119, 6, 0.45)' :
              'rgba(16, 185, 129, 0.45)'
            }`,
            boxShadow: `0 8px 32px ${
              toast.type === 'error' ? 'rgba(239, 68, 68, 0.12)' :
              toast.type === 'warning' ? 'rgba(217, 119, 6, 0.12)' :
              'rgba(16, 185, 129, 0.12)'
            }, inset 0 1px 1px rgba(255,255,255,0.1)`,
          }}>
            <span style={{
              display: 'flex', alignItems: 'center',
              color:
                toast.type === 'error' ? '#ef4444' :
                toast.type === 'warning' ? '#f59e0b' :
                '#10b981'
            }}>
              {toast.type === 'error' ? <XCircle size={18} /> : toast.type === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* ── Custom Glassmorphism Confirmation Modal ── */}
      {confirmDialog?.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={confirmDialog.isAlert ? () => confirmDialog.onConfirm() : confirmDialog.onCancel}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 16,
              padding: '24px 28px',
              maxWidth: 360,
              width: '95%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              color: '#1f2937',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
              {confirmDialog.title}
            </h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#4b5563', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {!confirmDialog.isAlert && (
                <button
                  onClick={confirmDialog.onCancel}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    background: 'transparent',
                    color: '#4b5563',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
              )}
              <button
                onClick={confirmDialog.onConfirm}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'white',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {lang === 'zh' ? '确定' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Compact Property Card ── */
function PropertyCard({ unit, agentLabel, onSelect, t, userId, lang, onFavoriteToggle, guestMode }: { unit: UnitWithCommunity; agentLabel?: string | null; onSelect: () => void; t: (k: any) => string; userId?: string | null; lang?: string; onFavoriteToggle?: () => void; guestMode?: boolean }) {
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
      <div style={{ position: 'relative', height: 160, overflow: 'hidden', background: '#0B1622' }}>
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
        {/* Favorites button — hidden for guests */}
        {!guestMode && (
          <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.5)', borderRadius: '50%' }}>
            <FavoritesManager unitId={unit.id} userId={userId ?? null} size={18} onToggle={onFavoriteToggle} />
          </div>
        )}
        {/* Room type tag */}
        <span style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
          {unit.room_type}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px' }}>
        {/* Community name + address */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h4 style={{ fontSize: '0.9rem', lineHeight: 1.3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{unit.community?.name || '—'}</h4>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
              RM {unit.rent.toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
              {unit.community?.address || '—'}
            </span>
          </div>
          {agentLabel && (
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <User size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agentLabel}</span>
              {unit.agent_id && <AgentRatingBadge agentId={unit.agent_id} size="small" />}
            </div>
          )}
          {unit.available_from && (
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />
              <span>{lang === 'zh' ? '可入住' : 'Available'}: {new Date(unit.available_from).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {[unit.room_type].filter(Boolean).map((tag, i) => (
            <span key={i} style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 600 }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Per-month + View */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 8, marginTop: 2 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Bed size={12} />
              <span>{unit.bedrooms || 1} {t('bedroomsUnit')}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Bath size={12} />
              <span>{unit.bathrooms || 1} {t('bathroomsUnit')}</span>
            </span>
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
            {t('viewDetail')} <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Property List Row ── */
function PropertyRow({ unit, agentLabel, onSelect, t }: { unit: UnitWithCommunity; agentLabel?: string | null; onSelect: () => void; t: (k: any) => string }) {
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
        boxShadow: hovered ? '0 8px 24px rgba(59,130,246,0.12)' : 'var(--glass-shadow)',
        transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        display: 'flex',
        gap: 16,
        padding: 12,
        alignItems: 'center',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: 180, height: 110, borderRadius: 10, overflow: 'hidden', background: '#0B1622', flexShrink: 0 }}>
        <img
          src={getUnitImages(unit.id, unit.media_urls)[0]}
          alt={unit.room_type}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
          onError={(e: any) => { e.target.style.display = 'none'; }}
        />
        {/* Status pill */}
        <span className={`status-badge ${unit.status}`}
          style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.65rem', padding: '2px 8px' }}>
          {unit.status === 'available' ? t('available') : t('rented')}
        </span>
      </div>

      {/* Info Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 4 }}>{unit.community?.name || '—'}</h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                {unit.community?.address || '—'}
              </span>
            </div>
            {agentLabel && (
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <User size={12} style={{ flexShrink: 0 }} />
                <span>{agentLabel}</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
              RM {unit.rent.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              RM / 月
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 600 }}>
              {unit.room_type}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Bed size={12} />
                <span>{unit.bedrooms || 1} {t('bedroomsUnit')}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Bath size={12} />
                <span>{unit.bathrooms || 1} {t('bathroomsUnit')}</span>
              </span>
            </span>
          </div>

          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
            {t('viewDetail')} <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}
