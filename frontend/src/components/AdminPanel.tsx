'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building2, PlusCircle, FileText, ChevronDown, ChevronUp, CheckCircle2, XCircle, ImagePlus, Video, X, Image, QrCode, Users, Trash2, UserPlus, Clock, Eye, MessageSquare, Send, Edit3, User, Star, Wrench } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';
import { compressImageFile, compressImageToDataUrl, compressDataUrl, UNIT_IMAGE_PRESET, QR_IMAGE_PRESET } from '@/utils/compressImage';
import { compressVideoFile, UNIT_VIDEO_PRESET } from '@/utils/compressVideo';

const ROOM_TYPES = ['Studio', 'Master Room', 'Medium Room', 'Small Room', 'Whole Unit'];

const AMENITIES = [
  { key: 'gym', label: '🏋️ Gym', labelZh: '🏋️ 健身房' },
  { key: 'pool', label: '🏊 Pool', labelZh: '🏊 游泳池' },
  { key: 'laundry', label: '👕 Laundry', labelZh: '👕 洗衣房' },
  { key: 'study', label: '📚 Study Room', labelZh: '📚 自习室' },
  { key: 'parking', label: '🅿️ Parking', labelZh: '🅿️ 停车位' },
  { key: 'security', label: '🔒 24h Security', labelZh: '🔒 24小时安保' },
  { key: 'wifi', label: '📶 WiFi', labelZh: '📶 WiFi覆盖' },
  { key: 'mart', label: '🛒 Mini Mart', labelZh: '🛒 便利店' },
];

interface Community { id: string; name: string; address: string; lat: number; lng: number; amenities?: string[]; }
interface Unit { id: string; community_id: string; unit_number?: string | null; room_type: string; rent: number; status: string; description: string; max_occupants?: number; media_urls?: string[]; video_url?: string | null; bedrooms?: number; bathrooms?: number; agent_id?: string | null; landlord_qr_code?: string | null; landlord_bank_info?: string | null; }
interface Lease { id: string; unit_id: string; tenant_id: string; start_date: string; end_date: string; monthly_rent: number; deposit_amount: number; security_deposit_months?: number; utility_deposit_months?: number; status: string; }
interface LeaseForm { unit_id: string; tenant_id: string; start_date: string; end_date: string; monthly_rent: string; security_deposit_months: string; utility_deposit_months: string; }
interface Payment { id: string; lease_id: string; billing_month: string; paid: boolean; paid_date?: string | null; evidence_url?: string | null; status?: string; admin_notes?: string; }
interface LeaseWithMeta extends Lease { unitData?: Unit; communityData?: Community; tenantName?: string; payments?: Payment[]; }
interface TenantInterest { id: string; unit_id: string; user_id: string; email: string; full_name?: string; phone?: string; note?: string; status: string; created_at: string; }

function resolveLeaseUnit(
  lease: LeaseWithMeta,
  units: Unit[],
  communities: Community[],
) {
  const unit = lease.unitData ?? units.find(u => u.id === lease.unit_id);
  const community = lease.communityData ?? (unit ? communities.find(c => c.id === unit.community_id) : undefined);
  return { unit, community };
}

function formatLeasePropertyLabel(
  unit: Unit | undefined,
  community: Community | undefined,
  unknownLabel: string,
) {
  if (!unit && !community) return unknownLabel;
  const parts: string[] = [];
  if (community?.name) parts.push(community.name);
  if (unit?.room_type) parts.push(`(${unit.room_type})`);
  return parts.join(' · ') || unknownLabel;
}

const MOCK_PLACES = [
  { name: 'Sunway Geo Residences', address: 'Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya', lat: 3.06341, lng: 101.60977 },
  { name: 'Nadayu 28 Residences', address: 'Jalan PJS 11/7, Bandar Sunway, 47500 Subang Jaya', lat: 3.0698, lng: 101.6040 },
  { name: "D'Latour Luxury Suites", address: "Jalan Taylors, Bandar Sunway, 47500 Subang Jaya", lat: 3.0593, lng: 101.6160 },
];

/** Parse Supabase public URL → Storage object path inside bucket `unit-media` */
function unitMediaStoragePath(publicUrl: string): string | null {
  const marker = '/unit-media/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length).split('?')[0] || null;
}

async function removeUnitMediaFiles(
  supabase: { storage: { from: (b: string) => { remove: (p: string[]) => Promise<unknown> } } },
  paths: string[],
) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return;
  await supabase.storage.from('unit-media').remove(unique);
}

export default function AdminPanel({ adminRole, defaultTab, hideTabBar = false, onPendingCountsChange }: { adminRole: 'super_admin' | 'editor' | null; defaultTab?: 'properties' | 'leases' | 'payment' | 'admins' | 'feedback' | 'profile'; hideTabBar?: boolean; onPendingCountsChange?: (leasesCount: number, feedbackCount: number) => void; }) {
  const { t, lang } = useApp();
  const [tab, setTab] = useState<'properties' | 'leases' | 'payment' | 'admins' | 'feedback' | 'profile'>('properties');
  const [propertiesView, setPropertiesView] = useState<'editor' | 'communities' | 'inventory'>('editor');
  const [leasesView, setLeasesView] = useState<'interests' | 'overview' | 'review' | 'ledger'>('interests');

  useEffect(() => {
    if (defaultTab) {
      setTab(defaultTab);
      if (defaultTab === 'leases') {
        setLeasesView('interests');
        loadAll();
      } else if (defaultTab === 'admins') {
        fetchAdmins();
      } else if (defaultTab === 'feedback') {
        fetchFeedbacks();
      }
    }
  }, [defaultTab]);
  const [adminQR, setAdminQR] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // ── Properties state ──
  const [communities, setCommunities] = useState<Community[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [communitySearch, setCommunitySearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [communityForm, setCommunityForm] = useState({ name: '', address: '', lat: '', lng: '', amenities: [] as string[] });
  const [unitForm, setUnitForm] = useState({ community_id: '', unit_number: '', room_type: 'Studio', rent: '', description: '', max_occupants: '1', bedrooms: '1', bathrooms: '1', landlord_qr_code: '', landlord_bank_info: '' });
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  // media: up to 9 images (base64) + 1 video (object URL)
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [mediaVideo, setMediaVideo] = useState<string | null>(null);
  const [videoCompressing, setVideoCompressing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  // ── Leases state ──
  const [leases, setLeases] = useState<LeaseWithMeta[]>([]);
  const [expandedLease, setExpandedLease] = useState<string | null>(null);
  const [leaseForm, setLeaseForm] = useState<LeaseForm>({ unit_id: '', tenant_id: '', start_date: '', end_date: '', monthly_rent: '', security_deposit_months: '2', utility_deposit_months: '0.5' });
  interface UserProfile { id: string; full_name: string | null; phone?: string | null; }
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);

  // ── Toast & Validation ──
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: 'error' | 'warning' | 'success' = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  };

  const clearError = (key: string) => setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });

  // ── Admin management state (super_admin only) ──
  const [adminList, setAdminList] = useState<any[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', display_name: '', phone: '', whatsapp: '', wechat_id: '' });

  const fetchAdmins = async () => {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('admin_users').select('*').order('created_at');
      if (data) setAdminList(data);
    } catch {}
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.email.trim()) { showToast('请填写邮箱', 'error'); return; }
    if (!newAdmin.phone && !newAdmin.whatsapp && !newAdmin.wechat_id) { showToast('至少填写一种联系方式', 'error'); return; }
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.from('admin_users').insert({
        id: crypto.randomUUID(),
        email: newAdmin.email.trim(),
        display_name: newAdmin.display_name.trim() || newAdmin.email.split('@')[0],
        phone: newAdmin.phone.trim() || null,
        whatsapp: newAdmin.whatsapp.trim() || null,
        wechat_id: newAdmin.wechat_id.trim() || null,
        role: 'editor',
      });
      if (error) { showToast(error.message, 'error'); return; }
      showToast('添加成功', 'success');
      setNewAdmin({ email: '', display_name: '', phone: '', whatsapp: '', wechat_id: '' });
      setShowAddAdmin(false);
      fetchAdmins();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('确定删除该管理员？')) return;
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('已删除', 'success');
      fetchAdmins();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  // ── Payment review state ──
  const [reviewingPayment, setReviewingPayment] = useState<Payment | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [qrUploading, setQrUploading] = useState(false);

  const approvePayment = async (paymentId: string) => {
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error } = await supabase.from('payment_records').update({
          paid: true,
          paid_date: new Date().toISOString().split('T')[0],
          status: 'approved',
          admin_notes: adminNote.trim() || null,
        }).eq('id', paymentId);
        if (error) { showToast(error.message, 'error'); return; }
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const all: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const idx = all.findIndex(p => p.id === paymentId);
      if (idx !== -1) {
        all[idx].paid = true;
        all[idx].paid_date = new Date().toISOString().split('T')[0];
        all[idx].status = 'approved';
        if (adminNote.trim()) all[idx].admin_notes = adminNote.trim();
        localStorage.setItem('ez_payments', JSON.stringify(all));
      }
    }
    setReviewingPayment(null);
    setAdminNote('');
    loadAll();
    showToast(lang === 'zh' ? '审核已通过！可在下方“有效租约 & 收租核查表”展开该租约查看详情。' : 'Review approved! You can expand this lease in the "Active Leases" table below to check details.', 'success');
  };

  const rejectPayment = async (paymentId: string) => {
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error } = await supabase.from('payment_records').update({
          status: 'rejected',
          paid: false,
          paid_date: null,
          admin_notes: adminNote.trim() || null,
        }).eq('id', paymentId);
        if (error) { showToast(error.message, 'error'); return; }
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const all: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const idx = all.findIndex(p => p.id === paymentId);
      if (idx !== -1) {
        all[idx].status = 'rejected';
        all[idx].paid = false;
        all[idx].paid_date = null;
        if (adminNote.trim()) all[idx].admin_notes = adminNote.trim();
        localStorage.setItem('ez_payments', JSON.stringify(all));
      }
    }
    setReviewingPayment(null);
    setAdminNote('');
    loadAll();
    showToast(lang === 'zh' ? '审核已驳回！可在下方“有效租约 & 收租核查表”展开该租约查看详情。' : 'Review rejected! You can expand this lease in the "Active Leases" table below to check details.', 'warning');
  };

  const clearEvidence = async (paymentId: string) => {
    if (!confirm(t('confirmClearEvidence'))) return;
    const evidenceUrl =
      reviewingPayment?.id === paymentId ? reviewingPayment.evidence_url
        : leases.flatMap(l => l.payments || []).find(p => p.id === paymentId)?.evidence_url;
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const storagePath = evidenceUrl
          ? unitMediaStoragePath(evidenceUrl)
          : `evidence/${paymentId}.jpg`;
        if (storagePath) await removeUnitMediaFiles(supabase, [storagePath]);
        const { error } = await supabase.from('payment_records').update({
          evidence_url: null,
          status: 'unpaid',
          paid: false,
          paid_date: null,
          admin_notes: null,
        }).eq('id', paymentId);
        if (error) { showToast(error.message, 'error'); return; }
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const all: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const idx = all.findIndex(p => p.id === paymentId);
      if (idx !== -1) {
        all[idx].evidence_url = null;
        all[idx].status = 'unpaid';
        all[idx].paid = false;
        all[idx].paid_date = null;
        all[idx].admin_notes = undefined;
        localStorage.setItem('ez_payments', JSON.stringify(all));
      }
    }
    setReviewingPayment(null);
    setAdminNote('');
    loadAll();
    showToast(t('evidenceCleared'), 'success');
  };

  const visibleUnits = adminRole === 'super_admin'
    ? units
    : units.filter(u => u.agent_id === currentUserId || !u.agent_id);

  const visibleLeases = adminRole === 'super_admin'
    ? leases
    : leases.filter(l => l.unitData?.agent_id === currentUserId || !l.unitData?.agent_id);

  const pendingCount = visibleLeases.reduce((sum, l) => sum + (l.payments?.filter(p => p.status === 'pending_review').length || 0), 0);

  // ── Feedback state ──
  interface FeedbackItem {
    id: string;
    user_id: string;
    lease_id?: string | null;
    category?: string;
    content: string;
    status: string;
    admin_reply: string | null;
    assigned_to?: string | null;
    rating?: number | null;
    created_at: string;
    photo_url?: string | null;
    user_name?: string;
    unit_info?: string;
  }
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackReply, setFeedbackReply] = useState<Record<string, string>>({});

  const fetchFeedbacks = async (liveOverride?: boolean) => {
    const useLive = liveOverride !== undefined ? liveOverride : isLive;
    if (!useLive) {
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
      const leasesData = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const unitsData = JSON.parse(localStorage.getItem('ez_units') || '[]');
      const communitiesData = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      const enriched = all.map((f: FeedbackItem) => {
        const u = users.find((u: any) => u.id === f.user_id);
        const lease = leasesData.find((l: any) => l.tenant_id === f.user_id && l.status === 'active');
        let unitInfo = '';
        if (lease) {
          const unit = unitsData.find((un: any) => un.id === lease.unit_id);
          if (unit) {
            const comm = communitiesData.find((c: any) => c.id === unit.community_id);
            unitInfo = `${comm?.name || ''}${unit.room_type ? ` · ${unit.room_type}` : ''}`;
          }
        }
        return { ...f, user_name: u?.full_name || u?.email || f.user_id.slice(0, 8), unit_info: unitInfo || undefined };
      });
      setFeedbacks(enriched);
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false });
        if (!data) { setFeedbacks([]); return; }

        const enriched = await Promise.all(data.map(async (f: FeedbackItem) => {
          let userName = f.user_id.slice(0, 8);
          let unitInfo = '';

          const { data: userData } = await supabase.from('users').select('full_name, email').eq('id', f.user_id).single();
          if (userData) userName = userData.full_name || userData.email || userName;

          const { data: leaseData } = await supabase.from('leases').select('unit_id').eq('tenant_id', f.user_id).eq('status', 'active').limit(1).single();
          if (leaseData) {
            const { data: unitData } = await supabase.from('units').select('room_type, community_id').eq('id', leaseData.unit_id).single();
            if (unitData) {
              const { data: commData } = await supabase.from('communities').select('name').eq('id', unitData.community_id).single();
              unitInfo = `${commData?.name || ''}${unitData.room_type ? ` · ${unitData.room_type}` : ''}`;
            }
          }

          return { ...f, user_name: userName, unit_info: unitInfo || undefined };
        }));

        setFeedbacks(enriched);
      } catch (e) { console.error('Fetch feedback error:', e); }
    }
  };

  const claimFeedback = async (id: string) => {
    if (!isLive) {
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      const idx = all.findIndex((f: FeedbackItem) => f.id === id);
      if (idx !== -1) {
        all[idx].status = 'in_progress';
        all[idx].assigned_to = currentUserId;
        localStorage.setItem('ez_feedback', JSON.stringify(all));
      }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('maintenance_requests').update({ status: 'in_progress', assigned_to: currentUserId }).eq('id', id);
      } catch (e) { console.error('Claim feedback error:', e); }
    }
    fetchFeedbacks();
    showToast(lang === 'zh' ? '已成功认领工单！' : 'Claimed request successfully!', 'success');
  };

  const resolveFeedback = async (id: string) => {
    if (!isLive) {
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      const idx = all.findIndex((f: FeedbackItem) => f.id === id);
      if (idx !== -1) { all[idx].status = 'resolved'; localStorage.setItem('ez_feedback', JSON.stringify(all)); }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('maintenance_requests').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id);
      } catch (e) { console.error('Resolve feedback error:', e); }
    }
    fetchFeedbacks();
    showToast(t('feedbackResolved'), 'success');
  };

  const replyFeedback = async (id: string) => {
    const reply = feedbackReply[id]?.trim();
    if (!reply) return;
    if (!isLive) {
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      const idx = all.findIndex((f: FeedbackItem) => f.id === id);
      if (idx !== -1) { all[idx].admin_reply = reply; all[idx].status = 'resolved'; localStorage.setItem('ez_feedback', JSON.stringify(all)); }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('maintenance_requests').update({ admin_reply: reply, status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id);
      } catch (e) { console.error('Reply feedback error:', e); }
    }
    setFeedbackReply(prev => { const n = { ...prev }; delete n[id]; return n; });
    fetchFeedbacks();
    showToast(t('feedbackReplied'), 'success');
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm(t('feedbackConfirmDelete'))) return;
    if (!isLive) {
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      localStorage.setItem('ez_feedback', JSON.stringify(all.filter((f: FeedbackItem) => f.id !== id)));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('maintenance_requests').delete().eq('id', id);
      } catch (e) { console.error('Delete feedback error:', e); }
    }
    fetchFeedbacks();
    showToast(t('feedbackDelete'), 'success');
  };

  const visibleFeedbacks = adminRole === 'super_admin'
    ? feedbacks
    : feedbacks.filter(f => {
        // Find if this tenant has a lease under this agent
        const lease = leases.find(l => l.tenant_id === f.user_id && l.status === 'active');
        if (!lease) return true; // Show orphans
        return !lease.unitData || lease.unitData.agent_id === currentUserId || !lease.unitData.agent_id;
      });

  const feedbackPendingCount = visibleFeedbacks.filter(f => f.status === 'pending').length;

  // ── Tenant interests state ──
  const [interests, setInterests] = useState<TenantInterest[]>([]);

  const visibleInterests = adminRole === 'super_admin'
    ? interests
    : interests.filter(i => {
        const unit = units.find(u => u.id === i.unit_id);
        return !unit || unit.agent_id === currentUserId || !unit.agent_id;
      });

  const leasesPendingCount = pendingCount + visibleInterests.filter(i => i.status === 'interested').length;

  useEffect(() => {
    if (onPendingCountsChange) {
      onPendingCountsChange(leasesPendingCount, feedbackPendingCount);
    }
  }, [leasesPendingCount, feedbackPendingCount, onPendingCountsChange]);

  const fetchInterests = async () => {
    if (!isLive) {
      // Mock: read from localStorage
      const all: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      setInterests(all);
      return;
    }
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('tenant_interests').select('*').order('created_at');
      if (data) setInterests(data);
    } catch {}
  };

  const confirmInterest = async (interestId: string, unitId: string) => {
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('tenant_interests').update({ status: 'confirmed' }).eq('id', interestId);
      } catch {}
    } else {
      const all: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      const idx = all.findIndex(i => i.id === interestId);
      if (idx !== -1) { all[idx].status = 'confirmed'; localStorage.setItem('ez_interests', JSON.stringify(all)); }
    }
    fetchInterests();
    showToast(t('interestConfirmed'), 'success');
  };

  const removeInterest = async (interestId: string) => {
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('tenant_interests').update({ status: 'left' }).eq('id', interestId);
      } catch {}
    } else {
      const all: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      const idx = all.findIndex(i => i.id === interestId);
      if (idx !== -1) { all[idx].status = 'left'; localStorage.setItem('ez_interests', JSON.stringify(all)); }
    }
    fetchInterests();
    showToast(t('interestRemoved'), 'warning');
  };

  const [myProfile, setMyProfile] = useState<{
    display_name: string;
    phone: string;
    whatsapp: string;
    wechat_id: string;
    email: string;
    avatar_url: string;
    job_title: string;
    agency_name: string;
    agency_license: string;
    agency_address: string;
    bio: string;
    experience_years: number;
    experience_months: number;
    area_expertise: string;
    property_types: string;
  }>({
    display_name: '', phone: '', whatsapp: '', wechat_id: '', email: '',
    avatar_url: '', job_title: '', agency_name: '', agency_license: '', agency_address: '',
    bio: '', experience_years: 0, experience_months: 0, area_expertise: '', property_types: ''
  });

  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    detectModeAndLoad();
  }, []);

  const detectModeAndLoad = async () => {
    const defaultProfile = {
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
      area_expertise: 'Bandar Sunway, Subang Jaya, Petaling Jaya',
      property_types: 'Condo, Serviced Residence, Apartment, Room'
    };

    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLive(true);
        setCurrentUserId(user.id);
        loadFromSupabase(supabase);
        // Load QR code and profile from admin_users
        const { data: adminData, error: adminErr } = await supabase.from('admin_users').select('*').eq('id', user.id).maybeSingle();
        console.log('[Admin QR & Profile Load]', { userId: user.id, adminData, adminErr: adminErr?.message });
        if (adminData) {
          if (adminData.payment_qr_code) {
            setAdminQR(adminData.payment_qr_code);
            localStorage.setItem('ez_admin_qr_code', adminData.payment_qr_code);
          }
          setMyProfile({
            display_name: adminData.display_name || '',
            phone: adminData.phone || '',
            whatsapp: adminData.whatsapp || '',
            wechat_id: adminData.wechat_id || '',
            email: adminData.email || '',
            avatar_url: adminData.avatar_url || '',
            job_title: adminData.job_title || 'Real Estate Negotiator',
            agency_name: adminData.agency_name || 'Malaysia Ez Rent',
            agency_license: adminData.agency_license || '',
            agency_address: adminData.agency_address || '',
            bio: adminData.bio || '',
            experience_years: adminData.experience_years ?? 0,
            experience_months: adminData.experience_months ?? 0,
            area_expertise: Array.isArray(adminData.area_expertise) ? adminData.area_expertise.join(', ') : (adminData.area_expertise || ''),
            property_types: Array.isArray(adminData.property_types) ? adminData.property_types.join(', ') : (adminData.property_types || ''),
          });
          localStorage.setItem('ez_admin_profile', JSON.stringify(adminData));
        }
        return;
      }
    } catch {}
    setIsLive(false);
    setCurrentUserId('admin-999'); // Point to admin-999 to align with DEFAULT_ADMINS
    loadFromLocalStorage();
    const savedQR = localStorage.getItem('ez_admin_qr_code');
    if (savedQR) setAdminQR(savedQR);
    const savedProfile = localStorage.getItem('ez_admin_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setMyProfile({
          ...defaultProfile,
          ...parsed,
          area_expertise: Array.isArray(parsed.area_expertise) ? parsed.area_expertise.join(', ') : (parsed.area_expertise || defaultProfile.area_expertise),
          property_types: Array.isArray(parsed.property_types) ? parsed.property_types.join(', ') : (parsed.property_types || defaultProfile.property_types),
        });
      } catch {
        setMyProfile(defaultProfile);
      }
    } else {
      setMyProfile(defaultProfile);
    }
  };

  const handleSaveProfile = async () => {
    if (!myProfile.display_name.trim()) {
      showToast(lang === 'zh' ? '请填写姓名' : 'Please fill in display name', 'error');
      return;
    }
    if (!myProfile.phone && !myProfile.whatsapp && !myProfile.wechat_id) {
      showToast(lang === 'zh' ? '请至少填一种联系方式' : 'Please fill in at least one contact method', 'error');
      return;
    }

    const areaExpertiseArr = myProfile.area_expertise.split(',').map(s => s.trim()).filter(Boolean);
    const propertyTypesArr = myProfile.property_types.split(',').map(s => s.trim()).filter(Boolean);

    let finalAvatarUrl = myProfile.avatar_url.trim() || null;

    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // If avatar is base64 local image, compress and upload to storage
          if (finalAvatarUrl && finalAvatarUrl.startsWith('data:image')) {
            try {
              const blob = await compressDataUrl(finalAvatarUrl, {
                maxWidth: 300,
                maxHeight: 300,
                quality: 0.82,
                mimeType: 'image/jpeg',
                skipBelowBytes: 40 * 1024
              });
              const path = `avatars/${user.id}_${Date.now()}.jpg`;
              const { error: uploadErr } = await supabase.storage.from('unit-media').upload(path, blob, {
                upsert: true,
                contentType: 'image/jpeg'
              });
              if (!uploadErr) {
                const { data: urlData } = supabase.storage.from('unit-media').getPublicUrl(path);
                if (urlData?.publicUrl) {
                  finalAvatarUrl = urlData.publicUrl;
                  setMyProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
                }
              } else {
                console.error('Avatar upload error:', uploadErr);
              }
            } catch (compressErr) {
              console.error('Avatar compression/upload failed:', compressErr);
            }
          }

          const { error } = await supabase
            .from('admin_users')
            .update({
              display_name: myProfile.display_name.trim(),
              phone: myProfile.phone.trim() || null,
              whatsapp: myProfile.whatsapp.trim() || null,
              wechat_id: myProfile.wechat_id.trim() || null,
              avatar_url: finalAvatarUrl,
              job_title: myProfile.job_title.trim() || 'Real Estate Negotiator',
              agency_name: myProfile.agency_name.trim() || 'Malaysia Ez Rent',
              agency_license: myProfile.agency_license.trim() || null,
              agency_address: myProfile.agency_address.trim() || null,
              bio: myProfile.bio.trim() || null,
              experience_years: Number(myProfile.experience_years) || 0,
              experience_months: Number(myProfile.experience_months) || 0,
              area_expertise: areaExpertiseArr,
              property_types: propertyTypesArr,
            })
            .eq('id', user.id);
          if (error) {
            showToast(error.message, 'error');
            return;
          }
          showToast(lang === 'zh' ? '个人资料已更新' : 'Profile updated successfully', 'success');
          // cache local copy
          localStorage.setItem('ez_admin_profile', JSON.stringify({
            ...myProfile,
            avatar_url: finalAvatarUrl || '',
            area_expertise: areaExpertiseArr,
            property_types: propertyTypesArr
          }));
        }
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    } else {
      const updatedProfile = {
        ...myProfile,
        area_expertise: areaExpertiseArr,
        property_types: propertyTypesArr,
      };
      localStorage.setItem('ez_admin_profile', JSON.stringify(updatedProfile));
      
      // Update this admin in ez_admins array
      const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
      const idx = admins.findIndex((a: any) => a.id === currentUserId);
      if (idx !== -1) {
        admins[idx] = {
          ...admins[idx],
          ...updatedProfile,
        };
        localStorage.setItem('ez_admins', JSON.stringify(admins));
      }
      
      // Save this contact to client-side localStorage too
      localStorage.setItem('ez_admin_contacts', JSON.stringify([updatedProfile]));
      showToast(lang === 'zh' ? '本地个人资料已保存' : 'Local profile saved', 'success');
    }
  };

  const loadFromSupabase = async (supabase: any) => {
    try {
      const [commRes, unitRes, leaseRes, paymentRes, userRes, interestRes, adminRes] = await Promise.all([
        supabase.from('communities').select('*'),
        supabase.from('units').select('*'),
        supabase.from('leases').select(`
          *,
          units (
            id,
            unit_number,
            room_type,
            community_id,
            rent,
            status,
            description,
            agent_id,
            communities (
              id,
              name,
              address,
              lat,
              lng
            )
          )
        `),
        supabase.from('payment_records').select('*'),
        supabase.from('users').select('id, full_name, phone'),
        supabase.from('tenant_interests').select('*'),
        supabase.from('admin_users').select('id'),
      ]);
      const c: Community[] = commRes.data || [];
      const u: Unit[] = unitRes.data || [];
      const l: any[] = leaseRes.data || [];
      const p: Payment[] = paymentRes.data || [];
      const users: any[] = userRes.data || [];
      const admins: any[] = adminRes.data || [];
      setCommunities(c);
      setUnits(u);
      setAllUsers(users);
      setAdminIds(admins.map(a => a.id));
      setLeases(l.map(row => {
        const { units: nestedUnit, ...lease } = row as Lease & { units?: any };
        const unitData: Unit | undefined = nestedUnit ? {
          id: nestedUnit.id,
          community_id: nestedUnit.community_id,
          unit_number: nestedUnit.unit_number,
          room_type: nestedUnit.room_type,
          rent: nestedUnit.rent,
          status: nestedUnit.status,
          description: nestedUnit.description ?? '',
          agent_id: nestedUnit.agent_id,
        } : u.find(x => x.id === lease.unit_id);
        const communityData: Community | undefined = nestedUnit?.communities ? {
          id: nestedUnit.communities.id,
          name: nestedUnit.communities.name,
          address: nestedUnit.communities.address ?? '',
          lat: nestedUnit.communities.lat ?? 0,
          lng: nestedUnit.communities.lng ?? 0,
        } : (() => {
          const un = unitData ?? u.find(x => x.id === lease.unit_id);
          return un ? c.find(x => x.id === un.community_id) : undefined;
        })();
        return {
          ...lease,
          unitData,
          communityData,
          tenantName: users.find(x => x.id === lease.tenant_id)?.full_name || lease.tenant_id,
          payments: p.filter(x => x.lease_id === lease.id),
        };
      }));
      if (interestRes.data) setInterests(interestRes.data);
      fetchFeedbacks(true);
    } catch (e) { console.error('Failed to load from Supabase:', e); }
  };

  const loadFromLocalStorage = () => {
    const c: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
    const u: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
    const l: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
    const p: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
    const users: any[] = JSON.parse(localStorage.getItem('ez_users') || '[]');
    const ints: TenantInterest[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
    const admins: any[] = JSON.parse(localStorage.getItem('ez_admins') || '[]');
    setCommunities(c);
    setUnits(u);
    setAllUsers(users);
    setAdminIds(admins.map(a => a.id));
    setLeases(l.map(lease => ({
      ...lease,
      unitData: u.find(x => x.id === lease.unit_id),
      communityData: (() => { const un = u.find(x => x.id === lease.unit_id); return un ? c.find(x => x.id === un.community_id) : undefined; })(),
      tenantName: users.find(x => x.id === lease.tenant_id)?.full_name || lease.tenant_id,
      payments: p.filter(x => x.lease_id === lease.id),
    })));
    setInterests(ints);
    fetchFeedbacks(false);
  };

  const loadAll = () => {
    if (isLive) {
      import('@/utils/supabase/client').then(({ createClient }) => {
        loadFromSupabase(createClient());
      });
    } else {
      loadFromLocalStorage();
    }
    fetchInterests();
  };

  const handleCommunitySearch = (val: string) => {
    setCommunitySearch(val);
    setCommunityForm(f => ({ ...f, name: val }));
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
        (predictions: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === window.google!.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions.map((p: google.maps.places.AutocompletePrediction) => ({
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
        lat: p.lat,
        lng: p.lng
      })));
    }
  };

  const selectSuggestion = (s: any) => {
    setCommunitySearch(s.main_text);
    if (s.place_id && typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
      const dummyDiv = document.createElement('div');
      const placesService = new window.google.maps.places.PlacesService(dummyDiv);
      placesService.getDetails(
        {
          placeId: s.place_id,
          fields: ['name', 'formatted_address', 'geometry']
        },
        (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === window.google!.maps.places.PlacesServiceStatus.OK && place) {
            setCommunityForm(f => ({
              ...f,
              name: place.name || s.main_text,
              address: place.formatted_address || s.description,
              lat: String(place.geometry?.location?.lat() || 3.06341),
              lng: String(place.geometry?.location?.lng() || 101.60977)
            }));
          }
        }
      );
    } else {
      setCommunityForm(f => ({
        ...f,
        name: s.main_text,
        address: s.secondary_text,
        lat: String(s.lat || 3.06341),
        lng: String(s.lng || 101.60977)
      }));
    }
    setSuggestions([]);
  };

  const saveCommunity = async () => {
    const errors: Record<string, boolean> = {};
    if (!communityForm.name.trim()) errors.name = true;
    if (!communityForm.address.trim()) errors.address = true;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast(t('validationCommunityRequired'), 'error');
      return;
    }
    setFieldErrors({});
    const newC: Community = { id: isLive ? crypto.randomUUID() : `c-${Date.now()}`, name: communityForm.name, address: communityForm.address, lat: parseFloat(communityForm.lat) || 3.06341, lng: parseFloat(communityForm.lng) || 101.60977, amenities: communityForm.amenities };
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error } = await supabase.from('communities').insert(newC);
        if (error) { showToast(error.message, 'error'); return; }
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const list: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      localStorage.setItem('ez_communities', JSON.stringify([...list, newC]));
    }
    setCommunityForm({ name: '', address: '', lat: '', lng: '', amenities: [] }); setCommunitySearch(''); loadAll();
    showToast(lang === 'zh' ? '小区保存成功！现在可以在下方“2. 新增房间”中选择该小区来录入房间。' : 'Community saved successfully! You can now select it under "2. Add Room Unit" below to list a room.', 'success');
  };

  const deleteCommunity = async (communityId: string) => {
    const linkedUnits = units.filter(u => u.community_id === communityId);
    if (linkedUnits.length > 0) {
      showToast(t('communityHasUnits'), 'error');
      return;
    }
    if (!confirm(t('confirmDeleteCommunity'))) return;

    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error } = await supabase.from('communities').delete().eq('id', communityId);
        if (error) { showToast(error.message, 'error'); return; }
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const list: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      localStorage.setItem('ez_communities', JSON.stringify(list.filter(c => c.id !== communityId)));
    }

    if (unitForm.community_id === communityId) {
      setUnitForm(f => ({ ...f, community_id: '' }));
    }
    loadAll();
    showToast(t('validationDeleted'), 'success');
  };

  const getCommunityOptionLabel = (c: Community) => {
    const sameNameCount = communities.filter(x => x.name === c.name).length;
    const unitCount = units.filter(u => u.community_id === c.id).length;
    if (sameNameCount <= 1) return c.name;
    const addrHint = c.address
      ? ` · ${c.address.slice(0, 28)}${c.address.length > 28 ? '…' : ''}`
      : '';
    return `${c.name}${addrHint} (${unitCount}${lang === 'zh' ? '个房源' : ' units'})`;
  };

  const saveUnit = async () => {
    const errors: Record<string, boolean> = {};
    if (!unitForm.community_id) errors.community_id = true;
    if (!unitForm.rent) errors.rent = true;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast(t('validationUnitRequired'), 'error');
      return;
    }
    setFieldErrors({});

    const isEdit = !!editingUnitId;
    const targetId = editingUnitId || (isLive ? crypto.randomUUID() : `u-${Date.now()}`);

    if (mediaImages.length === 0 && !mediaVideo) {
      showToast(t('validationNoMedia'), 'warning');
    } else {
      showToast(t('validationSaved'), 'success');
    }

    const unitPayload: any = { 
      community_id: unitForm.community_id, 
      unit_number: unitForm.unit_number, 
      room_type: unitForm.room_type, 
      rent: parseFloat(unitForm.rent), 
      description: unitForm.description, 
      max_occupants: parseInt(unitForm.max_occupants) || 1,
      bedrooms: parseInt(unitForm.bedrooms) || 1,
      bathrooms: parseInt(unitForm.bathrooms) || 1,
      landlord_bank_info: unitForm.landlord_bank_info || null,
      embedding: null
    };

    if (!isEdit) {
      unitPayload.id = targetId;
      unitPayload.status = 'available';
    } else {
      const prev = units.find(u => u.id === targetId);
      if (prev?.agent_id) {
        unitPayload.agent_id = prev.agent_id;
      }
    }

    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (!isEdit || !unitPayload.agent_id) {
            unitPayload.agent_id = user.id;
          }
        }
        
        // Upload base64 images to Supabase Storage, keep existing http URLs
        const uploadedUrls: string[] = [];
        for (let i = 0; i < mediaImages.length; i++) {
          const img = mediaImages[i];
          if (img.startsWith('http')) {
            uploadedUrls.push(img);
          } else {
            const blob = await compressDataUrl(img, UNIT_IMAGE_PRESET);
            const path = `${targetId}/${Date.now()}_${i}.jpg`;
            const { error: uploadErr } = await supabase.storage.from('unit-media').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
            if (uploadErr) { console.error('Upload error:', uploadErr); continue; }
            const { data: urlData } = supabase.storage.from('unit-media').getPublicUrl(path);
            if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
          }
        }
        unitPayload.media_urls = uploadedUrls;

        if (isEdit) {
          const prev = units.find(u => u.id === targetId);
          const keptUrls = new Set(uploadedUrls.map(u => u.split('?')[0]));
          const removedImagePaths = (prev?.media_urls || [])
            .filter(u => !keptUrls.has(u.split('?')[0]))
            .map(u => unitMediaStoragePath(u))
            .filter(Boolean) as string[];
          if (removedImagePaths.length) await removeUnitMediaFiles(supabase, removedImagePaths);
          if (!mediaVideo && prev?.video_url) {
            const vp = unitMediaStoragePath(prev.video_url);
            if (vp) await removeUnitMediaFiles(supabase, [vp]);
          }
        }

        if (mediaVideo) {
          if (mediaVideo.startsWith('http')) {
            unitPayload.video_url = mediaVideo;
          } else {
            try {
              const res = await fetch(mediaVideo);
              const blob = await res.blob();
              const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
              const videoPath = `${targetId}/walkthrough.${ext}`;
              const { error: videoErr } = await supabase.storage.from('unit-media').upload(videoPath, blob, {
                upsert: true,
                contentType: blob.type || 'video/webm',
              });
              if (!videoErr) {
                const { data: videoUrlData } = supabase.storage.from('unit-media').getPublicUrl(videoPath);
                if (videoUrlData?.publicUrl) unitPayload.video_url = videoUrlData.publicUrl;
              } else {
                console.error('Video upload error:', videoErr);
              }
            } catch (e) {
              console.error('Video upload failed:', e);
            }
          }
        } else if (isEdit) {
          unitPayload.video_url = null;
        }

        if (unitForm.landlord_qr_code) {
          if (unitForm.landlord_qr_code.startsWith('http')) {
            unitPayload.landlord_qr_code = unitForm.landlord_qr_code;
          } else {
            const blob = await compressDataUrl(unitForm.landlord_qr_code, UNIT_IMAGE_PRESET);
            const path = `${targetId}/landlord_qr_${Date.now()}.jpg`;
            const { error: qrUploadErr } = await supabase.storage.from('unit-media').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
            if (!qrUploadErr) {
              const { data: qrUrlData } = supabase.storage.from('unit-media').getPublicUrl(path);
              if (qrUrlData?.publicUrl) unitPayload.landlord_qr_code = qrUrlData.publicUrl;
            }
          }
        } else if (isEdit) {
          unitPayload.landlord_qr_code = null;
        }

        if (isEdit) {
          const { error } = await supabase.from('units').update(unitPayload).eq('id', targetId);
          if (error) { showToast(error.message, 'error'); return; }
        } else {
          const { error } = await supabase.from('units').insert(unitPayload);
          if (error) { showToast(error.message, 'error'); return; }
        }

        // Trigger immediate backend embedding synchronization in the background
        const agentApiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://127.0.0.1:8000';
        fetch(`${agentApiUrl}/api/embeddings/sync`, { method: 'POST' }).catch(err => console.error('Failed to trigger embedding sync:', err));
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const list: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
      if (unitForm.landlord_qr_code) unitPayload.landlord_qr_code = unitForm.landlord_qr_code;
      if (isEdit) {
        const idx = list.findIndex(u => u.id === targetId);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...unitPayload };
        }
      } else {
        list.push(unitPayload);
      }
      localStorage.setItem('ez_units', JSON.stringify(list));

      if (mediaImages.length > 0 || mediaVideo) {
        const allMedia = JSON.parse(localStorage.getItem('ez_unit_media') || '{}');
        allMedia[targetId] = { images: mediaImages, video: mediaVideo };
        try { localStorage.setItem('ez_unit_media', JSON.stringify(allMedia)); } catch {}
      }
    }

    setUnitForm({ community_id: '', unit_number: '', room_type: 'Studio', rent: '', description: '', max_occupants: '1', bedrooms: '1', bathrooms: '1', landlord_qr_code: '', landlord_bank_info: '' });
    setMediaImages([]); setMediaVideo(null); setEditingUnitId(null); loadAll();
  };

  const startEditUnit = (u: Unit) => {
    setEditingUnitId(u.id);
    setUnitForm({
      community_id: u.community_id,
      unit_number: u.unit_number || '',
      room_type: u.room_type,
      rent: String(u.rent),
      description: u.description || '',
      max_occupants: String(u.max_occupants || 1),
      bedrooms: String(u.bedrooms || 1),
      bathrooms: String(u.bathrooms || 1),
      landlord_qr_code: u.landlord_qr_code || '',
      landlord_bank_info: u.landlord_bank_info || ''
    });

    const unitImages = u.media_urls && u.media_urls.length > 0
      ? u.media_urls
      : (() => { try { const m = JSON.parse(localStorage.getItem('ez_unit_media') || '{}'); return m[u.id]?.images || []; } catch { return []; } })();
    setMediaImages(unitImages);

    const unitVideo = u.video_url || (() => { try { const m = JSON.parse(localStorage.getItem('ez_unit_media') || '{}'); return m[u.id]?.video || null; } catch { return null; } })();
    setMediaVideo(unitVideo);

    setPropertiesView('editor');

    setTimeout(() => {
      const formEl = document.getElementById('add-unit-form-section');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleImgFiles = async (files: FileList | null) => {
    if (!files) return;
    const remaining = 9 - mediaImages.length;
    const toRead = Array.from(files).slice(0, remaining);
    for (const file of toRead) {
      try {
        const dataUrl = await compressImageToDataUrl(file, UNIT_IMAGE_PRESET);
        setMediaImages(prev => (prev.length < 9 ? [...prev, dataUrl] : prev));
      } catch (e) {
        console.error('Image compress error:', e);
      }
    }
  };

  const handleVideoFile = async (file: File | null) => {
    if (!file) return;
    const maxBytes = 150 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast(lang === 'zh' ? '视频超过 150MB，请先裁剪或压缩' : 'Video exceeds 150MB — trim or compress first', 'error');
      return;
    }
    setVideoCompressing(true);
    try {
      const compressed = await compressVideoFile(file, UNIT_VIDEO_PRESET);
      if (mediaVideo?.startsWith('blob:')) URL.revokeObjectURL(mediaVideo);
      setMediaVideo(URL.createObjectURL(compressed));
      if (compressed.size < file.size) {
        showToast(lang === 'zh'
          ? `视频已压缩：${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024 / 1024).toFixed(1)}MB`
          : `Video compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024 / 1024).toFixed(1)}MB`, 'success');
      }
    } catch (e) {
      console.error('Video compress error:', e);
      setMediaVideo(URL.createObjectURL(file));
      showToast(lang === 'zh' ? '视频压缩失败，已使用原文件' : 'Compression failed — using original file', 'warning');
    } finally {
      setVideoCompressing(false);
    }
  };

  const handleQRFile = async (file: File | null) => {
    if (!file) return;
    if (isLive) {
      setQrUploading(true);
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { showToast('未登录', 'error'); setQrUploading(false); return; }
        const path = `qr/${user.id}.jpg`;
        const compressed = await compressImageFile(file, QR_IMAGE_PRESET);
        const { error: uploadErr } = await supabase.storage.from('unit-media').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
        if (uploadErr) { showToast(uploadErr.message, 'error'); setQrUploading(false); return; }
        const { data: urlData } = supabase.storage.from('unit-media').getPublicUrl(path);
        const url = urlData?.publicUrl;
        if (url) {
          console.log('[QR Upload] user.id:', user.id, 'url:', url);
          const { data: updatedRows, error: dbErr } = await supabase.from('admin_users').update({ payment_qr_code: url }).eq('id', user.id).select();
          console.log('[QR Upload] update result:', { updatedRows, dbErr: dbErr?.message, code: dbErr?.code });
          if (dbErr) {
            showToast(dbErr.message, 'error');
            setQrUploading(false);
            return;
          }
          if (!updatedRows || updatedRows.length === 0) {
            // 可能是 RLS 策略阻止了更新（非 super_admin）
            // 尝试读取当前用户的角色
            const { data: myAdmin } = await supabase.from('admin_users').select('role').eq('id', user.id).maybeSingle();
            console.log('[QR Upload] my role:', myAdmin?.role);
            if (myAdmin?.role !== 'super_admin') {
              showToast('仅超级管理员可修改收款码，请联系超级管理员', 'error');
            } else {
              showToast('更新失败，请检查数据库 RLS 策略', 'error');
            }
            setQrUploading(false);
            return;
          }
          setAdminQR(url);
          localStorage.setItem('ez_admin_qr_code', url);
          showToast(t('validationSaved'), 'success');
        }
      } catch (err: any) { showToast(err.message || 'Upload failed', 'error'); }
      setQrUploading(false);
    } else {
      try {
        const b64 = await compressImageToDataUrl(file, QR_IMAGE_PRESET);
        setAdminQR(b64);
        localStorage.setItem('ez_admin_qr_code', b64);
      } catch (e) {
        console.error('QR compress error:', e);
      }
    }
  };

  const removeQR = async () => {
    if (!confirm('确定删除收款码？删除后学生将无法扫码付款。')) return;
    setAdminQR(null);
    localStorage.removeItem('ez_admin_qr_code');
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await removeUnitMediaFiles(supabase, [`qr/${user.id}.jpg`]);
          await supabase.from('admin_users').update({ payment_qr_code: null }).eq('id', user.id);
        }
      } catch {}
    }
  };

  const createLease = async () => {
    if (!leaseForm.unit_id || !leaseForm.start_date || !leaseForm.end_date || !leaseForm.monthly_rent) return;
    const tenantId = leaseForm.tenant_id && leaseForm.tenant_id !== '__manual__' ? leaseForm.tenant_id : '';
    if (isLive && !tenantId) { showToast(t('validationTenantRequired'), 'error'); return; }
    const finalTenantId = tenantId || `tenant-${Date.now()}`;
    const rent = parseFloat(leaseForm.monthly_rent);
    const secMonths = parseFloat(leaseForm.security_deposit_months) || 0;
    const utilMonths = parseFloat(leaseForm.utility_deposit_months) || 0;
    const totalDeposit = rent * (secMonths + utilMonths);
    const newLease: Lease = { id: isLive ? crypto.randomUUID() : `l-${Date.now()}`, unit_id: leaseForm.unit_id, tenant_id: finalTenantId, start_date: leaseForm.start_date, end_date: leaseForm.end_date, monthly_rent: rent, deposit_amount: totalDeposit, security_deposit_months: secMonths, utility_deposit_months: utilMonths, status: 'active' };
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error } = await supabase.from('leases').insert(newLease);
        if (error) { showToast(error.message, 'error'); return; }
        // Update unit status
        await supabase.from('units').update({ status: 'rented' }).eq('id', leaseForm.unit_id);
        // Payment records are auto-generated by DB trigger after_lease_insert
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const list: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const allP: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const payments: Payment[] = [];
      let cur = new Date(leaseForm.start_date); const endD = new Date(leaseForm.end_date);
      cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
      while (cur <= endD) {
        payments.push({ id: `p-${Date.now()}-${payments.length}`, lease_id: newLease.id, billing_month: cur.toISOString().split('T')[0], paid: false, paid_date: null });
        cur.setMonth(cur.getMonth() + 1);
      }
      const uList: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
      const ui = uList.findIndex(u => u.id === leaseForm.unit_id);
      if (ui !== -1) { uList[ui].status = 'rented'; localStorage.setItem('ez_units', JSON.stringify(uList)); }
      localStorage.setItem('ez_leases', JSON.stringify([...list, newLease]));
      localStorage.setItem('ez_payments', JSON.stringify([...allP, ...payments]));
    }
    setLeaseForm({ unit_id: '', tenant_id: '', start_date: '', end_date: '', monthly_rent: '', security_deposit_months: '2', utility_deposit_months: '0.5' });
    loadAll();
  };

  const deleteLease = async (leaseId: string) => {
    if (!confirm(t('confirmDeleteLease'))) return;
    const lease = leases.find(l => l.id === leaseId);
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        // Delete payment records first
        await supabase.from('payment_records').delete().eq('lease_id', leaseId);
        // Delete lease
        const { error } = await supabase.from('leases').delete().eq('id', leaseId);
        if (error) { showToast(error.message, 'error'); return; }
        // Restore unit status
        if (lease?.unit_id) await supabase.from('units').update({ status: 'available' }).eq('id', lease.unit_id);
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const allLeases: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      localStorage.setItem('ez_leases', JSON.stringify(allLeases.filter(l => l.id !== leaseId)));
      const allP: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      localStorage.setItem('ez_payments', JSON.stringify(allP.filter(p => p.lease_id !== leaseId)));
      if (lease?.unit_id) {
        const uList: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
        const idx = uList.findIndex(u => u.id === lease.unit_id);
        if (idx !== -1) { uList[idx].status = 'available'; localStorage.setItem('ez_units', JSON.stringify(uList)); }
      }
    }
    loadAll();
    showToast(t('validationDeleted'), 'success');
  };

  const deleteUnit = async (unitId: string) => {
    if (!confirm(t('confirmDeleteUnit'))) return;
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        // Delete storage media
        const unit = units.find(u => u.id === unitId);
        if (unit?.media_urls && unit.media_urls.length > 0) {
          const paths = unit.media_urls
            .map(url => unitMediaStoragePath(url))
            .filter(Boolean) as string[];
          if (paths.length > 0) await removeUnitMediaFiles(supabase, paths);
        }
        if (unit?.video_url) {
          const vPath = unitMediaStoragePath(unit.video_url);
          if (vPath) await removeUnitMediaFiles(supabase, [vPath]);
        }
        const { error } = await supabase.from('units').delete().eq('id', unitId);
        if (error) { showToast(error.message, 'error'); return; }
      } catch (e: any) { showToast(e.message, 'error'); return; }
    } else {
      const list: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
      localStorage.setItem('ez_units', JSON.stringify(list.filter(u => u.id !== unitId)));
      const media = JSON.parse(localStorage.getItem('ez_unit_media') || '{}');
      delete media[unitId];
      localStorage.setItem('ez_unit_media', JSON.stringify(media));
    }
    loadAll();
    showToast(t('validationDeleted'), 'success');
  };

  const togglePaid = async (paymentId: string, currentPaid: boolean) => {
    // 1. Optimistic UI update to make the interaction instant (0ms delay)
    setLeases(prevLeases => prevLeases.map(l => {
      if (!l.payments) return l;
      return {
        ...l,
        payments: l.payments.map(p => {
          if (p.id === paymentId) {
            return {
              ...p,
              paid: !currentPaid,
              paid_date: currentPaid ? null : new Date().toISOString().split('T')[0],
              status: currentPaid ? 'unpaid' : 'approved'
            };
          }
          return p;
        })
      };
    }));

    // 2. Perform DB update
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error } = await supabase.from('payment_records').update({
          paid: !currentPaid,
          paid_date: currentPaid ? null : new Date().toISOString().split('T')[0],
          status: currentPaid ? 'unpaid' : 'approved',
        }).eq('id', paymentId);
        
        if (error) {
          showToast(error.message, 'error');
          loadAll(); // Revert back to server state
          return;
        }
      } catch (err: any) {
        showToast(err.message, 'error');
        loadAll(); // Revert back to server state
        return;
      }
    } else {
      const all: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const idx = all.findIndex(p => p.id === paymentId);
      if (idx !== -1) {
        all[idx].paid = !currentPaid;
        all[idx].paid_date = currentPaid ? null : new Date().toISOString().split('T')[0];
        all[idx].status = currentPaid ? 'unpaid' : 'approved';
        localStorage.setItem('ez_payments', JSON.stringify(all));
      }
    }

    // 3. Show Success Toast
    showToast(lang === 'zh' ? '账单状态已更新' : 'Payment status updated', 'success');

    // 4. Background reload to sync
    loadAll();
  };

  const fmtMonth = (d: string) => new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', year: '2-digit' });

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px', borderRadius: 'var(--radius-sm)', fontWeight: 600,
    fontSize: '0.875rem', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? 'white' : 'var(--text-muted)',
    transition: 'all 0.2s',
  });

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tab Bar */}
      {!hideTabBar && (
        <div style={{ display: 'flex', gap: 4, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
          <button style={tabStyle(tab === 'properties')} onClick={() => { setTab('properties'); setPropertiesView('editor'); }}>
            <Building2 size={14} style={{ display: 'inline', marginRight: 6 }} />{t('adminProperties')}
          </button>
          <button style={tabStyle(tab === 'leases')} onClick={() => { setTab('leases'); setLeasesView('interests'); loadAll(); }}>
            <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />{t('adminLeases')}
            {leasesPendingCount > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 10, lineHeight: '1.4' }}>
                {leasesPendingCount}
              </span>
            )}
          </button>
          <button style={tabStyle(tab === 'payment')} onClick={() => setTab('payment')}>
            <QrCode size={14} style={{ display: 'inline', marginRight: 6 }} />{t('paymentSettings')}
          </button>
          {adminRole === 'super_admin' && (
            <button style={tabStyle(tab === 'admins')} onClick={() => { setTab('admins'); fetchAdmins(); }}>
              <Users size={14} style={{ display: 'inline', marginRight: 6 }} />管理员
            </button>
          )}
          <button style={tabStyle(tab === 'feedback')} onClick={() => { setTab('feedback'); fetchFeedbacks(); }}>
            <Wrench size={14} style={{ display: 'inline', marginRight: 6 }} />{t('feedback')}
            {feedbackPendingCount > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 10, lineHeight: '1.4' }}>
                {feedbackPendingCount}
              </span>
            )}
          </button>
          <button style={tabStyle(tab === 'profile')} onClick={() => setTab('profile')}>
            <Edit3 size={14} style={{ display: 'inline', marginRight: 6 }} />{lang === 'zh' ? '个人设置' : 'Profile'}
          </button>
        </div>
      )}

      {/* ── PROPERTIES TAB ── */}
      {tab === 'properties' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 6 }}>
            <button
              style={tabStyle(propertiesView === 'editor')}
              onClick={() => setPropertiesView('editor')}
            >
              {t('propertySubtabEditor')}
            </button>
            <button
              style={tabStyle(propertiesView === 'communities')}
              onClick={() => setPropertiesView('communities')}
            >
              {t('propertySubtabCommunities')}
            </button>
            <button
              style={tabStyle(propertiesView === 'inventory')}
              onClick={() => setPropertiesView('inventory')}
            >
              {t('propertySubtabInventory')}
            </button>
          </div>
          {/* Add community */}
          <div className="glass-card" style={{ display: propertiesView === 'inventory' ? 'none' : 'block', gridColumn: propertiesView === 'communities' ? '1 / -1' : 'auto' }}>
            {propertiesView === 'editor' ? (
              <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlusCircle size={16} style={{ color: 'var(--primary)' }} />{t('addCommunityTitle')}
              </h3>
            ) : (
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>{t('communityListTitle')}</h3>
            )}
            {propertiesView === 'editor' && (
              <>
            <div className="form-group">
              <label>{t('communityNameLabel')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  value={communitySearch}
                  onChange={e => { handleCommunitySearch(e.target.value); clearError('name'); }}
                  placeholder={t('communityNamePlaceholder')}
                  style={fieldErrors.name ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : undefined}
                />
                {suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', zIndex: 50, boxShadow: 'var(--glass-shadow)', maxHeight: '200px', overflowY: 'auto' }}>
                    {suggestions.map((s, i) => (
                      <div key={i} className="suggestion-item" onClick={() => selectSuggestion(s)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.85rem' }}>{s.main_text}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.secondary_text || s.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group"><label>{t('addressLabel')}</label><input className="form-input" value={communityForm.address} onChange={e => { setCommunityForm(f => ({ ...f, address: e.target.value })); clearError('address'); }} placeholder={t('addressPlaceholder')} style={fieldErrors.address ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : undefined} /></div>
            {communityForm.lat && communityForm.lng && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--success)', marginTop: 8, marginBottom: 12 }}>
                <CheckCircle2 size={14} />
                <span>位置定位成功 (Lat: {parseFloat(communityForm.lat).toFixed(4)}, Lng: {parseFloat(communityForm.lng).toFixed(4)})</span>
              </div>
            )}
            {/* Amenities */}
            <div className="form-group">
              <label style={{ marginBottom: 8, display: 'block' }}>{t('amenitiesLabel')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {AMENITIES.map(a => {
                  const checked = communityForm.amenities.includes(a.key);
                  return (
                    <label key={a.key} onClick={() => {
                      setCommunityForm(f => ({
                        ...f,
                        amenities: checked ? f.amenities.filter(k => k !== a.key) : [...f.amenities, a.key],
                      }));
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem',
                      background: checked ? 'rgba(37,99,235,0.08)' : 'transparent',
                      border: checked ? '1px solid rgba(37,99,235,0.3)' : '1px solid var(--glass-border)',
                      color: checked ? 'var(--primary)' : 'var(--text-body)',
                      transition: 'all 0.15s',
                    }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: checked ? 'var(--primary)' : 'transparent',
                        border: checked ? 'none' : '1.5px solid var(--glass-border)',
                        color: 'white', fontSize: '0.65rem', fontWeight: 700,
                      }}>{checked ? '✓' : ''}</span>
                      {lang === 'zh' ? a.labelZh : a.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveCommunity} style={{ width: '100%', marginTop: 12 }}>{t('saveBtn')}</button>
              </>
            )}

            {propertiesView === 'communities' && communities.length > 0 && (
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{t('communityListTitle')}</div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{t('communityListHint')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                  {communities.map(c => {
                    const unitCount = units.filter(u => u.community_id === c.id).length;
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-h)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.address || '—'} · {unitCount}{lang === 'zh' ? ' 个房源' : ' units'}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteCommunity(c.id)}
                          disabled={unitCount > 0}
                          style={{
                            background: 'none', border: 'none', cursor: unitCount > 0 ? 'not-allowed' : 'pointer',
                            color: unitCount > 0 ? 'var(--text-muted)' : 'var(--danger)', padding: 6, borderRadius: 6,
                            opacity: unitCount > 0 ? 0.4 : 1,
                          }}
                          title={unitCount > 0 ? t('communityHasUnits') : t('deleteCommunity')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Add unit */}
          <div id="add-unit-form-section" className="glass-card" style={{ display: propertiesView === 'editor' ? 'block' : 'none' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              {editingUnitId ? (
                <>
                  <FileText size={16} style={{ color: 'var(--accent)' }} />
                  {lang === 'zh' ? '编辑房源信息' : 'Edit Room Unit'}
                </>
              ) : (
                <>
                  <PlusCircle size={16} style={{ color: 'var(--primary)' }} />
                  {t('addUnitTitle')}
                </>
              )}
            </h3>
            <div className="form-group">
              <label>{t('selectCommunity')}</label>
              <select
                className="form-select"
                value={unitForm.community_id}
                onChange={e => { setUnitForm(f => ({ ...f, community_id: e.target.value })); clearError('community_id'); }}
                style={fieldErrors.community_id ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : undefined}
              >
                <option value="">{t('selectCommunity')}</option>
                {communities.map(c => <option key={c.id} value={c.id}>{getCommunityOptionLabel(c)}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t('roomType')}</label>
                <select className="form-select" value={unitForm.room_type} onChange={e => setUnitForm(f => ({ ...f, room_type: e.target.value }))}>
                  {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t('rentMYR')}</label><input type="number" className="form-input" value={unitForm.rent} onChange={e => { setUnitForm(f => ({ ...f, rent: e.target.value })); clearError('rent'); }} style={fieldErrors.rent ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : undefined} /></div>
              <div className="form-group"><label>{t('maxOccupants')}</label><input type="number" min="1" max="10" className="form-input" value={unitForm.max_occupants} onChange={e => setUnitForm(f => ({ ...f, max_occupants: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t('bedroomsLabel')}</label><input type="number" min="0" max="10" className="form-input" value={unitForm.bedrooms} onChange={e => setUnitForm(f => ({ ...f, bedrooms: e.target.value }))} /></div>
              <div className="form-group"><label>{t('bathroomsLabel')}</label><input type="number" min="0" max="10" className="form-input" value={unitForm.bathrooms} onChange={e => setUnitForm(f => ({ ...f, bathrooms: e.target.value }))} /></div>
            </div>
            
            <div className="form-group"><label>{t('landlordBankInfoLabel') || 'Landlord Bank Info'}</label><textarea className="form-textarea" rows={2} value={unitForm.landlord_bank_info} onChange={e => setUnitForm(f => ({ ...f, landlord_bank_info: e.target.value }))} placeholder={lang === 'zh' ? '如：银行账号、微信 ID、支付宝账号' : 'e.g. bank account, WeChat ID, Alipay account'} style={{ resize: 'vertical' }} /></div>

            {/* Landlord QR Code Upload */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <QrCode size={14} style={{ color: 'var(--primary)' }} /> {lang === 'zh' ? '房东收款二维码（银行/微信/支付宝，可选）' : 'Landlord QR code (bank / WeChat / Alipay, optional)'}
              </label>
              {unitForm.landlord_qr_code ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <img src={unitForm.landlord_qr_code} alt="Landlord QR" style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--glass-border)' }} />
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none', background: 'var(--danger-light)', color: 'var(--danger)' }} onClick={() => setUnitForm(f => ({ ...f, landlord_qr_code: '' }))}>移除 QR Code</button>
                </div>
              ) : (
                <input type="file" accept="image/*" className="form-input" style={{ fontSize: '0.8rem', padding: '6px' }} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const { compressImageToDataUrl } = await import('@/utils/compressImage');
                    const b64 = await compressImageToDataUrl(file, { maxWidth: 600, quality: 0.8 });
                    setUnitForm(f => ({ ...f, landlord_qr_code: b64 }));
                  } catch (err) { console.error(err); }
                }} />
              )}
            </div>

            <div className="form-group"><label>{t('descLabel')}</label><textarea className="form-textarea" rows={2} value={unitForm.description} onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))} placeholder={t('descPlaceholder')} style={{ resize: 'vertical' }} /></div>

            {/* ── Media Upload ── */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImagePlus size={14} style={{ color: 'var(--primary)' }} /> {t('uploadMedia')}
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{mediaImages.length}/9 {t('uploadImages')}</span>
              </label>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>{t('uploadHint')}</p>

              {/* Upload buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input ref={imgInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleImgFiles(e.target.files)} />
                <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}
                  onClick={() => imgInputRef.current?.click()} disabled={mediaImages.length >= 9}>
                  <ImagePlus size={14} /> {t('uploadImages')} ({mediaImages.length}/9)
                </button>
                <input ref={vidInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleVideoFile(e.target.files?.[0] || null)} />
                <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }}
                  onClick={() => vidInputRef.current?.click()} disabled={videoCompressing}>
                  <Video size={14} /> {videoCompressing ? (lang === 'zh' ? '压缩中…' : 'Compressing…') : `${t('uploadVideo')} ${mediaVideo ? '✓' : ''}`}
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleImgFiles(e.dataTransfer.files); }}
                style={{ border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: mediaImages.length > 0 || mediaVideo ? 12 : 0, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onDragEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onDragLeave={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
                onClick={() => imgInputRef.current?.click()}
              >
                <ImagePlus size={24} style={{ margin: '0 auto 6px', color: 'var(--primary)', opacity: 0.5 }} />
                {t('uploadHint')}
              </div>

              {/* Image preview grid */}
              {mediaImages.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{t('uploadPreview')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {mediaImages.map((src, i) => (
                      <div key={i} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                        <img src={src} alt={`photo-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {/* Delete */}
                        <button onClick={() => setMediaImages(p => p.filter((_, idx) => idx !== i))}
                          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white', width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={12} />
                        </button>
                        {/* Expand */}
                        <button onClick={() => setPreviewOpen(src)}
                          style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white', width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Image size={11} />
                        </button>
                        <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)' }}>{i + 1}</div>
                      </div>
                    ))}
                    {/* Add more slot */}
                    {mediaImages.length < 9 && (
                      <div onClick={() => imgInputRef.current?.click()}
                        style={{ aspectRatio: '4/3', borderRadius: 8, border: '2px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <PlusCircle size={20} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Video preview */}
              {mediaVideo && (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: 8 }}>
                  <video src={mediaVideo} controls style={{ width: '100%', maxHeight: 180, display: 'block', background: '#000' }} />
                  <button onClick={() => setMediaVideo(null)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {(mediaImages.length > 0 || mediaVideo) && (
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                  onClick={() => { setMediaImages([]); setMediaVideo(null); }}>
                  {t('uploadClear')}
                </button>
              )}
            </div>

            {editingUnitId ? (
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={saveUnit} style={{ flex: 1 }}>
                  {lang === 'zh' ? '保存修改' : 'Save Changes'}
                </button>
                <button className="btn" onClick={() => {
                  setEditingUnitId(null);
                  setUnitForm({ community_id: '', unit_number: '', room_type: 'Studio', rent: '', description: '', max_occupants: '1', bedrooms: '1', bathrooms: '1', landlord_qr_code: '', landlord_bank_info: '' });
                  setMediaImages([]); setMediaVideo(null);
                }} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-body)' }}>
                  {lang === 'zh' ? '取消编辑' : 'Cancel'}
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={saveUnit} style={{ width: '100%', marginTop: 8 }}>{t('saveBtn')}</button>
            )}
          </div>

          {/* Inventory Table */}
          <div className="glass-card" style={{ gridColumn: '1 / -1', display: propertiesView === 'inventory' ? 'block' : 'none' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>{t('inventoryTitle')}</h3>
            <div className="data-table-container" style={{ maxHeight: 420, overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>{t('colCommunity')}</th>
                  <th>{t('colType')}</th><th>{t('colRent')}</th><th>{t('colStatus')}</th>
                  <th>{t('colOccupants')}</th>
                  <th style={{ textAlign: 'center' }}>媒体</th>
                  <th style={{ textAlign: 'center' }}></th>
                </tr></thead>
                <tbody>
                  {visibleUnits.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>{t('noUnits')}</td></tr>}
                  {visibleUnits.map(u => {
                    const c = communities.find(x => x.id === u.community_id);
                    const unitImages = u.media_urls && u.media_urls.length > 0
                      ? u.media_urls
                      : (() => { try { const m = JSON.parse(localStorage.getItem('ez_unit_media') || '{}'); return m[u.id]?.images || []; } catch { return []; } })();
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{c?.name || '—'}</td>
                        <td>{u.room_type} ({u.bedrooms || 1}{t('bedroomsUnit')}{u.bathrooms || 1}{t('bathroomsUnit')})</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 600 }}>RM {u.rent.toLocaleString()}</td>
                        <td><span className={`status-badge ${u.status}`}>{u.status === 'available' ? t('statusAvailable') : t('statusRented')}</span></td>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                          {(() => {
                            const unitInterests = interests.filter(i => i.unit_id === u.id && i.status !== 'left');
                            const confirmed = unitInterests.filter(i => i.status === 'confirmed').length;
                            const max = u.max_occupants || 1;
                            return <span style={{ color: confirmed >= max ? 'var(--success)' : 'var(--text-muted)' }}>{confirmed}/{max}</span>;
                          })()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {unitImages.length > 0 ? (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
                              <img src={unitImages[0]} alt="" style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                              {unitImages.length > 1 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{unitImages.length - 1}</span>}
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button onClick={() => startEditUnit(u)} style={{
                              background: 'none', border: 'none', color: 'var(--primary)',
                              cursor: 'pointer', padding: 6, borderRadius: 6,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }} title={lang === 'zh' ? '编辑房源' : 'Edit Unit'}>
                              <Edit3 size={15} />
                            </button>
                            <button onClick={() => deleteUnit(u.id)} style={{
                              background: 'none', border: 'none', color: 'var(--danger)',
                              cursor: 'pointer', padding: 6, borderRadius: 6,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }} title={t('deleteUnit')}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LEASES TAB ── */}
      {tab === 'leases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 8, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 6, width: 'fit-content' }}>
            <button style={tabStyle(leasesView === 'interests')} onClick={() => setLeasesView('interests')}>
              {t('leaseSubtabInterests')}
            </button>
            <button style={tabStyle(leasesView === 'overview')} onClick={() => setLeasesView('overview')}>
              {t('leaseSubtabOverview')}
            </button>
            <button style={tabStyle(leasesView === 'review')} onClick={() => setLeasesView('review')}>
              {t('reviewPending')}
              {pendingCount > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--warning)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 10, lineHeight: '1.2' }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button style={tabStyle(leasesView === 'ledger')} onClick={() => setLeasesView('ledger')}>
              {t('leaseSubtabLedger')}
            </button>
          </div>

          {/* Create Lease */}
          <div className="glass-card" style={{ display: leasesView === 'overview' ? 'block' : 'none' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={16} style={{ color: 'var(--primary)' }} />{t('createLeaseTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="form-group">
                <label>{t('colProperty')}</label>
                <select className="form-select" value={leaseForm.unit_id} onChange={e => { const u = visibleUnits.find(x => x.id === e.target.value); setLeaseForm(f => ({ ...f, unit_id: e.target.value, tenant_id: '', monthly_rent: u ? String(u.rent) : f.monthly_rent })); }}>
                  <option value="">{t('selectUnit')}</option>
                  {visibleUnits.filter(u => u.status === 'available').map(u => { const c = communities.find(x => x.id === u.community_id); return <option key={u.id} value={u.id}>{c?.name} ({u.room_type})</option>; })}
                </select>
              </div>
              <div className="form-group">
                <label>{t('selectTenant')}</label>
                <select 
                  className="form-select" 
                  value={leaseForm.tenant_id} 
                  onChange={e => setLeaseForm(f => ({ ...f, tenant_id: e.target.value }))}
                >
                  <option value="">{t('selectTenant')}</option>
                  
                  {/* Group 1: Confirmed tenants for this unit */}
                  {(() => {
                    const confirmedInterests = interests.filter(i => i.unit_id === leaseForm.unit_id && i.status === 'confirmed');
                    if (confirmedInterests.length === 0) return null;
                    return (
                      <optgroup label={lang === 'zh' ? '📄 意向已确认的合租/整租人' : '📄 Confirmed Interested Tenants'}>
                        {confirmedInterests.map(i => (
                          <option key={i.user_id} value={i.user_id}>
                            {i.full_name || i.email || i.user_id.slice(0, 8)} ({i.email || i.phone || 'No Contact'})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })()}
                  
                  {/* Group 2: All registered users in the database */}
                  <optgroup label={lang === 'zh' ? '👥 所有注册的房客名单' : '👥 All Registered Tenants'}>
                    {allUsers
                      .filter(u => !adminIds.includes(u.id) && !interests.some(i => i.unit_id === leaseForm.unit_id && i.status === 'confirmed' && i.user_id === u.id))
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || (lang === 'zh' ? '未设置姓名' : 'Unnamed Tenant')} ({u.phone || 'No Phone'})
                        </option>
                      ))
                    }
                  </optgroup>
                </select>
              </div>
              <div className="form-group"><label>{t('monthlyRent')} (RM)</label><input type="number" className="form-input" value={leaseForm.monthly_rent} onChange={e => setLeaseForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
              <div className="form-group"><label>{t('startDate')}</label><input type="date" className="form-input" value={leaseForm.start_date} onChange={e => setLeaseForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div className="form-group"><label>{t('endDate')}</label><input type="date" className="form-input" value={leaseForm.end_date} onChange={e => setLeaseForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              <div className="form-group"><label>{t('securityDeposit')} ({t('months')})</label><input type="number" step="0.5" min="0" className="form-input" value={leaseForm.security_deposit_months} onChange={e => setLeaseForm(f => ({ ...f, security_deposit_months: e.target.value }))} /></div>
              <div className="form-group"><label>{t('utilityDeposit')} ({t('months')})</label><input type="number" step="0.5" min="0" className="form-input" value={leaseForm.utility_deposit_months} onChange={e => setLeaseForm(f => ({ ...f, utility_deposit_months: e.target.value }))} /></div>
            </div>
            <button className="btn btn-primary" onClick={createLease} style={{ marginTop: 4 }}>{t('createLeaseBtn')}</button>
          </div>

          {/* Pending Review Summary */}
          <div className="glass-card" style={{ display: leasesView === 'review' ? 'block' : 'none' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: 'var(--warning)' }} />
              {t('reviewPending')}
              {pendingCount > 0 && (
                <span style={{ background: 'var(--warning)', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{pendingCount}</span>
              )}
            </h3>
            {pendingCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: 12, opacity: 0.8 }} />
                <p style={{ margin: 0, fontSize: '0.88rem' }}>{t('noReviewPending')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
                {visibleLeases.flatMap(l =>
                  (l.payments || [])
                    .filter(p => p.status === 'pending_review' && p.evidence_url)
                    .map(p => {
                      const { unit, community } = resolveLeaseUnit(l, units, communities);
                      const propertyLabel = formatLeasePropertyLabel(unit, community, t('unknownUnit'));
                      return (
                        <div key={p.id} onClick={() => { setReviewingPayment(p); setAdminNote(''); }}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12, 
                            padding: '12px 16px', 
                            borderRadius: 12, 
                            background: 'var(--glass-bg)', 
                            border: '1px solid rgba(245,158,11,0.25)', 
                            cursor: 'pointer', 
                            transition: 'all 0.2s ease-in-out' 
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                            e.currentTarget.style.background = 'rgba(245,158,11,0.06)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.background = 'var(--glass-bg)';
                          }}
                        >
                          <img src={p.evidence_url!} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--glass-border)' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.tenantName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {propertyLabel}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtMonth(p.billing_month)}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent)' }}>RM {l.monthly_rent}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--warning)' }}></span>
                              {t('pendingReview')}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>

          {/* Tenant Interests */}
          {leasesView === 'interests' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={16} style={{ color: 'var(--primary)' }} />{t('tenantInterests')}
              </h3>
              {visibleInterests.filter(i => i.status !== 'left').length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontSize: '0.85rem' }}>{t('noInterests')}</p>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                {visibleInterests.filter(i => i.status !== 'left').map(i => {
                  const unit = units.find(u => u.id === i.unit_id);
                  const comm = unit ? communities.find(c => c.id === unit.community_id) : null;
                  return (
                    <div key={i.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
                      background: i.status === 'confirmed' ? 'rgba(22,163,74,0.06)' : 'rgba(255,255,255,0.04)',
                      border: i.status === 'confirmed' ? '1px solid rgba(22,163,74,0.2)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-h)' }}>
                          {i.full_name || i.email}
                          <span style={{ fontSize: '0.72rem', marginLeft: 8, padding: '1px 6px', borderRadius: 6,
                            background: i.status === 'confirmed' ? 'rgba(22,163,74,0.15)' : 'rgba(59,130,246,0.12)',
                            color: i.status === 'confirmed' ? '#16A34A' : 'var(--primary)',
                          }}>{i.status === 'confirmed' ? t('interestConfirmedLabel') : t('interestInterestedLabel')}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {comm?.name}{unit?.room_type ? ` · ${unit.room_type}` : ''} · {i.email}
                          {i.phone && ` · ${i.phone}`}
                        </div>
                        {i.note && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-body)', marginTop: 4, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                            📝 {i.note}
                          </div>
                        )}
                      </div>
                      {i.status === 'interested' && (
                        <button onClick={() => confirmInterest(i.id, i.unit_id)} style={{
                          padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--success)',
                          color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>{t('interestConfirm')}</button>
                      )}
                      <button onClick={() => removeInterest(i.id)} style={{
                        padding: '5px 12px', borderRadius: 6, border: '1px solid var(--danger)',
                        background: 'transparent', color: 'var(--danger)',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{t('interestRemove')}</button>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* Leases Table */}
          <div className="glass-card" style={{ display: (leasesView === 'overview' || leasesView === 'ledger') ? 'block' : 'none' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>
              {leasesView === 'overview' ? (lang === 'zh' ? '有效租约列表' : 'Active Leases List') : t('leaseSubtabLedger')}
            </h3>
            {visibleLeases.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>{t('noLeases')}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
            {visibleLeases.map(l => {
              const isExpanded = expandedLease === l.id;
              const { unit, community } = resolveLeaseUnit(l, units, communities);
              const propertyLabel = formatLeasePropertyLabel(unit, community, t('unknownUnit'));
              return (
                <div key={l.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', cursor: 'pointer', background: isExpanded ? 'var(--primary-light)' : 'var(--glass-bg)' }} onClick={() => setExpandedLease(isExpanded ? null : l.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>{l.tenantName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginTop: 3 }}>
                        {propertyLabel}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        RM {l.monthly_rent}/mo · {l.start_date} → {l.end_date}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {t('colDeposit')}: <strong style={{ color: 'var(--text-h)' }}>RM {l.deposit_amount?.toLocaleString()}</strong>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                      {isExpanded ? <><ChevronUp size={13} /> {t('hideLedger')}</> : <><ChevronDown size={13} /> {t('showLedger')}</>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteLease(l.id); }} style={{
                      background: 'none', border: 'none', color: 'var(--danger)',
                      cursor: 'pointer', padding: 6, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }} title={t('deleteLease')}>
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {isExpanded && l.payments && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-surface)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                        {[...(l.payments || [])].sort((a, b) => a.billing_month.localeCompare(b.billing_month)).map(p => {
                          const isPending = p.status === 'pending_review' && p.evidence_url;
                          const isRejected = p.status === 'rejected';
                          const cellBg = p.paid ? 'var(--success-light)' : isPending ? 'rgba(245,158,11,0.12)' : isRejected ? 'rgba(239,68,68,0.12)' : 'var(--danger-light)';
                          const cellBorder = p.paid ? 'var(--success)' : isPending ? 'var(--warning)' : isRejected ? 'var(--danger)' : 'var(--danger)';
                          return (
                            <div key={p.id} onClick={() => {
                              if (p.evidence_url) { setReviewingPayment(p); setAdminNote(p.admin_notes || ''); }
                              else togglePaid(p.id, p.paid);
                            }} className="ledger-cycle-cell"
                              style={{ background: cellBg, borderColor: cellBorder, cursor: 'pointer' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{fmtMonth(p.billing_month)}</div>
                              {p.paid
                                ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                                : isPending
                                  ? <Clock size={18} style={{ color: 'var(--warning)' }} />
                                  : isRejected
                                    ? <XCircle size={18} style={{ color: 'var(--danger)' }} />
                                    : <XCircle size={18} style={{ color: 'var(--danger)' }} />}
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: p.paid ? 'var(--success)' : isPending ? 'var(--warning)' : 'var(--danger)', marginTop: 2 }}>
                                {p.paid ? t('approved') : isPending ? t('pendingReview') : isRejected ? t('rejected') : t('unpaid')}
                              </div>
                              {isPending && <div style={{ fontSize: '0.58rem', color: 'var(--warning)', marginTop: 2 }}>{t('reviewClick')}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT SETTINGS TAB ── */}
      {tab === 'payment' && (
        <div className="glass-card" style={{ maxWidth: 600, margin: '20px auto' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={16} style={{ color: 'var(--primary)' }} />{t('paymentSettings')}
          </h3>
          
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('uploadQRHint')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, border: '2px dashed var(--glass-border)', padding: 24, borderRadius: 12 }}>
            {adminQR ? (
              <div style={{ position: 'relative', width: 220, height: 220, padding: 8, background: 'white', borderRadius: 12, border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={adminQR} alt="Payment QR" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                <button onClick={removeQR}
                  style={{ position: 'absolute', top: -10, right: -10, background: 'var(--danger)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div onClick={() => qrInputRef.current?.click()}
                style={{ width: 220, height: 220, borderRadius: 12, border: '2px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', background: 'var(--glass-bg)', gap: 8 }}>
                <QrCode size={40} style={{ opacity: 0.5, color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.78rem' }}>{t('uploadQR')}</span>
              </div>
            )}

            <input ref={qrInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleQRFile(e.target.files?.[0] || null)} />
            
            <button className="btn btn-secondary" onClick={() => qrInputRef.current?.click()}>
              {adminQR ? t('uploadQR') : t('uploadQR')}
            </button>
          </div>
        </div>
      )}

      {/* ── ADMINS TAB (super_admin only) ── */}
      {tab === 'admins' && adminRole === 'super_admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} style={{ color: 'var(--primary)' }} />管理员管理
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>（最多 5 人）</span>
              </h3>
              {adminList.length < 5 && (
                <button onClick={() => setShowAddAdmin(!showAddAdmin)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  borderRadius: 8, border: 'none', background: 'var(--primary)',
                  color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                }}>
                  <UserPlus size={14} /> 添加管理员
                </button>
              )}
            </div>

            {/* Add admin form */}
            {showAddAdmin && (
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>邮箱 *</label>
                    <input className="form-input" value={newAdmin.email} onChange={e => setNewAdmin(f => ({ ...f, email: e.target.value }))} placeholder="admin@gmail.com" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>显示名称</label>
                    <input className="form-input" value={newAdmin.display_name} onChange={e => setNewAdmin(f => ({ ...f, display_name: e.target.value }))} placeholder="张房东" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>电话</label>
                    <input className="form-input" value={newAdmin.phone} onChange={e => setNewAdmin(f => ({ ...f, phone: e.target.value }))} placeholder="+6012-345 6789" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>WhatsApp</label>
                    <input className="form-input" value={newAdmin.whatsapp} onChange={e => setNewAdmin(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+6012-345 6789" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>微信号</label>
                    <input className="form-input" value={newAdmin.wechat_id} onChange={e => setNewAdmin(f => ({ ...f, wechat_id: e.target.value }))} placeholder="wechat_id" />
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>电话、WhatsApp、微信号至少填一项</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddAdmin} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>确认添加</button>
                  <button onClick={() => setShowAddAdmin(false)} className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>取消</button>
                </div>
              </div>
            )}

            {/* Admin list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {adminList.map(admin => (
                <div key={admin.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#F0F6FF', fontSize: '0.9rem' }}>
                      {admin.display_name || admin.email}
                      {admin.role === 'super_admin' && (
                        <span style={{ fontSize: '0.65rem', marginLeft: 8, padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#FCD34D' }}>超级管理员</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7A99', marginTop: 4 }}>
                      {admin.email}
                      {admin.phone && ` · ${admin.phone}`}
                      {admin.whatsapp && ` · WA: ${admin.whatsapp}`}
                      {admin.wechat_id && ` · 微信: ${admin.wechat_id}`}
                    </div>
                  </div>
                  {admin.role !== 'super_admin' && (
                    <button onClick={() => handleDeleteAdmin(admin.id)} style={{
                      background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer',
                      padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center',
                    }} title="删除管理员">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FEEDBACK TAB (MAINTENANCE WORK ORDER CENTER) ── */}
      {tab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <MessageSquare size={16} style={{ color: 'var(--primary)' }} />{t('feedbackList')}
                {feedbackPendingCount > 0 && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 700 }}>
                    {feedbackPendingCount} {t('feedbackPending')}
                  </span>
                )}
              </h3>
            </div>

            {visibleFeedbacks.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: '0.85rem' }}>{t('feedbackNoItems')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visibleFeedbacks.map(f => {
                  const isClaimedByMe = f.assigned_to === currentUserId;
                  const isUnassigned = !f.assigned_to;
                  return (
                    <div key={f.id} style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(f.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>
                            {lang === 'zh' ? {
                              Aircon: '空调冷气',
                              Plumbing: '水管漏水',
                              Electrical: '电路照明',
                              Furniture: '家具五金',
                              Appliance: '家用电器',
                              Others: '其他问题'
                            }[f.category || 'Others'] : f.category}
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: f.status === 'resolved' ? 'var(--success-light)' : f.status === 'in_progress' ? 'var(--info-light)' : 'var(--warning-light)',
                            color: f.status === 'resolved' ? 'var(--success)' : f.status === 'in_progress' ? 'var(--info)' : 'var(--warning)',
                            fontWeight: 700
                          }}>
                            {f.status === 'resolved' ? t('feedbackResolved') : f.status === 'in_progress' ? t('feedbackStatusInProgress') : t('feedbackPending')}
                          </span>
                        </div>
                        <button onClick={() => deleteFeedback(f.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{f.content}</p>

                      {f.photo_url && (
                        <div style={{ marginBottom: 12 }}>
                          <a href={f.photo_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={f.photo_url}
                              alt="Evidence"
                              style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: 8, border: '1px solid var(--glass-border)', objectFit: 'cover', cursor: 'pointer' }}
                            />
                          </a>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {f.user_name || f.user_id.slice(0, 8)}
                        </span>
                        {f.unit_info && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {f.unit_info}
                          </span>
                        )}
                        {f.assigned_to && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: isClaimedByMe ? 'var(--success-light)' : 'rgba(255,255,255,0.06)', color: isClaimedByMe ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {isClaimedByMe ? (lang === 'zh' ? '由我处理中' : 'Assigned to Me') : (lang === 'zh' ? '由其他Agent处理中' : 'Assigned to Agent')}
                          </span>
                        )}
                      </div>

                      {/* Admin reply display */}
                      {f.admin_reply && (
                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--primary-light)', border: '1px solid var(--primary-glow)', marginBottom: 10 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>{t('feedbackReply')}：</span>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{f.admin_reply}</p>
                        </div>
                      )}

                      {/* Rating display if resolved */}
                      {f.status === 'resolved' && f.rating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'rgba(251,191,36,0.06)', padding: '6px 10px', borderRadius: 6, width: 'fit-content' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>{t('feedbackRating')}:</span>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                size={12}
                                fill={star <= (f.rating || 0) ? 'var(--accent)' : 'none'}
                                stroke={star <= (f.rating || 0) ? 'var(--accent)' : 'var(--text-muted)'}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Claim and Reply flows */}
                      {f.status !== 'resolved' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                          {isUnassigned ? (
                            <button onClick={() => claimFeedback(f.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--primary)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                              <User size={12} /> {t('feedbackClaim')}
                            </button>
                          ) : isClaimedByMe ? (
                            <>
                              <input
                                type="text"
                                className="form-input"
                                value={feedbackReply[f.id] || ''}
                                onChange={e => setFeedbackReply(prev => ({ ...prev, [f.id]: e.target.value }))}
                                placeholder={t('feedbackReplyPlaceholder')}
                                style={{ flex: 1, fontSize: '0.82rem', padding: '6px 10px' }}
                              />
                              <button onClick={() => replyFeedback(f.id)} disabled={!feedbackReply[f.id]?.trim()}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: 'none', background: feedbackReply[f.id]?.trim() ? 'var(--primary)' : 'var(--glass-border)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.78rem', cursor: feedbackReply[f.id]?.trim() ? 'pointer' : 'not-allowed' }}>
                                <Send size={12} /> {t('feedbackReply')}
                              </button>
                              <button onClick={() => resolveFeedback(f.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--success)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                                <CheckCircle2 size={12} /> {t('feedbackMarkResolved')}
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {lang === 'zh' ? '该工单已由其他 Agent 认领，您无法编辑' : 'This request is claimed by another agent and cannot be edited.'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          <div className="glass-card" style={{ width: '100%' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Edit3 size={18} style={{ color: 'var(--primary)' }} />
              {lang === 'zh' ? '中介个人主页与联系设置' : 'Agent Profile & Contact Settings'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              {lang === 'zh' 
                ? '此处填写的个人与中介信息（资质证书、从业经验、擅长区域等）将在学生端以专业中介主页形式展示，提升信任感。' 
                : 'The personal and agency information you enter here will be shown to students on your professional agent profile page.'}
            </p>

            {/* Section 1: Basic Info */}
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--primary)', marginBottom: 12 }}>
                {lang === 'zh' ? '1. 基本与联系信息' : '1. Basic & Contact Info'}
              </h4>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                <img 
                  src={myProfile.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nick'} 
                  alt="Avatar Preview" 
                  style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover', background: 'var(--bg-surface)' }}
                  onError={(e: any) => { e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nick'; }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: '0.78rem', display: 'block', fontWeight: 600 }}>
                    {lang === 'zh' ? '上传头像' : 'Upload Avatar'}
                  </label>
                  <input
                    id="admin-avatar-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await compressImageToDataUrl(file, {
                          maxWidth: 300,
                          maxHeight: 300,
                          quality: 0.82,
                          mimeType: 'image/jpeg',
                          skipBelowBytes: 40 * 1024
                        });
                        setMyProfile(prev => ({ ...prev, avatar_url: dataUrl }));
                      } catch (err) {
                        console.error('Avatar compression error:', err);
                        showToast(lang === 'zh' ? '头像上传失败，请换一张图片重试' : 'Avatar upload failed, please try another image', 'error');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <label
                    htmlFor="admin-avatar-upload"
                    className="btn"
                    style={{
                      width: 'fit-content',
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-body)',
                    }}
                  >
                    {lang === 'zh' ? '选择图片' : 'Choose Image'}
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>{lang === 'zh' ? '显示名称 / 姓名' : 'Display Name / Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={myProfile.display_name}
                    onChange={e => setMyProfile(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder={lang === 'zh' ? '例如: Nick Chan' : 'e.g. Nick Chan'}
                  />
                </div>

                <div className="form-group">
                  <label>{lang === 'zh' ? '职位头衔' : 'Job Title'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={myProfile.job_title}
                    onChange={e => setMyProfile(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder={lang === 'zh' ? '例如: Real Estate Negotiator' : 'e.g. Real Estate Negotiator'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div className="form-group">
                  <label>{lang === 'zh' ? '联系电话' : 'Contact Phone'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={myProfile.phone}
                    onChange={e => setMyProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+6012-345 6789"
                  />
                </div>

                <div className="form-group">
                  <label>{lang === 'zh' ? 'WhatsApp 号码' : 'WhatsApp Number'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={myProfile.whatsapp}
                    onChange={e => setMyProfile(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="60123456789"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div className="form-group">
                  <label>{lang === 'zh' ? '微信号 (WeChat ID)' : 'WeChat ID'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={myProfile.wechat_id}
                    onChange={e => setMyProfile(prev => ({ ...prev, wechat_id: e.target.value }))}
                    placeholder={lang === 'zh' ? '例如: NickChan88' : 'e.g. NickChan88'}
                  />
                </div>

                <div className="form-group">
                  <label>{lang === 'zh' ? '登录邮箱 (不可修改)' : 'Login Email (Read-only)'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={myProfile.email}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Agency Details */}
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--primary)', marginBottom: 12 }}>
                {lang === 'zh' ? '2. 所属代理公司信息' : '2. Real Estate Agency Info'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>{lang === 'zh' ? '公司名称' : 'Agency Company Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={myProfile.agency_name}
                    onChange={e => setMyProfile(prev => ({ ...prev, agency_name: e.target.value }))}
                    placeholder="VIVAHOMES REALTY SDN. BHD"
                  />
                </div>

                <div className="form-group">
                  <label>{lang === 'zh' ? '执照编号' : 'License / REN Number'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={myProfile.agency_license}
                    onChange={e => setMyProfile(prev => ({ ...prev, agency_license: e.target.value }))}
                    placeholder="E (1) 1670"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>{lang === 'zh' ? '公司地址' : 'Agency Office Address'}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={myProfile.agency_address}
                  onChange={e => setMyProfile(prev => ({ ...prev, agency_address: e.target.value }))}
                  placeholder={lang === 'zh' ? '公司完整的办公地址' : 'Full office address of the agency'}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Section 3: Bio & Expertise */}
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--primary)', marginBottom: 12 }}>
                {lang === 'zh' ? '3. 简介与擅长领域' : '3. About & Area Expertise'}
              </h4>
              
              <div className="form-group">
                <label>{lang === 'zh' ? '中介个人简介' : 'Bio / Biography'}</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={myProfile.bio}
                  onChange={e => setMyProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={lang === 'zh' ? '简单介绍您的租客服务特色，帮助学生建立信任。' : 'Introduce yourself and your specialization to students.'}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div className="form-group">
                  <label>{lang === 'zh' ? '从业年限 (年)' : 'Experience (Years)'}</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={myProfile.experience_years}
                    onChange={e => setMyProfile(prev => ({ ...prev, experience_years: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="form-group">
                  <label>{lang === 'zh' ? '从业年限 (月)' : 'Experience (Months)'}</label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    className="form-input"
                    value={myProfile.experience_months}
                    onChange={e => setMyProfile(prev => ({ ...prev, experience_months: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>{lang === 'zh' ? '擅长区域 (逗号分隔)' : 'Expertise Areas (comma separated)'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={myProfile.area_expertise}
                  onChange={e => setMyProfile(prev => ({ ...prev, area_expertise: e.target.value }))}
                  placeholder="Bandar Sunway, Subang Jaya, Petaling Jaya"
                />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>{lang === 'zh' ? '主营房源类型 (逗号分隔)' : 'Property Types (comma separated)'}</label>
                <input
                  type="text"
                  className="form-input"
                  value={myProfile.property_types}
                  onChange={e => setMyProfile(prev => ({ ...prev, property_types: e.target.value }))}
                  placeholder="Condo, Apartment, Room, Studio"
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSaveProfile}
              style={{ marginTop: 24, width: '100%', padding: '12px' }}
            >
              {lang === 'zh' ? '保存个人资料' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}
      </div>

      {/* ── Payment Review Modal ── */}
      {reviewingPayment && (
        <div className="modal-overlay" onClick={() => { setReviewingPayment(null); setAdminNote(''); }}>
          <div className="modal-content" style={{ width: 440, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setReviewingPayment(null); setAdminNote(''); }}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.05rem', marginBottom: 4, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={18} style={{ color: 'var(--primary)' }} />
              {t('reviewTitle')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              {t('reviewMonth')}：{fmtMonth(reviewingPayment.billing_month)}
              <span className="status-badge" style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                background: reviewingPayment.paid ? 'var(--success-light)' : reviewingPayment.status === 'rejected' ? 'var(--danger-light)' : 'rgba(245,158,11,0.12)',
                color: reviewingPayment.paid ? 'var(--success)' : reviewingPayment.status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
              }}>
                {reviewingPayment.paid ? t('approved') : reviewingPayment.status === 'rejected' ? t('rejected') : t('pendingReview')}
              </span>
            </p>

            {/* Evidence image */}
            {reviewingPayment.evidence_url ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: 16, cursor: 'pointer', background: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                onClick={() => setEvidencePreview(reviewingPayment.evidence_url!)}>
                <img src={reviewingPayment.evidence_url} alt="evidence" style={{ maxWidth: '100%', maxHeight: 'min(50vh, 420px)', width: 'auto', height: 'auto', display: 'block', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', borderRadius: 10, marginBottom: 16 }}>
                {t('reviewNoEvidence')}
              </div>
            )}

            {/* Admin notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('reviewNotes')}</label>
              <textarea className="form-textarea" rows={2} value={adminNote} onChange={e => setAdminNote(e.target.value)}
                placeholder={t('reviewNotesHint')}
                style={{ resize: 'vertical', fontSize: '0.85rem' }} />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => approvePayment(reviewingPayment.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--success)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                <CheckCircle2 size={16} /> {t('reviewApprove')}
              </button>
              <button onClick={() => rejectPayment(reviewingPayment.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--danger)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                <XCircle size={16} /> {t('reviewReject')}
              </button>
            </div>
            {reviewingPayment.evidence_url && (
              <button onClick={() => clearEvidence(reviewingPayment.id)}
                style={{ width: '100%', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                <Trash2 size={14} /> {t('clearEvidence')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Evidence Preview Lightbox */}
      {evidencePreview && (
        <div className="modal-overlay" onClick={() => setEvidencePreview(null)} style={{ zIndex: 400 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 'min(420px, 92vw)', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={evidencePreview} alt="凭证大图" style={{ maxWidth: 'min(420px, 92vw)', maxHeight: '85vh', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.6)', display: 'block' }} />
            <button onClick={() => setEvidencePreview(null)}
              style={{ position: 'absolute', top: -12, right: -12, background: 'var(--danger)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {previewOpen && (
        <div className="modal-overlay" onClick={() => setPreviewOpen(null)} style={{ zIndex: 400 }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={previewOpen} alt="preview" style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }} />
            <button onClick={() => setPreviewOpen(null)}
              style={{ position: 'absolute', top: -12, right: -12, background: 'var(--danger)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, pointerEvents: 'none',
          animation: 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 20px', borderRadius: 12,
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            minWidth: 280, maxWidth: '90vw',
            background:
              toast.type === 'error'   ? 'var(--danger)'  :
              toast.type === 'warning' ? '#d97706'        :
              '#059669',
            color: 'white',
          }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
              {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}
            </span>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </>
  );
}
