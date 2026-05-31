'use client';

import React, { useState, useEffect } from 'react';
import { Home, Calendar, CreditCard, AlertCircle, TrendingUp, Clock, MessageSquare, X, Send, User, Save, ChevronDown, ChevronUp, Camera, Users, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import LeaseLedgerCard from './LeaseLedgerCard';
import { useApp } from '@/lib/ThemeProvider';
import { isMockDatabase } from '@/lib/supabase';

interface Lease {
  id: string; unit_id: string; lease_group_id?: string; tenant_id: string;
  start_date: string; end_date: string;
  monthly_rent: number; deposit_amount: number;
  security_deposit_months?: number; utility_deposit_months?: number;
  status: string;
  admin_notes?: string;
}
interface Payment {
  id: string; lease_id: string; billing_month: string;
  paid: boolean; paid_date?: string | null; evidence_url?: string | null; status?: string; admin_notes?: string;
}
interface Unit { id: string; community_id: string; room_type: string; status?: string; agent_id?: string | null; landlord_qr_code?: string | null; landlord_bank_info?: string | null; }
interface Community { id: string; name: string; }

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

export default function StudentPortal({ 
  mode = 'lease', 
  onUnreadFeedbackCountChange 
}: { 
  mode?: 'lease' | 'maintenance' | 'profile'; 
  onUnreadFeedbackCountChange?: (count: number) => void 
}) {
  const { t, lang } = useApp();
  const [interest, setInterest] = useState<any | null>(null);
  const [interestUnit, setInterestUnit] = useState<Unit | null>(null);
  const [interestCommunity, setInterestCommunity] = useState<Community | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [lease, setLease] = useState<Lease | null>(null);
  const [roommates, setRoommates] = useState<{ id: string; tenant_id: string; tenantName: string; status: string; start_date: string; end_date: string; }[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('Aircon');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<{
    id: string;
    content: string;
    status: string;
    replies?: Array<{ role: 'agent' | 'student'; content: string; at: string }>;
    created_at: string;
    category?: string;
    photo_url?: string | null;
    assigned_to?: string | null;
    unit_info?: string;
  }[]>([]);
  const [studentReply, setStudentReply] = useState<Record<string, string>>({});
  const [showMyFeedbacks, setShowMyFeedbacks] = useState(mode === 'maintenance');
  const [feedbackUnreadCount, setFeedbackUnreadCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileUnit, setProfileUnit] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const profileComplete = profileName.trim().length > 0 && profileUnit.trim().length > 0;
  const [profilePassport, setProfilePassport] = useState('');
  const [profileSchool, setProfileSchool] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileLocalId, setProfileLocalId] = useState('');
  const [profileDocUrl, setProfileDocUrl] = useState<string | null>(null);
  const [profileDocBase64, setProfileDocBase64] = useState<string | null>(null);
  const [profileDocUploading, setProfileDocUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [terminateSubmitting, setTerminateSubmitting] = useState(false);

  const handleTerminateLease = async () => {
    if (!lease?.id) return;
    setTerminateSubmitting(true);
    if (isMockDatabase) {
      const leases: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const idx = leases.findIndex(l => l.id === lease.id);
      if (idx !== -1) {
        leases[idx].status = 'terminated';
        leases[idx].admin_notes = ((leases[idx].admin_notes || '') + '\n' + `[${new Date().toISOString().split('T')[0]}] Terminated by tenant.`).trim();
        localStorage.setItem('ez_leases', JSON.stringify(leases));
        
        // Also mark the unit as available again in mock mode
        const units: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
        const uIdx = units.findIndex(u => u.id === lease.unit_id);
        if (uIdx !== -1) {
          units[uIdx].status = 'available';
          localStorage.setItem('ez_units', JSON.stringify(units));
        }

        // Also update tenant_interests to 'left' in mock mode
        const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
        const interests = JSON.parse(localStorage.getItem('ez_interests') || '[]');
        const iIdx = interests.findIndex((i: any) => i.unit_id === lease.unit_id && i.user_id === tenantId);
        if (iIdx !== -1) {
          interests[iIdx].status = 'left';
          localStorage.setItem('ez_interests', JSON.stringify(interests));
        }
      }
      setTimeout(() => {
        setLease(null);
        setPayments([]);
        setUnit(null);
        setCommunity(null);
        setRoommates([]);
        setTerminateSubmitting(false);
        setShowTerminateConfirm(false);
      }, 300);
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        
        // Use the secure RPC backend function instead of a direct UPDATE.
        const { error } = await supabase.rpc('tenant_terminate_lease', {
          p_lease_id: lease.id
        });
        
        if (error) throw error;
        
        // Instant state clearing for optimistic UI update
        setLease(null);
        setPayments([]);
        setUnit(null);
        setCommunity(null);
        setRoommates([]);
        setTerminateSubmitting(false);
        setShowTerminateConfirm(false);
      } catch (e) {
        console.error('Terminate lease error:', e);
        setTerminateSubmitting(false);
      }
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      try {
        const { compressDataUrl } = await import('@/utils/compressImage');
        const compressedBlob = await compressDataUrl(dataUrl, { maxWidth: 1080, maxHeight: 1080, quality: 0.8 });
        const compressedReader = new FileReader();
        compressedReader.onloadend = () => {
          setPhotoBase64(compressedReader.result as string);
        };
        compressedReader.readAsDataURL(compressedBlob);
      } catch (err) {
        console.error('Image compression failed:', err);
        setPhotoBase64(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      try {
        const { compressDataUrl } = await import('@/utils/compressImage');
        const compressedBlob = await compressDataUrl(dataUrl, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 });
        const compressedReader = new FileReader();
        compressedReader.onloadend = () => {
          setProfileDocBase64(compressedReader.result as string);
        };
        compressedReader.readAsDataURL(compressedBlob);
      } catch (err) {
        console.error('Document compression failed:', err);
        setProfileDocBase64(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadProfile = async () => {
    let name = '';
    if (isMockDatabase) {
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
      const u = users.find((u: any) => u.id === tenantId);
      if (u) {
        name = u.full_name || '';
        setProfileName(name);
        setProfilePhone(u.phone || '');
        setProfileUnit(u.unit_number || '');
        setProfilePassport(u.passport_number || '');
        setProfileSchool(u.school || '');
        setProfileCompany(u.company || '');
        setProfileLocalId(u.local_id_number || '');
        setProfileDocUrl(u.document_url || null);
      }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('users').select('full_name, phone, unit_number, passport_number, school, company, local_id_number, document_url').eq('id', user.id).single();
        if (data) {
          name = data.full_name || '';
          setProfileName(name);
          setProfilePhone(data.phone || '');
          setProfileUnit(data.unit_number || '');
          setProfilePassport(data.passport_number || '');
          setProfileSchool(data.school || '');
          setProfileCompany(data.company || '');
          setProfileLocalId(data.local_id_number || '');
          setProfileDocUrl(data.document_url || null);
        }
      } catch (e) { console.error('Load profile error:', e); }
    }
    if (!name) setShowProfile(true);
  };

  const saveProfile = async () => {
    if (!profileName.trim()) return;
    setProfileSaving(true);

    // Upload document if new one selected
    let docUrl = profileDocUrl;
    if (profileDocBase64 && !isMockDatabase) {
      setProfileDocUploading(true);
      try {
        const { compressDataUrl } = await import('@/utils/compressImage');
        const blob = await compressDataUrl(profileDocBase64, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 });
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const path = `documents/${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from('unit-media').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (!uploadErr) {
          const { data } = supabase.storage.from('unit-media').getPublicUrl(path);
          docUrl = data?.publicUrl || null;
        }
      } catch (e) { console.error('Document upload error:', e); }
      setProfileDocUploading(false);
    } else if (profileDocBase64 && isMockDatabase) {
      docUrl = profileDocBase64;
    }

    const profileData: Record<string, string | null> = {
      full_name: profileName.trim(),
      phone: profilePhone.trim(),
      unit_number: profileUnit.trim(),
      passport_number: profilePassport.trim() || null,
      school: profileSchool.trim() || null,
      company: profileCompany.trim() || null,
      local_id_number: profileLocalId.trim() || null,
      document_url: docUrl,
    };

    if (isMockDatabase) {
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
      const idx = users.findIndex((u: any) => u.id === tenantId);
      if (idx !== -1) {
        Object.assign(users[idx], profileData);
      } else {
        users.push({ id: tenantId, ...profileData });
      }
      localStorage.setItem('ez_users', JSON.stringify(users));
      if (profileDocBase64) setProfileDocUrl(profileDocBase64);
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setProfileSaving(false); return; }
        const { error } = await supabase.from('users').upsert({ id: user.id, ...profileData });
        if (error) { console.error('Save profile error:', error); setProfileSaving(false); return; }
        if (docUrl) setProfileDocUrl(docUrl);
      } catch (e) { console.error('Save profile error:', e); setProfileSaving(false); return; }
    }
    setProfileSaving(false);
    setProfileSaved(true);
    setProfileDocBase64(null);
    setTimeout(() => setProfileSaved(false), 3000);
    window.dispatchEvent(new Event('ez_profile_updated'));
    setToastMsg(lang === 'zh' ? '个人信息已保存' : 'Profile saved');
    setToastType('success');
    setTimeout(() => setToastMsg(null), 2500);
  };

  const load = async () => {
    if (isMockDatabase) {
      const leases: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const allPayments: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const units: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
      const communities: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const myLease = leases.find(l => l.tenant_id === tenantId && l.status === 'active') || null;
      setLease(myLease);
      if (myLease) {
        setPayments(
          allPayments
            .filter(p => p.lease_id === myLease.id)
            .sort((a, b) => a.billing_month.localeCompare(b.billing_month))
        );
        const u = units.find(u => u.id === myLease.unit_id) || null;
        setUnit(u);
        if (u) setCommunity(communities.find(c => c.id === u.community_id) || null);

        // Fetch roommates if lease_group_id is set
        if (myLease.lease_group_id) {
          const groupLeases = leases.filter(l => l.lease_group_id === myLease.lease_group_id && l.id !== myLease.id);
          const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
          setRoommates(groupLeases.map(gl => ({
            id: gl.id,
            tenant_id: gl.tenant_id,
            tenantName: users.find((x: any) => x.id === gl.tenant_id)?.full_name || gl.tenant_id,
            status: gl.status,
            start_date: gl.start_date,
            end_date: gl.end_date
          })));
        } else {
          setRoommates([]);
        }
        setInterest(null);
        setInterestUnit(null);
        setInterestCommunity(null);
      } else {
        const allInterests = JSON.parse(localStorage.getItem('ez_interests') || '[]');
        const mine = allInterests.find((i: any) => i.user_id === tenantId && i.status !== 'left');
        if (mine) {
          setInterest(mine);
          const u = units.find(x => x.id === mine.unit_id) || null;
          setInterestUnit(u);
          if (u) setInterestCommunity(communities.find(c => c.id === u.community_id) || null);
        } else {
          setInterest(null);
          setInterestUnit(null);
          setInterestCommunity(null);
        }
      }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const [leaseRes, interestRes] = await Promise.all([
          supabase
            .from('leases')
            .select('*')
            .eq('tenant_id', user.id)
            .eq('status', 'active')
            .maybeSingle(),
          supabase
            .from('tenant_interests')
            .select(`
              *,
              units (
                id,
                community_id,
                room_type,
                communities (
                  id,
                  name
                )
              )
            `)
            .eq('user_id', user.id)
            .neq('status', 'left')
            .maybeSingle()
        ]);

        const leaseData = leaseRes.data;
        const interestData = interestRes.data;

        if (leaseData) {
          setLease(leaseData);
          setInterest(null);
          setInterestUnit(null);
          setInterestCommunity(null);
          const [payRes, unitRes] = await Promise.all([
            supabase
              .from('payment_records')
              .select('*')
              .eq('lease_id', leaseData.id)
              .order('billing_month', { ascending: true }),
            supabase.from('units').select('id, community_id, room_type, agent_id, landlord_qr_code, landlord_bank_info').eq('id', leaseData.unit_id).single(),
          ]);
          setPayments(payRes.data || []);
          if (unitRes.data) {
            setUnit(unitRes.data);
            const { data: commData } = await supabase.from('communities').select('id, name').eq('id', unitRes.data.community_id).single();
            if (commData) setCommunity(commData);
          }

          // Fetch roommates in live mode
          if (leaseData.lease_group_id) {
            const { data: groupLeases } = await supabase
              .from('leases')
              .select('id, tenant_id, status, start_date, end_date')
              .eq('lease_group_id', leaseData.lease_group_id)
              .neq('id', leaseData.id);
            
            if (groupLeases && groupLeases.length > 0) {
              const tenantIds = groupLeases.map(gl => gl.tenant_id);
              const { data: usersData } = await supabase
                .from('users')
                .select('id, full_name')
                .in('id', tenantIds);
              
              setRoommates(groupLeases.map(gl => ({
                id: gl.id,
                tenant_id: gl.tenant_id,
                tenantName: usersData?.find(x => x.id === gl.tenant_id)?.full_name || gl.tenant_id,
                status: gl.status,
                start_date: gl.start_date,
                end_date: gl.end_date
              })));
            } else {
              setRoommates([]);
            }
          } else {
            setRoommates([]);
          }
        } else {
          // Explicitly clear state if no active lease exists
          setLease(null);
          setPayments([]);
          setUnit(null);
          setCommunity(null);
          setRoommates([]);

          if (interestData) {
            setInterest(interestData);
            if (interestData.units) {
              const uObj = interestData.units;
              setInterestUnit({
                id: uObj.id,
                community_id: uObj.community_id,
                room_type: uObj.room_type
              });
              if (uObj.communities) {
                setInterestCommunity({
                  id: uObj.communities.id,
                  name: uObj.communities.name
                });
              } else {
                setInterestCommunity(null);
              }
            } else {
              setInterestUnit(null);
              setInterestCommunity(null);
            }
          } else {
            setInterest(null);
            setInterestUnit(null);
            setInterestCommunity(null);
          }
        }
      } catch (e) {
        console.error('StudentPortal load error:', e);
        setLease(null);
        setPayments([]);
        setUnit(null);
        setCommunity(null);
        setRoommates([]);
      }
    }
    await loadMyFeedbacks();
    setLoading(false);
  };

  const loadMyFeedbacks = async () => {
    let listToCount: any[] = [];
    if (isMockDatabase) {
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const myRaw = all.filter((f: any) => f.user_id === tenantId);
      
      const leasesData = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const unitsData = JSON.parse(localStorage.getItem('ez_units') || '[]');
      const communitiesData = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      const usersData = JSON.parse(localStorage.getItem('ez_users') || '[]');
      const u = usersData.find((x: any) => x.id === tenantId);

      const enriched = myRaw.map((f: any) => {
        const lease = leasesData.find((l: any) => l.id === f.lease_id) || leasesData.find((l: any) => l.tenant_id === f.user_id && l.status === 'active');
        let unitInfo = '';
        if (lease) {
          const unit = unitsData.find((un: any) => un.id === lease.unit_id);
          if (unit) {
            const comm = communitiesData.find((c: any) => c.id === unit.community_id);
            const parts = [comm?.name, unit.room_type, u?.unit_number || unit.unit_number].filter(Boolean);
            if (parts.length) unitInfo = parts.join(' · ');
          }
        }
        if (!unitInfo && u?.unit_number) {
          unitInfo = u.unit_number;
        }
        return { ...f, replies: f.replies || [], unit_info: unitInfo || undefined };
      });
      setMyFeedbacks(enriched);
      listToCount = enriched;
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('maintenance_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) {
          // Load user details
          const { data: u } = await supabase.from('users').select('unit_number').eq('id', user.id).maybeSingle();

          // Load lease chain for unit_info (community + room type)
          const leaseIds = [...new Set(data.map((f: any) => f.lease_id).filter(Boolean))];
          const { getLeaseEnrichmentData } = await import('@/app/actions/leaseEnrichment');
          const res = await getLeaseEnrichmentData(leaseIds, [user.id]);

          const leaseByIdMap = new Map<string, any>();
          let activeLease: any = null;
          const unitMap = new Map<string, any>();
          const commMap = new Map<string, any>();

          if (res.success) {
            const allLeases = res.leases || [];
            allLeases.forEach((l: any) => {
              leaseByIdMap.set(l.id, l);
              if (l.status === 'active') activeLease = l;
            });
            (res.units || []).forEach((un: any) => unitMap.set(un.id, un));
            (res.communities || []).forEach((c: any) => commMap.set(c.id, c));
          } else {
            console.error('Lease enrichment server action failed:', res.error);
          }

          const normalized = data.map((f: any) => {
            let replies = f.replies;
            if (!replies && f.admin_reply) {
              replies = [{ role: 'agent', content: f.admin_reply, at: f.resolved_at || f.updated_at || f.created_at }];
            }

            // Resolve unit_info from lease chain
            const lease = leaseByIdMap.get(f.lease_id) || activeLease;
            let unitInfo = '';
            if (lease) {
              const unit = unitMap.get(lease.unit_id);
              if (unit) {
                const comm = commMap.get(unit.community_id);
                const parts = [comm?.name, unit.room_type, u?.unit_number || unit.unit_number].filter(Boolean);
                if (parts.length) unitInfo = parts.join(' · ');
              }
            }
            if (!unitInfo && u?.unit_number) {
              unitInfo = u.unit_number;
            }

            return { ...f, replies: replies || [], unit_info: unitInfo || undefined };
          });
          setMyFeedbacks(normalized);
          listToCount = normalized;
        }
      } catch (e) { console.error('Load feedback error:', e); }
    }
    // Check for unseen agent replies
    const lastSeen = parseInt(localStorage.getItem('ez_feedback_last_seen') || '0', 10);
    const unreadCount = (listToCount || []).filter((f: any) => {
      if (!f.replies || f.replies.length === 0) return false;
      const lastReply = f.replies[f.replies.length - 1];
      return lastReply.role === 'agent' && new Date(lastReply.at).getTime() > lastSeen;
    }).length;
    setFeedbackUnreadCount(unreadCount);
    if (onUnreadFeedbackCountChange) {
      onUnreadFeedbackCountChange(unreadCount);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    if (!profileComplete) { setShowProfile(true); return; }
    setFeedbackSubmitting(true);

    let photoUrl = null;
    if (photoBase64 && !isMockDatabase) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const res = await fetch(photoBase64);
        const blob = await res.blob();
        const path = `evidence/maintenance_${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from('unit-media').upload(path, blob, {
          upsert: true,
          contentType: 'image/jpeg'
        });
        if (!uploadErr) {
          const { data } = supabase.storage.from('unit-media').getPublicUrl(path);
          photoUrl = data?.publicUrl || null;
        } else {
          console.error('Photo upload error:', uploadErr);
        }
      } catch (e) {
        console.error('Upload photo failed:', e);
      }
    }

    if (isMockDatabase) {
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      all.unshift({
        id: `fb-${Date.now()}`,
        user_id: tenantId,
        lease_id: lease?.id || null,
        category: feedbackCategory,
        content: feedbackText.trim(),
        photo_url: photoBase64,
        status: 'pending',
        replies: [],
        assigned_to: null,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('ez_feedback', JSON.stringify(all));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('maintenance_requests').insert({
          user_id: user.id,
          lease_id: lease?.id || null,
          category: feedbackCategory,
          content: feedbackText.trim(),
          photo_url: photoUrl,
          status: 'pending'
        });
        if (error) { 
          console.error('Submit feedback error:', error); 
          setFeedbackSubmitting(false); 
          setToastMsg(lang === 'zh' ? '提交工单失败' : 'Failed to submit feedback');
          setToastType('error');
          setTimeout(() => setToastMsg(null), 2500);
          return; 
        }
      } catch (e) { 
        console.error('Submit feedback error:', e); 
        setFeedbackSubmitting(false); 
        setToastMsg(lang === 'zh' ? '提交工单失败' : 'Failed to submit feedback');
        setToastType('error');
        setTimeout(() => setToastMsg(null), 2500);
        return; 
      }
    }
    setFeedbackText('');
    setPhotoBase64(null);
    setFeedbackSubmitting(false);
    setToastMsg(t('feedbackSuccess'));
    setToastType('success');
    setTimeout(() => setToastMsg(null), 2500);
    loadMyFeedbacks();
  };

  const sendStudentReply = async (id: string) => {
    const reply = studentReply[id]?.trim();
    if (!reply) return;
    const newEntry = { role: 'student' as const, content: reply, at: new Date().toISOString() };
    if (isMockDatabase) {
      const all = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      const idx = all.findIndex((f: any) => f.id === id);
      if (idx !== -1) {
        if (!all[idx].replies) all[idx].replies = [];
        all[idx].replies.push(newEntry);
        localStorage.setItem('ez_feedback', JSON.stringify(all));
        loadMyFeedbacks();
      }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: existing, error: selErr } = await supabase.from('maintenance_requests').select('replies').eq('id', id).single();
        if (selErr) {
          // replies column doesn't exist yet (migration 024 not applied)
          console.warn('replies column not available, student reply requires migration 024');
        } else {
          const updated = [...(existing?.replies || []), newEntry];
          await supabase.from('maintenance_requests').update({ replies: updated }).eq('id', id);
          loadMyFeedbacks();
        }
      } catch (e) {
        console.error('Student reply error:', e);
      }
    }
    setStudentReply(prev => { const n = { ...prev }; delete n[id]; return n; });
  };


  const cancelMyInterest = async (interestId: string, unitId: string) => {
    setShowCancelConfirm(true);
  };

  const confirmCancelInterest = async () => {
    if (!interest) return;
    setCancelSubmitting(true);
    if (isMockDatabase) {
      const all: any[] = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      const updated = all.filter(i => !(i.unit_id === interest.unit_id && i.user_id === 'tenant-123'));
      localStorage.setItem('ez_interests', JSON.stringify(updated));
      setInterest(null);
      setInterestUnit(null);
      setInterestCommunity(null);
      setCancelSubmitting(false);
      setShowCancelConfirm(false);
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { error } = await supabase.rpc('cancel_tenant_interest', { p_unit_id: interest.unit_id });
        if (error) {
          const { error: updErr } = await supabase
            .from('tenant_interests')
            .update({ status: 'left' })
            .eq('id', interest.id);
          if (updErr) {
            console.error('Cancel interest error:', updErr);
            setCancelSubmitting(false);
            return;
          }
        }
        setInterest(null);
        setInterestUnit(null);
        setInterestCommunity(null);
        setCancelSubmitting(false);
        setShowCancelConfirm(false);
      } catch (e: any) {
        console.error('Cancel interest error:', e);
        setCancelSubmitting(false);
      }
    }
  };

  // Listen for profile updates from other StudentPortal instances
  useEffect(() => {
    const handler = () => { loadProfile(); };
    window.addEventListener('ez_profile_updated', handler);
    return () => window.removeEventListener('ez_profile_updated', handler);
  }, []);

  useEffect(() => { load(); loadProfile(); }, [tick]);

  // Realtime subscription for StudentPortal
  useEffect(() => {
    if (isMockDatabase) return;
    let channelInterests: any = null;
    let channelLeases: any = null;
    let supabaseClient: any = null;

    (async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        supabaseClient = createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        channelInterests = supabaseClient
          .channel(`public:tenant_interests_student_${user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tenant_interests', filter: `user_id=eq.${user.id}` },
            async () => {
              setTick(t => t + 1);
            }
          )
          .subscribe();

        channelLeases = supabaseClient
          .channel(`public:leases_student_${user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'leases', filter: `tenant_id=eq.${user.id}` },
            async () => {
              setTick(t => t + 1);
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Student Realtime subscription error:', err);
      }
    })();

    return () => {
      if (supabaseClient) {
        if (channelInterests) supabaseClient.removeChannel(channelInterests);
        if (channelLeases) supabaseClient.removeChannel(channelLeases);
      }
    };
  }, []);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>{t('loadingApp')}</div>;

  if (!lease) {
    if (mode !== 'maintenance' && interest) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-surface) 100%)', position: 'relative', padding: '32px 24px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: 6, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={20} color="var(--primary)" />
              {lang === 'zh' ? '租约申请与意向进度' : 'Lease Application Progress'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
              {lang === 'zh' ? '您对以下房源提交了入住意向。中介确认意向后，将在此处为您生成租约合同。' : 'You expressed interest in the property below. The contract will appear here once the agent confirms.'}
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {lang === 'zh' ? '意向房源' : 'Property'}
                  </div>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-h)' }}>
                    {interestCommunity?.name || (lang === 'zh' ? '未知公寓' : 'Unknown Community')} 
                    {interestUnit?.room_type ? ` (${interestUnit.room_type})` : ''}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.72rem', padding: '4px 10px', borderRadius: 20, fontWeight: 700,
                    background: interest.status === 'confirmed' ? 'rgba(22,163,74,0.12)' : 'rgba(245,158,11,0.12)',
                    color: interest.status === 'confirmed' ? '#16A34A' : 'var(--warning)',
                    border: `1px solid ${interest.status === 'confirmed' ? 'rgba(22,163,74,0.2)' : 'rgba(245,158,11,0.2)'}`
                  }}>
                    {interest.status === 'confirmed' 
                      ? (lang === 'zh' ? '中介已同意' : 'Approved by Agent') 
                      : (lang === 'zh' ? '中介审核中' : 'Awaiting Approval')}
                  </span>
                </div>
              </div>
            </div>

            <ProgressFlow
              isAgreed={interest.status === 'confirmed'}
              isActive={false}
              lang={lang}
            />

            {interest.status === 'interested' ? (
              <div style={{
                padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.15)', color: 'var(--warning)',
                fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                marginTop: 16, marginBottom: 24, lineHeight: 1.4
              }}>
                <Clock size={16} style={{ flexShrink: 0 }} />
                <span>{lang === 'zh' ? '意向已成功提交给房源中介，请等待中介进行确认。您也可以随时在下方取消该意向。' : 'Interest submitted to agent. Waiting for confirmation. You can withdraw the interest below.'}</span>
              </div>
            ) : (
              <div style={{
                padding: '12px 16px', borderRadius: 12, background: 'rgba(22,163,74,0.06)',
                border: '1px solid rgba(22,163,74,0.15)', color: '#16A34A',
                fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                marginTop: 16, marginBottom: 24, lineHeight: 1.4
              }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{lang === 'zh' ? '🎉 中介已同意您的意向申请！正在为您制作正式租约，生成后此处将自动转为租约及账单界面，请稍后再次查看。' : '🎉 The agent approved your request! Preparing lease contract. Once created, this tab will automatically sync.'}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => cancelMyInterest(interest.id, interest.unit_id)}
                disabled={cancelSubmitting}
                style={{
                  padding: '8px 20px', borderRadius: 20, border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.04)', color: 'var(--danger)',
                  fontSize: '0.78rem', fontWeight: 600, cursor: cancelSubmitting ? 'wait' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)'; }}
              >
                <Trash2 size={14} />
                {lang === 'zh' ? '取消并撤回意向' : 'Withdraw Interest'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
        <h3 style={{ marginBottom: 8 }}>{mode === 'maintenance' ? (lang === 'zh' ? '暂无报修权限' : 'No Maintenance Access') : t('noLeaseTitle')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 380, margin: '0 auto' }}>
          {mode === 'maintenance' 
            ? (lang === 'zh' ? '您当前账号下没有处于活动状态的租约合同，无法提交维护和报修申请。如有疑问请联系管理员。' : 'Your account has no active lease contract, so you cannot submit maintenance requests. Please contact the administrator.')
            : t('noLeaseDesc')}
        </p>
      </div>
    );
  }

  const today = new Date();
  const start = new Date(lease.start_date);
  const end = new Date(lease.end_date);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const elapsedDays = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / 86400000));
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  const progress = Math.min(1, elapsedDays / totalDays);
  const paidCount = payments.filter(p => p.paid).length;
  const nextUnpaid = payments.find(p => !p.paid);

  const R = 70, C = 2 * Math.PI * R;
  const dashOffset = C * (1 - progress);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const fmtMonth = (d: string) => new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Profile — standalone page mode */}
      {mode === 'profile' && (() => {
        const calculateProfileProgress = () => {
          let filled = 0;
          let total = 8;
          if (profileName.trim()) filled++;
          if (profilePhone.trim()) filled++;
          if (profileUnit.trim()) filled++;
          if (profileSchool.trim()) filled++;
          if (profileCompany.trim()) filled++;
          if (profilePassport.trim()) filled++;
          if (profileLocalId.trim()) filled++;
          if (profileDocUrl || profileDocBase64) filled++;
          return Math.round((filled / total) * 100);
        };
        const progressPercentage = calculateProfileProgress();
        return (
          <div className="glass-card">
            <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px' }}>
              <User size={18} style={{ color: 'var(--primary)' }} /> {t('myProfile')}
            </h4>

            {/* Profile Completion Progress Bar */}
            <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {lang === 'zh' ? '个人资料完善度' : 'Profile Completion'}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                  {progressPercentage}%
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--glass-border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercentage}%`,
                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                  borderRadius: 3,
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
            </div>

            {/* Privacy Safety Banner */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '16px' }}>🔒</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-body)', lineHeight: 1.4 }}>
                {lang === 'zh' 
                  ? '安全加密保护：您的身份证件及个人敏感信息已根据 Supabase RLS 安全策略进行多重加密存储，仅供分配的中介及房东进行租约审核，系统绝不泄露给任何第三方。'
                  : 'Encrypted Security: Your ID documents and personal info are heavily encrypted using RLS policies, accessible only by authorized agents/landlords for verification.'
                }
              </p>
            </div>

            {/* Section 1: Basic info — 2-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  {t('profileName')} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)}
                  placeholder={t('profileNamePlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('profilePhone')}</label>
                <input type="tel" className="form-input" value={profilePhone} onChange={e => setProfilePhone(e.target.value)}
                  placeholder={t('profilePhonePlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  {t('profileUnit')} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input type="text" className="form-input" value={profileUnit} onChange={e => setProfileUnit(e.target.value)}
                  placeholder={t('profileUnitPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('profileSchool')}</label>
                <input type="text" className="form-input" value={profileSchool} onChange={e => setProfileSchool(e.target.value)}
                  placeholder={t('profileSchoolPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('profileCompany')}</label>
                <input type="text" className="form-input" value={profileCompany} onChange={e => setProfileCompany(e.target.value)}
                  placeholder={t('profileCompanyPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Section 2: ID section */}
            <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: 16, marginBottom: 20 }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} />
                {t('profileIdHint')}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('profilePassport')}</label>
                  <input type="text" className="form-input" value={profilePassport} onChange={e => setProfilePassport(e.target.value)}
                    placeholder={t('profilePassportPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('profileLocalId')}</label>
                  <input type="text" className="form-input" value={profileLocalId} onChange={e => setProfileLocalId(e.target.value)}
                    placeholder={t('profileLocalIdPlaceholder')} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            {/* Section 3: Document upload */}
            <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: 16, marginBottom: 20 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{t('profileDocument')}</label>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>{t('profileDocumentDesc')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '24px 20px', borderRadius: 12, width: '100%', maxWidth: 220,
                  border: '2px dashed var(--primary-glow)', background: 'var(--primary-light)',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  color: 'var(--primary)', transition: 'all 0.2s', textAlign: 'center', boxSizing: 'border-box'
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--primary-glow)'; }}
                >
                  <Camera size={24} style={{ color: 'var(--primary)', marginBottom: 2 }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-h)' }}>{t('profileDocumentUpload')}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>{lang === 'zh' ? '支持拍照或上传凭证图片' : 'Click to snap photo or upload'}</span>
                  <input type="file" accept="image/*" onChange={handleDocChange} style={{ display: 'none' }} />
                </label>
                {(profileDocBase64 || profileDocUrl) && (
                  <div style={{ position: 'relative' }}>
                    <a href={profileDocBase64 || profileDocUrl || '#'} target="_blank" rel="noopener noreferrer">
                      <img src={profileDocBase64 || profileDocUrl || ''} alt="Document"
                        style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--primary)', boxShadow: '0 2px 12px var(--primary-glow)' }} />
                    </a>
                    <button type="button" onClick={() => { setProfileDocBase64(null); setProfileDocUrl(null); }}
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        background: 'var(--danger)', color: 'white', border: 'none',
                        borderRadius: '50%', width: 22, height: 22, fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                      }}>×</button>
                  </div>
                )}
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={saveProfile} disabled={profileSaving || profileDocUploading || !profileName.trim() || !profileUnit.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: (profileName.trim() && profileUnit.trim()) ? 'var(--primary)' : 'var(--glass-border)',
                  color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                  cursor: (profileName.trim() && profileUnit.trim()) ? 'pointer' : 'not-allowed',
                  boxShadow: (profileName.trim() && profileUnit.trim()) ? '0 2px 8px var(--primary-glow)' : 'none'
                }}>
                <Save size={14} /> {profileSaving || profileDocUploading ? t('saving') : t('profileSave')}
              </button>
              {profileSaved && (
                <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>{t('profileSaved')}</span>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '12px 0 0' }}>{t('profileHint')}</p>
          </div>
        );
      })()}

      {mode === 'lease' && (
        <>
          {/* Hero lease card */}
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-surface) 100%)', position: 'relative' }}>
            
            {/* Terminate Lease action (Moved to top right of the hero card) */}
            <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
              <button
                onClick={() => setShowTerminateConfirm(true)}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--danger)',
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  backdropFilter: 'blur(4px)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                title={lang === 'zh' ? '提前终止您的租房合同' : 'Early terminate your lease contract'}
              >
                <AlertCircle size={14} />
                {lang === 'zh' ? '终止合约' : 'Terminate'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* SVG Ring */}
              <div className="countdown-svg-container" style={{ width: 160, height: 160 }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r={R} fill="none" stroke="var(--glass-border)" strokeWidth="10" />
                  <circle
                    cx="80" cy="80" r={R}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={dashOffset}
                    className="progress-ring-circle"
                    style={{ filter: 'drop-shadow(0 0 6px var(--primary-glow))' }}
                  />
                </svg>
                <div className="progress-text">
                  <div className="progress-number">{remainingDays}</div>
                  <div className="progress-label">{t('daysLeft')}</div>
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{t('leaseProgress')}</div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>
                  {community?.name}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>
                  {unit?.room_type} &nbsp;·&nbsp;
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>RM {lease.monthly_rent}{t('perMonth')}</span>
                </p>

                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { icon: <Calendar size={14} />, label: t('leaseElapsed'), val: `${Math.round(progress * 100)}%` },
                    { icon: <CreditCard size={14} />, label: t('monthsPaid'), val: `${paidCount} / ${payments.length}` },
                    { icon: <Clock size={14} />, label: t('leaseExpires'), val: fmtDate(lease.end_date) },
                  ].map((s, i) => (
                    <div key={i} className="stat-chip">
                      <span style={{ color: 'var(--primary)' }}>{s.icon}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{s.label}:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Next due banner */}
            {nextUnpaid ? (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-light)', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-body)' }}>
                  {t('ledgerNextDue')}：<strong>{fmtMonth(nextUnpaid.billing_month)}</strong>
                  &nbsp;· RM {lease.monthly_rent}
                </span>
              </div>
            ) : (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--success-light)', border: '1px solid var(--success)', display: 'flex', gap: 8 }}>
                <TrendingUp size={15} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-body)' }}><strong>{t('ledgerAllPaid')}</strong> {t('ledgerAllPaidDesc')}</span>
              </div>
            )}
          </div>

          {unit?.room_type === 'Whole Unit' && roommates.length > 0 && (
            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} style={{ color: 'var(--primary)' }} />
                {lang === 'zh' ? '合租室友名单 (联保整租)' : 'Co-tenants (Joint Lease)'}
              </h4>
              
              {/* Roommate departure alerts */}
              {roommates.some(rm => rm.status === 'transferred') && (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  marginBottom: 16,
                  color: 'var(--text-h)',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>
                    <AlertCircle size={16} />
                    <span>{lang === 'zh' ? '⚠️ 合租联保退租警示' : '⚠️ Joint Tenancy Breach Warning'}</span>
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-body)' }}>
                    {lang === 'zh' 
                      ? `您的合租室友 [${roommates.filter(rm => rm.status === 'transferred').map(rm => rm.tenantName).join(', ')}] 已办理提前退租。根据合租联保规定，退出者须在生效日前找到继租人完成更替，否则其余人员须共同承担退出者租金份额，或在未能成功替换时面临整组违约责任。请尽快寻找继租人并联系管理员 Nick Chan 办理继租！`
                      : `Your co-tenant [${roommates.filter(rm => rm.status === 'transferred').map(rm => rm.tenantName).join(', ')}] has requested early termination. Under joint lease liability, exiting members must be substituted before departure; otherwise, remaining roommates are jointly responsible for rent or subject to contract breach. Please find a replacement roommate and contact admin Nick Chan immediately.`
                    }
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {/* Me */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--primary)',
                  background: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                    {profileName ? profileName.slice(0, 1).toUpperCase() : 'ME'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-h)' }}>
                      {profileName || (lang === 'zh' ? '我' : 'Me')} ({lang === 'zh' ? '当前承租' : 'Currently Renting'})
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {lease.start_date} ~ {lease.end_date}
                    </div>
                  </div>
                </div>

                {/* Other Roommates */}
                {roommates.map(rm => {
                  const isTransferred = rm.status === 'transferred';
                  return (
                    <div key={rm.id} style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `1px solid ${isTransferred ? 'rgba(239, 68, 68, 0.2)' : 'var(--glass-border)'}`,
                      background: isTransferred ? 'rgba(239, 68, 68, 0.03)' : 'var(--glass-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}>
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        background: isTransferred ? 'var(--text-muted)' : 'var(--accent)', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 700, 
                        fontSize: '0.85rem' 
                      }}>
                        {rm.tenantName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ 
                          fontWeight: 700, 
                          fontSize: '0.82rem', 
                          color: isTransferred ? 'var(--text-muted)' : 'var(--text-h)',
                          textDecoration: isTransferred ? 'line-through' : 'none'
                        }}>
                          {rm.tenantName} 
                          <span style={{ 
                            fontSize: '0.7rem', 
                            marginLeft: 4, 
                            fontWeight: 600,
                            color: isTransferred ? 'var(--danger)' : 'var(--success)'
                          }}>
                            {isTransferred 
                              ? (lang === 'zh' ? '(已退出/变更中)' : '(Exited/Transferring)') 
                              : (lang === 'zh' ? '(合租承租)' : '(Active Roommate)')
                            }
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {rm.start_date} ~ {rm.end_date}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ledger */}
          <LeaseLedgerCard
            community_name={community?.name || ''}
            room_type={unit?.room_type || ''}
            start_date={lease.start_date}
            end_date={lease.end_date}
            monthly_rent={lease.monthly_rent}
            payments={payments}
            agent_id={unit?.agent_id || null}
            landlord_qr_code={unit?.landlord_qr_code || null}
            landlord_bank_info={unit?.landlord_bank_info || null}
            onPaymentUpdated={() => setTick(t2 => t2 + 1)}
          />

          {/* Deposit */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.9rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Home size={16} style={{ color: 'var(--primary)' }} /> {t('ledgerDepositTitle')}
            </h4>
            {[
              { label: `${t('securityDeposit')} (${lease.security_deposit_months ?? 2} ${t('months')})`, val: lease.monthly_rent * (lease.security_deposit_months ?? 2) },
              { label: `${t('utilityDeposit')} (${lease.utility_deposit_months ?? 0.5} ${t('months')})`, val: lease.monthly_rent * (lease.utility_deposit_months ?? 0.5) },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>RM {r.val.toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', fontSize: '0.875rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--text-body)' }}>{t('totalDeposit')}</span>
              <span style={{ color: 'var(--primary)' }}>RM {(lease.monthly_rent * ((lease.security_deposit_months ?? 2) + (lease.utility_deposit_months ?? 0.5))).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>{t('depositNote')}</p>
          </div>
        </>
      )}

      {/* Maintenance Request Panel */}
      {mode === 'maintenance' && (
        <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h4 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <MessageSquare size={16} style={{ color: 'var(--primary)' }} /> {t('feedback')}
          </h4>
          <button onClick={() => {
            const opening = !showMyFeedbacks;
            setShowMyFeedbacks(opening);
            if (opening) {
              loadMyFeedbacks();
              localStorage.setItem('ez_feedback_last_seen', Date.now().toString());
              setFeedbackUnreadCount(0);
              if (onUnreadFeedbackCountChange) onUnreadFeedbackCountChange(0);
            }
          }}
            style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
            <span>{t('feedbackMy')} ({myFeedbacks.length})</span>
            {feedbackUnreadCount > 0 && (
              <span style={{ 
                background: 'var(--danger)', 
                color: 'white', 
                fontSize: '0.6rem', 
                fontWeight: 700, 
                padding: '1px 5px', 
                borderRadius: 'var(--radius-full)', 
                lineHeight: '1', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minWidth: 14, 
                height: 14, 
                marginLeft: 4 
              }}>
                {feedbackUnreadCount}
              </span>
            )}
            {showMyFeedbacks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Submit form */}
        <div style={{ marginBottom: 12 }}>
          {!profileComplete && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)', marginBottom: 12 }}>
              <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-body)' }}>{t('profileRequired')}</span>
            </div>
          )}

          {/* Category selection */}
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{t('feedbackCategory')}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {['Aircon', 'Plumbing', 'Electrical', 'Furniture', 'Appliance', 'Others'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFeedbackCategory(cat)}
                style={{
                  fontSize: '0.75rem',
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: '1px solid ' + (feedbackCategory === cat ? 'var(--primary)' : 'var(--glass-border)'),
                  background: feedbackCategory === cat ? 'var(--primary-light)' : 'none',
                  color: feedbackCategory === cat ? 'var(--primary)' : 'var(--text-body)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                {lang === 'zh' ? {
                  Aircon: '空调冷气',
                  Plumbing: '水管漏水',
                  Electrical: '电路照明',
                  Furniture: '家具五金',
                  Appliance: '家用电器',
                  Others: '其他问题'
                }[cat] : cat}
              </button>
            ))}
          </div>

          <textarea
            className="form-textarea"
            rows={3}
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
            style={{ resize: 'vertical', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
          />

          {/* Photo upload field */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--glass-border)',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-body)',
              transition: 'all 0.2s'
            }}>
              <Camera size={14} style={{ color: 'var(--primary)' }} />
              <span>{t('feedbackPhoto')}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </label>
            {photoBase64 && (
              <div style={{ position: 'relative' }}>
                <img
                  src={photoBase64}
                  alt="Preview"
                  style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--glass-border)' }}
                />
                <button
                  type="button"
                  onClick={() => setPhotoBase64(null)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: 'var(--danger)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: 14,
                    height: 14,
                    fontSize: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ flex: 1 }} />
            <button onClick={submitFeedback} disabled={feedbackSubmitting || !feedbackText.trim() || !profileComplete}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: (feedbackText.trim() && profileComplete) ? 'var(--primary)' : 'var(--glass-border)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', cursor: (feedbackText.trim() && profileComplete) ? 'pointer' : 'not-allowed' }}>
              <Send size={13} /> {t('feedbackSubmit')}
            </button>
          </div>
        </div>

        {/* My feedback list */}
        {showMyFeedbacks && (
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
            {myFeedbacks.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>{t('feedbackNoItems')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                {myFeedbacks.map(f => (
                  <div key={f.id} style={{ padding: '12px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                      </div>
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

                    {f.unit_info && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        {f.unit_info}
                      </div>
                    )}
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-body)', margin: '4px 0 6px', whiteSpace: 'pre-wrap' }}>{f.content}</p>

                    {f.photo_url && (
                      <div style={{ marginBottom: 8 }}>
                        <a href={f.photo_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={f.photo_url}
                            alt="Evidence"
                            style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: 6, border: '1px solid var(--glass-border)', objectFit: 'cover', cursor: 'pointer' }}
                          />
                        </a>
                      </div>
                    )}

                    {/* Conversation thread */}
                    {f.replies && f.replies.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, background: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 10 }}>
                        {f.replies.map((r, i) => {
                          const isAgent = r.role === 'agent';
                          return (
                            <div key={i} style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignSelf: isAgent ? 'flex-start' : 'flex-end',
                              maxWidth: '85%',
                              gap: 3
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                alignSelf: isAgent ? 'flex-start' : 'flex-end',
                                fontSize: '0.68rem',
                                color: 'var(--text-muted)',
                                padding: '0 4px'
                              }}>
                                <span style={{ fontWeight: 700, color: isAgent ? 'var(--primary)' : 'var(--success)' }}>
                                  {isAgent ? (lang === 'zh' ? '中介' : 'Agent') : (lang === 'zh' ? '我' : 'Me')}
                                </span>
                                <span>
                                  {new Date(r.at).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div style={{
                                padding: '10px 14px',
                                borderRadius: isAgent ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                                background: isAgent ? 'var(--bg-surface-solid)' : 'var(--primary)',
                                color: isAgent ? 'var(--text-body)' : 'white',
                                border: isAgent ? '1px solid var(--border)' : 'none',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                fontSize: '0.8rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                lineHeight: 1.45
                              }}>
                                {r.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Student reply input — only when ticket is open and agent has replied */}
                    {f.status !== 'resolved' && f.replies && f.replies.length > 0 && (() => {
                      const agentReplies = f.replies.filter(r => r.role === 'agent').length;
                      const studentReplies = f.replies.filter(r => r.role === 'student').length;
                      const canReply = studentReplies < agentReplies && studentReplies < 3;
                      if (!canReply) return null;
                      return (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={studentReply[f.id] || ''}
                            onChange={e => setStudentReply(prev => ({ ...prev, [f.id]: e.target.value }))}
                            placeholder={lang === 'zh' ? '回复中介…' : 'Reply to agent…'}
                            style={{ flex: 1, fontSize: '0.82rem', padding: '6px 10px' }}
                          />
                          <button onClick={() => sendStudentReply(f.id)} disabled={!studentReply[f.id]?.trim()}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: 'none', background: studentReply[f.id]?.trim() ? 'var(--primary)' : 'var(--glass-border)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.78rem', cursor: studentReply[f.id]?.trim() ? 'pointer' : 'not-allowed' }}>
                            <Send size={12} /> {lang === 'zh' ? '发送' : 'Send'}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      )}

      {/* Terminate Lease Modal */}
      {showTerminateConfirm && (
        <div 
          onClick={() => setShowTerminateConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--glass-border)',
              borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, paddingBottom: 20,
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setShowTerminateConfirm(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-h)' }}>
                {lang === 'zh' ? '确定要终止租约吗？' : 'Terminate Lease?'}
              </h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 24 }}>
              {lang === 'zh' ? (
                <>
                  依照您的租房合同条款，如果是非特殊情况在租约期内自行终止租房合同，
                  <strong style={{ color: 'var(--danger)' }}>您的押金将不予退还</strong>。<br/><br/>
                  管理端将会记录您单方面终止了该租约。点击确定则代表您同意合同中的相关违约内容。
                </>
              ) : (
                <>
                  According to your lease terms, if you terminate the lease before the end date without special circumstances, 
                  <strong style={{ color: 'var(--danger)' }}> your deposit will not be refunded</strong>.<br/><br/>
                  The administration will record this early termination. Clicking confirm means you agree to these penalty terms.
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowTerminateConfirm(false)}
                style={{
                  padding: '10px 16px', background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-h)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer'
                }}
                disabled={terminateSubmitting}
              >
                {lang === 'zh' ? '我再想想' : 'Cancel'}
              </button>
              <button 
                onClick={handleTerminateLease}
                style={{
                  padding: '10px 16px', background: 'var(--danger)', border: 'none',
                  color: 'white', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8
                }}
                disabled={terminateSubmitting}
              >
                {terminateSubmitting ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    {lang === 'zh' ? '处理中...' : 'Processing...'}
                  </>
                ) : (
                  lang === 'zh' ? '确定终止并放弃押金' : 'Terminate & Forfeit Deposit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMsg && (
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
              toastType === 'error' ? 'rgba(239, 68, 68, 0.45)' :
              'rgba(16, 185, 129, 0.45)'
            }`,
            boxShadow: `0 8px 32px ${
              toastType === 'error' ? 'rgba(239, 68, 68, 0.12)' :
              'rgba(16, 185, 129, 0.12)'
            }, inset 0 1px 1px rgba(255,255,255,0.1)`,
          }}>
            <span style={{
              display: 'flex', alignItems: 'center',
              color: toastType === 'error' ? '#ef4444' : '#10b981'
            }}>
              {toastType === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Cancel Interest Modal */}
      {showCancelConfirm && (
        <div 
          onClick={() => setShowCancelConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--glass-border)',
              borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, paddingBottom: 20,
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setShowCancelConfirm(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-h)' }}>
                {lang === 'zh' ? '确定要取消租房意向吗？' : 'Cancel Rent Interest?'}
              </h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 24 }}>
              {lang === 'zh' ? (
                <>
                  取消该意向后，系统将会把此房源的确认进度清空。您以后可以重新对其他房源提交租房意向。
                </>
              ) : (
                <>
                  Canceling this interest will clear your application progress. You will be able to submit interest for other listings in the future.
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  padding: '10px 16px', background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-h)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer'
                }}
                disabled={cancelSubmitting}
              >
                {lang === 'zh' ? '暂不取消' : 'No, Keep It'}
              </button>
              <button 
                onClick={confirmCancelInterest}
                style={{
                  padding: '10px 16px', background: 'var(--danger)', border: 'none',
                  color: 'white', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8
                }}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    {lang === 'zh' ? '处理中...' : 'Processing...'}
                  </>
                ) : (
                  lang === 'zh' ? '确定取消意向' : 'Confirm Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
