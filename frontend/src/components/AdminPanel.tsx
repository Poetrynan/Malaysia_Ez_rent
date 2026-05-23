'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building2, PlusCircle, FileText, ChevronDown, ChevronUp, CheckCircle2, XCircle, ImagePlus, Video, X, Image, QrCode, Users, Trash2, UserPlus, Clock, Eye } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

const ROOM_TYPES = ['Studio', 'Master Room', 'Medium Room', 'Small Room', 'Whole Unit'];

interface Community { id: string; name: string; address: string; lat: number; lng: number; }
interface Unit { id: string; community_id: string; unit_number: string; room_type: string; rent: number; status: string; description: string; }
interface Lease { id: string; unit_id: string; tenant_id: string; start_date: string; end_date: string; monthly_rent: number; deposit_amount: number; status: string; }
interface Payment { id: string; lease_id: string; billing_month: string; paid: boolean; paid_date?: string | null; evidence_url?: string | null; status?: string; admin_notes?: string; }
interface LeaseWithMeta extends Lease { unitData?: Unit; communityData?: Community; tenantName?: string; payments?: Payment[]; }

const MOCK_PLACES = [
  { name: 'Sunway Geo Residences', address: 'Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya', lat: 3.06341, lng: 101.60977 },
  { name: 'Nadayu 28 Residences', address: 'Jalan PJS 11/7, Bandar Sunway, 47500 Subang Jaya', lat: 3.0698, lng: 101.6040 },
  { name: "D'Latour Luxury Suites", address: "Jalan Taylors, Bandar Sunway, 47500 Subang Jaya", lat: 3.0593, lng: 101.6160 },
];

export default function AdminPanel({ adminRole }: { adminRole: 'super_admin' | 'editor' | null }) {
  const { t, lang } = useApp();
  const [tab, setTab] = useState<'properties' | 'leases' | 'payment' | 'admins'>('properties');
  const [adminQR, setAdminQR] = useState<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // ── Properties state ──
  const [communities, setCommunities] = useState<Community[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [communitySearch, setCommunitySearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [communityForm, setCommunityForm] = useState({ name: '', address: '', lat: '', lng: '' });
  const [unitForm, setUnitForm] = useState({ community_id: '', unit_number: '', room_type: 'Studio', rent: '', description: '' });
  // media: up to 9 images (base64) + 1 video (object URL)
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [mediaVideo, setMediaVideo] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  // ── Leases state ──
  const [leases, setLeases] = useState<LeaseWithMeta[]>([]);
  const [expandedLease, setExpandedLease] = useState<string | null>(null);
  const [leaseForm, setLeaseForm] = useState({ unit_id: '', tenant_phone: '', start_date: '', end_date: '', monthly_rent: '', deposit_amount: '' });

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
    showToast(t('reviewApproved'), 'success');
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
    showToast(t('rejected'), 'warning');
  };

  const pendingCount = leases.reduce((sum, l) => sum + (l.payments?.filter(p => p.status === 'pending_review').length || 0), 0);

  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    detectModeAndLoad();
    const savedQR = localStorage.getItem('ez_admin_qr_code');
    if (savedQR) setAdminQR(savedQR);
  }, []);

  const detectModeAndLoad = async () => {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLive(true);
        loadFromSupabase(supabase);
        return;
      }
    } catch {}
    setIsLive(false);
    loadFromLocalStorage();
  };

  const loadFromSupabase = async (supabase: any) => {
    try {
      const [commRes, unitRes, leaseRes, paymentRes, userRes] = await Promise.all([
        supabase.from('communities').select('*'),
        supabase.from('units').select('*'),
        supabase.from('leases').select('*'),
        supabase.from('payment_records').select('*'),
        supabase.from('users').select('id, full_name'),
      ]);
      const c: Community[] = commRes.data || [];
      const u: Unit[] = unitRes.data || [];
      const l: Lease[] = leaseRes.data || [];
      const p: Payment[] = paymentRes.data || [];
      const users: any[] = userRes.data || [];
      setCommunities(c);
      setUnits(u);
      setLeases(l.map(lease => ({
        ...lease,
        unitData: u.find(x => x.id === lease.unit_id),
        communityData: (() => { const un = u.find(x => x.id === lease.unit_id); return un ? c.find(x => x.id === un.community_id) : undefined; })(),
        tenantName: users.find(x => x.id === lease.tenant_id)?.full_name || lease.tenant_id,
        payments: p.filter(x => x.lease_id === lease.id),
      })));
    } catch (e) { console.error('Failed to load from Supabase:', e); }
  };

  const loadFromLocalStorage = () => {
    const c: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
    const u: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
    const l: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
    const p: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
    const users: any[] = JSON.parse(localStorage.getItem('ez_users') || '[]');
    setCommunities(c);
    setUnits(u);
    setLeases(l.map(lease => ({
      ...lease,
      unitData: u.find(x => x.id === lease.unit_id),
      communityData: (() => { const un = u.find(x => x.id === lease.unit_id); return un ? c.find(x => x.id === un.community_id) : undefined; })(),
      tenantName: users.find(x => x.id === lease.tenant_id)?.full_name || lease.tenant_id,
      payments: p.filter(x => x.lease_id === lease.id),
    })));
  };

  const loadAll = () => {
    if (isLive) {
      import('@/utils/supabase/client').then(({ createClient }) => {
        loadFromSupabase(createClient());
      });
    } else {
      loadFromLocalStorage();
    }
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
          if (status === window.google!.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
            setCommunityForm({
              name: place.name || s.main_text,
              address: place.formatted_address || s.description,
              lat: String(place.geometry.location.lat()),
              lng: String(place.geometry.location.lng())
            });
          }
        }
      );
    } else {
      setCommunityForm({
        name: s.main_text,
        address: s.secondary_text,
        lat: String(s.lat || 3.06341),
        lng: String(s.lng || 101.60977)
      });
    }
    setSuggestions([]);
  };

  const saveCommunity = () => {
    const errors: Record<string, boolean> = {};
    if (!communityForm.name.trim()) errors.name = true;
    if (!communityForm.address.trim()) errors.address = true;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast(t('validationCommunityRequired'), 'error');
      return;
    }
    setFieldErrors({});
    const list: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
    const newC: Community = { id: `c-${Date.now()}`, name: communityForm.name, address: communityForm.address, lat: parseFloat(communityForm.lat) || 3.06341, lng: parseFloat(communityForm.lng) || 101.60977 };
    localStorage.setItem('ez_communities', JSON.stringify([...list, newC]));
    setCommunityForm({ name: '', address: '', lat: '', lng: '' }); setCommunitySearch(''); loadAll();
    showToast(t('validationSaved'), 'success');
  };

  const saveUnit = () => {
    const errors: Record<string, boolean> = {};
    if (!unitForm.community_id) errors.community_id = true;
    if (!unitForm.unit_number.trim()) errors.unit_number = true;
    if (!unitForm.rent) errors.rent = true;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast(t('validationUnitRequired'), 'error');
      return;
    }
    setFieldErrors({});
    // Media reminder (non-blocking)
    if (mediaImages.length === 0 && !mediaVideo) {
      showToast(t('validationNoMedia'), 'warning');
    } else {
      showToast(t('validationSaved'), 'success');
    }
    const list: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
    const uid = `u-${Date.now()}`;
    const newU: Unit = { id: uid, community_id: unitForm.community_id, unit_number: unitForm.unit_number, room_type: unitForm.room_type, rent: parseFloat(unitForm.rent), status: 'available', description: unitForm.description };
    localStorage.setItem('ez_units', JSON.stringify([...list, newU]));
    // Persist media (images as base64, video as object URL — sandbox only)
    if (mediaImages.length > 0 || mediaVideo) {
      const allMedia = JSON.parse(localStorage.getItem('ez_unit_media') || '{}');
      allMedia[uid] = { images: mediaImages, video: mediaVideo };
      try { localStorage.setItem('ez_unit_media', JSON.stringify(allMedia)); } catch {}
    }
    setUnitForm({ community_id: '', unit_number: '', room_type: 'Studio', rent: '', description: '' });
    setMediaImages([]); setMediaVideo(null); loadAll();
  };

  const handleImgFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 9 - mediaImages.length;
    const toRead = Array.from(files).slice(0, remaining);
    toRead.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        setMediaImages(prev => prev.length < 9 ? [...prev, e.target?.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoFile = (file: File | null) => {
    if (!file) return;
    setMediaVideo(URL.createObjectURL(file));
  };

  const handleQRFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target?.result as string;
      setAdminQR(b64);
      localStorage.setItem('ez_admin_qr_code', b64);
    };
    reader.readAsDataURL(file);
  };

  const removeQR = () => {
    setAdminQR(null);
    localStorage.removeItem('ez_admin_qr_code');
  };

  const createLease = () => {
    if (!leaseForm.unit_id || !leaseForm.start_date || !leaseForm.end_date || !leaseForm.monthly_rent) return;
    const list: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
    const allP: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
    const newLease: Lease = { id: `l-${Date.now()}`, unit_id: leaseForm.unit_id, tenant_id: 'tenant-123', start_date: leaseForm.start_date, end_date: leaseForm.end_date, monthly_rent: parseFloat(leaseForm.monthly_rent), deposit_amount: parseFloat(leaseForm.deposit_amount) || parseFloat(leaseForm.monthly_rent) * 2, status: 'active' };
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
    setLeaseForm({ unit_id: '', tenant_phone: '', start_date: '', end_date: '', monthly_rent: '', deposit_amount: '' });
    loadAll();
  };

  const markPaid = async (paymentId: string) => {
    if (isLive) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        await supabase.from('payment_records').update({
          paid: true,
          paid_date: new Date().toISOString().split('T')[0],
          status: 'approved',
        }).eq('id', paymentId);
      } catch {}
    } else {
      const all: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const idx = all.findIndex(p => p.id === paymentId);
      if (idx !== -1) {
        all[idx].paid = true;
        all[idx].paid_date = new Date().toISOString().split('T')[0];
        all[idx].status = 'approved';
        localStorage.setItem('ez_payments', JSON.stringify(all));
      }
    }
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
      <div style={{ display: 'flex', gap: 4, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        <button style={tabStyle(tab === 'properties')} onClick={() => setTab('properties')}>
          <Building2 size={14} style={{ display: 'inline', marginRight: 6 }} />{t('adminProperties')}
        </button>
        <button style={tabStyle(tab === 'leases')} onClick={() => setTab('leases')}>
          <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />{t('adminLeases')}
          {pendingCount > 0 && (
            <span style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 10, lineHeight: '1.4' }}>
              {pendingCount}
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
      </div>

      {/* ── PROPERTIES TAB ── */}
      {tab === 'properties' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Add community */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={16} style={{ color: 'var(--primary)' }} />{t('addCommunityTitle')}
            </h3>
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
            <button className="btn btn-primary" onClick={saveCommunity} style={{ width: '100%', marginTop: 12 }}>{t('saveBtn')}</button>
          </div>

          {/* Add unit */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={16} style={{ color: 'var(--primary)' }} />{t('addUnitTitle')}
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
                {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t('doorNumber')}</label><input className="form-input" value={unitForm.unit_number} onChange={e => { setUnitForm(f => ({ ...f, unit_number: e.target.value })); clearError('unit_number'); }} placeholder={t('doorNumberPlaceholder')} style={fieldErrors.unit_number ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : undefined} /></div>
              <div className="form-group"><label>{t('roomType')}</label>
                <select className="form-select" value={unitForm.room_type} onChange={e => setUnitForm(f => ({ ...f, room_type: e.target.value }))}>
                  {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t('rentMYR')}</label><input type="number" className="form-input" value={unitForm.rent} onChange={e => { setUnitForm(f => ({ ...f, rent: e.target.value })); clearError('rent'); }} style={fieldErrors.rent ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : undefined} /></div>
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
                  onClick={() => vidInputRef.current?.click()}>
                  <Video size={14} /> {t('uploadVideo')} {mediaVideo ? '✓' : ''}
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

            <button className="btn btn-primary" onClick={saveUnit} style={{ width: '100%', marginTop: 8 }}>{t('saveBtn')}</button>
          </div>

          {/* Inventory Table */}
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>{t('inventoryTitle')}</h3>
            <div className="data-table-container">
              <table className="data-table">
                <thead><tr>
                  <th>{t('colCommunity')}</th><th>{t('colUnit')}</th>
                  <th>{t('colType')}</th><th>{t('colRent')}</th><th>{t('colStatus')}</th>
                  <th style={{ textAlign: 'center' }}>媒体</th>
                </tr></thead>
                <tbody>
                  {units.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>{t('noUnits')}</td></tr>}
                  {units.map(u => {
                    const c = communities.find(x => x.id === u.community_id);
                    const savedMedia = JSON.parse(localStorage.getItem('ez_unit_media') || '{}');
                    const unitMedia = savedMedia[u.id];
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{c?.name || '—'}</td>
                        <td>{u.unit_number}</td><td>{u.room_type}</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 600 }}>RM {u.rent.toLocaleString()}</td>
                        <td><span className={`status-badge ${u.status}`}>{u.status === 'available' ? t('statusAvailable') : t('statusRented')}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          {unitMedia?.images?.length > 0 ? (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
                              <img src={unitMedia.images[0]} alt="" style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                              {unitMedia.images.length > 1 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{unitMedia.images.length - 1}</span>}
                              {unitMedia.video && <Video size={13} style={{ color: 'var(--primary)' }} />}
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>}
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
          {/* Create Lease */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={16} style={{ color: 'var(--primary)' }} />{t('createLeaseTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="form-group">
                <label>{t('colProperty')}</label>
                <select className="form-select" value={leaseForm.unit_id} onChange={e => { const u = units.find(x => x.id === e.target.value); setLeaseForm(f => ({ ...f, unit_id: e.target.value, monthly_rent: u ? String(u.rent) : f.monthly_rent, deposit_amount: u ? String(u.rent * 2) : f.deposit_amount })); }}>
                  <option value="">{t('selectUnit')}</option>
                  {units.filter(u => u.status === 'available').map(u => { const c = communities.find(x => x.id === u.community_id); return <option key={u.id} value={u.id}>{c?.name} · {u.unit_number} ({u.room_type})</option>; })}
                </select>
              </div>
              <div className="form-group"><label>{t('tenantPhone')}</label><input className="form-input" value={leaseForm.tenant_phone} onChange={e => setLeaseForm(f => ({ ...f, tenant_phone: e.target.value }))} placeholder="+601x-xxx-xxxx" /></div>
              <div className="form-group"><label>{t('monthlyRent')} (RM)</label><input type="number" className="form-input" value={leaseForm.monthly_rent} onChange={e => setLeaseForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
              <div className="form-group"><label>{t('startDate')}</label><input type="date" className="form-input" value={leaseForm.start_date} onChange={e => setLeaseForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div className="form-group"><label>{t('endDate')}</label><input type="date" className="form-input" value={leaseForm.end_date} onChange={e => setLeaseForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              <div className="form-group"><label>{t('depositEscrow')} (RM)</label><input type="number" className="form-input" value={leaseForm.deposit_amount} onChange={e => setLeaseForm(f => ({ ...f, deposit_amount: e.target.value }))} /></div>
            </div>
            <button className="btn btn-primary" onClick={createLease} style={{ marginTop: 4 }}>{t('createLeaseBtn')}</button>
          </div>

          {/* Pending Review Summary */}
          <div className="glass-card" style={{ border: '1px solid var(--warning)', background: 'rgba(245,158,11,0.06)' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: 'var(--warning)' }} />
              {t('reviewPending')}
              {pendingCount > 0 && (
                <span style={{ background: 'var(--warning)', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{pendingCount}</span>
              )}
            </h3>
            {pendingCount === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16, fontSize: '0.85rem' }}>
                {t('noReviewPending')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leases.map(l =>
                  (l.payments || [])
                    .filter(p => p.status === 'pending_review' && p.evidence_url)
                    .map(p => (
                      <div key={p.id} onClick={() => { setReviewingPayment(p); setAdminNote(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      >
                        <img src={p.evidence_url!} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--glass-border)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-h)' }}>{l.tenantName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.communityData?.name} · {l.unitData?.unit_number} · {fmtMonth(p.billing_month)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent)' }}>RM {l.monthly_rent}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--warning)', fontWeight: 600 }}>{t('pendingReview')}</div>
                        </div>
                        <Eye size={16} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))
                )}
              </div>
            )}
          </div>

          {/* Leases Table */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>{t('leasesTitle')}</h3>
            {leases.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>{t('noLeases')}</p>}
            {leases.map(l => {
              const isExpanded = expandedLease === l.id;
              return (
                <div key={l.id} style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', cursor: 'pointer', background: isExpanded ? 'var(--primary-light)' : 'var(--glass-bg)' }} onClick={() => setExpandedLease(isExpanded ? null : l.id)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>{l.tenantName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {l.communityData?.name} · {l.unitData?.unit_number} · RM {l.monthly_rent}/mo · {l.start_date} → {l.end_date}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {t('colDeposit')}: <strong style={{ color: 'var(--text-h)' }}>RM {l.deposit_amount?.toLocaleString()}</strong>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                      {isExpanded ? <><ChevronUp size={13} /> {t('hideLedger')}</> : <><ChevronDown size={13} /> {t('showLedger')}</>}
                    </button>
                  </div>

                  {isExpanded && l.payments && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-surface)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                        {l.payments.map(p => {
                          const isPending = p.status === 'pending_review' && p.evidence_url;
                          const isRejected = p.status === 'rejected';
                          const cellBg = p.paid ? 'var(--success-light)' : isPending ? 'rgba(245,158,11,0.12)' : isRejected ? 'rgba(239,68,68,0.12)' : 'var(--danger-light)';
                          const cellBorder = p.paid ? 'var(--success)' : isPending ? 'var(--warning)' : isRejected ? 'var(--danger)' : 'var(--danger)';
                          return (
                            <div key={p.id} onClick={() => {
                              if (isPending) { setReviewingPayment(p); setAdminNote(''); }
                              else if (!p.paid) markPaid(p.id);
                            }} className="ledger-cycle-cell"
                              style={{ background: cellBg, borderColor: cellBorder, cursor: p.paid ? 'default' : 'pointer' }}>
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
                <img src={adminQR} alt="DuitNow QR" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
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
      </div>

      {/* ── Payment Review Modal ── */}
      {reviewingPayment && (
        <div className="modal-overlay" onClick={() => { setReviewingPayment(null); setAdminNote(''); }}>
          <div className="modal-content" style={{ width: 440, textAlign: 'left', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setReviewingPayment(null); setAdminNote(''); }}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.05rem', marginBottom: 4, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={18} style={{ color: 'var(--primary)' }} />
              {t('reviewTitle')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              {t('reviewMonth')}：{fmtMonth(reviewingPayment.billing_month)}
            </p>

            {/* Evidence image */}
            {reviewingPayment.evidence_url ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: 16, cursor: 'pointer' }}
                onClick={() => setEvidencePreview(reviewingPayment.evidence_url!)}>
                <img src={reviewingPayment.evidence_url} alt="evidence" style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'contain', background: '#f5f5f5' }} />
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
          </div>
        </div>
      )}

      {/* Evidence Preview Lightbox */}
      {evidencePreview && (
        <div className="modal-overlay" onClick={() => setEvidencePreview(null)} style={{ zIndex: 400 }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={evidencePreview} alt="凭证大图" style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }} />
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
