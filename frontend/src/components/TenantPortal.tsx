'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Calendar, CreditCard, AlertCircle, TrendingUp, Clock, MessageSquare, X, Send, User, Save, ChevronDown, ChevronUp, Camera, Users, Trash2, CheckCircle2, XCircle, AlertTriangle, Star, Search, Upload } from 'lucide-react';
import LeaseLedgerCard from './LeaseLedgerCard';
import AgentRating from './AgentRating';
import { useApp } from '@/lib/ThemeProvider';
import { useTenantData, IdentityType } from '@/lib/TenantDataContext';
import { isMockDatabase } from '@/lib/supabase';

interface Lease {
  id: string; unit_id: string; lease_group_id?: string; tenant_id: string;
  start_date: string; end_date: string;
  monthly_rent: number; deposit_amount: number;
  security_deposit_months?: number; utility_deposit_months?: number;
  status: string;
  admin_notes?: string;
  unit_number?: string;
  units?: { room_type?: string; community_id?: string; agent_id?: string; communities?: { name?: string } } | null;
}
interface Payment {
  id: string; lease_id: string; billing_month: string;
  paid: boolean; paid_date?: string | null; evidence_url?: string | null; status?: string; admin_notes?: string;
}
interface Unit { id: string; community_id: string; room_type: string; status?: string; agent_id?: string | null; landlord_qr_code?: string | null; landlord_bank_info?: string | null; available_from?: string | null; }
interface Community { id: string; name: string; }

const IDENTITY_OPTIONS: { id: IdentityType; labelZh: string; labelEn: string }[] = [
  { id: 'malaysian', labelZh: '🇲🇾 马来西亚本地人', labelEn: 'Malaysian Citizen' },
  { id: 'international_student', labelZh: '🌍 国际留学生', labelEn: 'International Student' },
  { id: 'international_other', labelZh: '🌐 其他外籍人士', labelEn: 'International Other' },
];

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

/* ── History Payment Grid (archived audit table — tenant-side, simplified) ── */
function HistoryPaymentGrid({ leaseId, startDate, endDate, lang }: { leaseId: string; startDate: string; endDate: string; lang: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (isMockDatabase) {
          const all: any[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
          setPayments(all.filter(p => p.lease_id === leaseId).sort((a: any, b: any) => a.billing_month.localeCompare(b.billing_month)));
        } else {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data } = await supabase.from('payment_records').select('id, billing_month, paid, paid_date, status, evidence_url').eq('lease_id', leaseId).order('billing_month');
          setPayments(data || []);
        }
      } catch (e) { console.error('HistoryPaymentGrid load error:', e); }
      setLoading(false);
    })();
  }, [leaseId]);

  const fmtMonth = (d: string) => new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', year: '2-digit' });

  // Generate all months based on lease period
  const allMonths = useMemo(() => {
    const months: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      months.push(current.toISOString().slice(0, 7)); // 'YYYY-MM'
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }, [startDate, endDate]);

  // Create a set of months that have been paid
  const paidMonths = useMemo(() => {
    const set = new Set<string>();
    payments.forEach(p => {
      if (p.paid || p.status === 'approved') {
        set.add(p.billing_month);
      }
    });
    return set;
  }, [payments]);

  // Find the last paid month index (payments are consecutive, no gaps)
  const lastPaidIndex = useMemo(() => {
    let lastIdx = -1;
    allMonths.forEach((month, idx) => {
      if (paidMonths.has(month)) lastIdx = idx;
    });
    return lastIdx;
  }, [allMonths, paidMonths]);

  if (loading) return <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: 8 }}>{lang === 'zh' ? '加载中...' : 'Loading...'}</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
      {allMonths.map((month, idx) => {
        // Simple logic: paid if month is at or before the last paid month
        const isPaid = idx <= lastPaidIndex;
        const cellBg = isPaid ? 'var(--success-light)' : 'var(--danger-light)';
        const cellBorder = isPaid ? 'var(--success)' : 'var(--danger)';
        return (
          <div key={month} style={{
            background: cellBg,
            border: `1px solid ${cellBorder}`,
            borderRadius: 8,
            padding: '10px 8px',
            textAlign: 'center',
            opacity: !isPaid ? 0.7 : 1,
          }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{fmtMonth(month)}</div>
            {isPaid
              ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
              : <XCircle size={18} style={{ color: 'var(--danger)' }} />}
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: isPaid ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>
              {isPaid ? (lang === 'zh' ? '已付' : 'Paid') : (lang === 'zh' ? '未付' : 'Unpaid')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TenantSkeleton = ({ mode, lang }: { mode: 'lease' | 'maintenance' | 'profile'; lang: string }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease', width: '100%' }}>
      {mode === 'lease' && (
        <>
          {/* Header Card Shimmer */}
          <div className="shimmer" style={{ height: 96, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
          {/* Progress Shimmer */}
          <div className="shimmer" style={{ height: 64, borderRadius: 12, border: '1px solid var(--glass-border)' }} />
          {/* Info Grid Shimmer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div className="shimmer" style={{ height: 260, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
            <div className="shimmer" style={{ height: 260, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
          </div>
          {/* Ledger Table Shimmer */}
          <div className="shimmer" style={{ height: 220, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
        </>
      )}

      {mode === 'maintenance' && (
        <>
          {/* Submit card shimmer */}
          <div className="shimmer" style={{ height: 180, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
          {/* List header shimmer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="shimmer" style={{ width: 120, height: 24, borderRadius: 6 }} />
            <div className="shimmer" style={{ width: 80, height: 20, borderRadius: 6 }} />
          </div>
          {/* Items shimmer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="shimmer" style={{ height: 110, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
            ))}
          </div>
        </>
      )}

      {mode === 'profile' && (
        <>
          {/* Progress bar shimmer */}
          <div className="shimmer" style={{ height: 32, borderRadius: 10, border: '1px solid var(--glass-border)' }} />
          {/* Profile card shimmer */}
          <div className="shimmer" style={{ height: 320, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
          {/* Identity docs upload grid shimmer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="shimmer" style={{ height: 180, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
            <div className="shimmer" style={{ height: 180, borderRadius: 16, border: '1px solid var(--glass-border)' }} />
          </div>
        </>
      )}
    </div>
  );
};

export default function TenantPortal({
  mode = 'lease', 
  onUnreadFeedbackCountChange 
}: { 
  mode?: 'lease' | 'maintenance' | 'profile'; 
  onUnreadFeedbackCountChange?: (count: number) => void 
}) {
  const { t, lang } = useApp();
  const router = useRouter();
  const {
    interest, setInterest,
    interestUnit, setInterestUnit,
    interestCommunity, setInterestCommunity,
    lease, setLease,
    leaseHistory, setLeaseHistory,
    roommates, setRoommates,
    payments, setPayments,
    unit, setUnit,
    community, setCommunity,
    myFeedbacks, setMyFeedbacks,
    feedbackUnreadCount, setFeedbackUnreadCount,
    profileName, setProfileName,
    profilePhone, setProfilePhone,
    profileUnit, setProfileUnit,
    profilePassport, setProfilePassport,
    profileSchool, setProfileSchool,
    profileCompany, setProfileCompany,
    profileLocalId, setProfileLocalId,
    profileDocUrl, setProfileDocUrl,
    profileStudentCardUrl, setProfileStudentCardUrl,
    profileIdentityType, setProfileIdentityType,
    icFrontUrl, setIcFrontUrl,
    icBackUrl, setIcBackUrl,
    passportPhotoUrl, setPassportPhotoUrl,
    workPermitUrl, setWorkPermitUrl,
    isLoaded, setIsLoaded,
    profileLoaded, setProfileLoaded,
    clearCache,
  } = useTenantData();

  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [loading, setLoading] = useState(!isLoaded || !profileLoaded);
  const [tick, setTick] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('Aircon');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [studentReply, setStudentReply] = useState<Record<string, string>>({});
  const [showMyFeedbacks, setShowMyFeedbacks] = useState(mode === 'maintenance');
  const [showProfile, setShowProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const profileComplete = profileName.trim().length > 0;
  const [profileDocBase64, setProfileDocBase64] = useState<string | null>(null);
  const [profileDocUploading, setProfileDocUploading] = useState(false);
  const [profileStudentCardBase64, setProfileStudentCardBase64] = useState<string | null>(null);
  const [profileStudentCardUploading, setProfileStudentCardUploading] = useState(false);
  const [icFrontFile, setIcFrontFile] = useState<File | null>(null);
  const [icBackFile, setIcBackFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [workPermitFile, setWorkPermitFile] = useState<File | null>(null);
  const [icFrontPreview, setIcFrontPreview] = useState<string | null>(null);
  const [icBackPreview, setIcBackPreview] = useState<string | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [workPermitPreview, setWorkPermitPreview] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [leaseTab, setLeaseTab] = useState<'current' | 'history'>('current');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [terminateSubmitting, setTerminateSubmitting] = useState(false);
  const [deleteHistoryId, setDeleteHistoryId] = useState<string | null>(null);

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
        load();
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
        load();
      } catch (e) {
        console.error('Terminate lease error:', e);
        setTerminateSubmitting(false);
      }
    }
  };

  // Delete a historical lease and its payment records
  const deleteHistoryLease = async (leaseId: string) => {
    if (isMockDatabase) {
      // Mock mode: remove from localStorage
      const leases: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      localStorage.setItem('ez_leases', JSON.stringify(leases.filter(l => l.id !== leaseId)));
      const payments: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      localStorage.setItem('ez_payments', JSON.stringify(payments.filter(p => p.lease_id !== leaseId)));
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        // Delete payment records first (foreign key constraint)
        await supabase.from('payment_records').delete().eq('lease_id', leaseId);
        // Delete the lease
        const { error } = await supabase.from('leases').delete().eq('id', leaseId);
        if (error) throw error;
      } catch (e) {
        console.error('Delete history lease error:', e);
        return;
      }
    }
    // Update local state
    setLeaseHistory(prev => prev.filter(l => l.id !== leaseId));
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

  const handleStudentCardChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setProfileStudentCardBase64(compressedReader.result as string);
        };
        compressedReader.readAsDataURL(compressedBlob);
      } catch (err) {
        console.error('Student card compression failed:', err);
        setProfileStudentCardBase64(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIdentityImageSelect = (e: React.ChangeEvent<HTMLInputElement>, field: 'icFront' | 'icBack' | 'passport' | 'studentCard' | 'workPermit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setToastMsg(lang === 'zh' ? '仅支持 JPG/PNG/WEBP 格式' : 'Only JPG, PNG, and WEBP are supported');
      setToastType('error');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setToastMsg(lang === 'zh' ? '文件大小不能超过 8MB' : 'File must be under 8MB');
      setToastType('error');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    if (field === 'icFront') setIcFrontFile(file);
    else if (field === 'icBack') setIcBackFile(file);
    else if (field === 'passport') setPassportFile(file);
    else if (field === 'workPermit') setWorkPermitFile(file);
    else if (field === 'studentCard') {
      handleStudentCardChange(e);
      return;
    }
    import('@/utils/compressImage').then(({ compressImageToDataUrl }) => {
      compressImageToDataUrl(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
        .then(b64 => {
          if (field === 'icFront') setIcFrontPreview(b64);
          else if (field === 'icBack') setIcBackPreview(b64);
          else if (field === 'passport') setPassportPreview(b64);
          else if (field === 'workPermit') setWorkPermitPreview(b64);
        })
        .catch(() => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const result = ev.target?.result as string;
            if (field === 'icFront') setIcFrontPreview(result);
            else if (field === 'icBack') setIcBackPreview(result);
            else if (field === 'passport') setPassportPreview(result);
            else if (field === 'workPermit') setWorkPermitPreview(result);
          };
          reader.readAsDataURL(file);
        });
    });
  };

  const loadProfile = async (force = false) => {
    if (profileLoaded && !force) return;
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
        setProfileStudentCardUrl(u.student_card_url || null);
        setProfileIdentityType(u.identity_type || null);
        setIcFrontUrl(u.ic_photo_front_url || null);
        setIcBackUrl(u.ic_photo_back_url || null);
        setPassportPhotoUrl(u.passport_photo_url || null);
        setWorkPermitUrl(u.work_permit_photo_url || null);
        // Get unit_number from active lease
        const mockLeases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
        const mockActiveLease = mockLeases.find((l: any) => l.tenant_id === tenantId && l.status === 'active');
        if (mockActiveLease?.unit_number) setProfileUnit(mockActiveLease.unit_number);
      }
    } else {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('users').select('full_name, phone, unit_number, passport_number, school, company, local_id_number, document_url, student_card_url, identity_type, ic_photo_front_url, ic_photo_back_url, passport_photo_url, work_permit_photo_url').eq('id', user.id).single();
        if (data) {
          name = data.full_name || '';
          setProfileName(name);
          setProfilePhone(data.phone || '');
          setProfilePassport(data.passport_number || '');
          setProfileSchool(data.school || '');
          setProfileCompany(data.company || '');
          setProfileLocalId(data.local_id_number || '');
          setProfileDocUrl(data.document_url || null);
          setProfileStudentCardUrl(data.student_card_url || null);
          setProfileIdentityType((data.identity_type as IdentityType) || null);
          setIcFrontUrl(data.ic_photo_front_url || null);
          setIcBackUrl(data.ic_photo_back_url || null);
          setPassportPhotoUrl(data.passport_photo_url || null);
          setWorkPermitUrl(data.work_permit_photo_url || null);
        }
        // Get unit_number from active lease
        const { data: activeLease } = await supabase.from('leases').select('unit_number').eq('tenant_id', user.id).eq('status', 'active').maybeSingle();
        setProfileUnit(activeLease?.unit_number || data?.unit_number || '');
      } catch (e) { console.error('Load profile error:', e); }
    }
    if (!name) setShowProfile(true);
    setProfileLoaded(true);
  };

  const saveProfile = async () => {
    if (!profileName.trim()) return;
    setProfileSaveError(null);

    if (!profileIdentityType) {
      setProfileSaveError(lang === 'zh' ? '请选择您的身份类型' : 'Please select your identity type');
      return;
    }

    if (profileIdentityType === 'malaysian') {
      const cleanedIc = profileLocalId.replace(/[^0-9]/g, '');
      if (cleanedIc.length !== 12) {
        setProfileSaveError(lang === 'zh' ? '身份证号码格式不正确（12位数字）' : 'Invalid IC number (12 digits required)');
        return;
      }
      if (!(icFrontPreview || icFrontUrl) || !(icBackPreview || icBackUrl)) {
        setProfileSaveError(lang === 'zh' ? '请上传身份证正反面照片' : 'Please upload both front and back IC photos');
        return;
      }
    } else {
      if (!profilePassport.trim()) {
        setProfileSaveError(lang === 'zh' ? '请输入护照号码' : 'Please enter passport number');
        return;
      }
      if (!(passportPreview || passportPhotoUrl)) {
        setProfileSaveError(lang === 'zh' ? '请上传护照照片页' : 'Please upload passport photo page');
        return;
      }
    }

    setProfileSaving(true);

    let docUrl = profileDocUrl;
    let studentCardUrl = profileStudentCardUrl;
    let nextIcFrontUrl = icFrontUrl;
    let nextIcBackUrl = icBackUrl;
    let nextPassportPhotoUrl = passportPhotoUrl;
    let nextWorkPermitUrl = workPermitUrl;

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

    if (profileStudentCardBase64 && !isMockDatabase) {
      setProfileStudentCardUploading(true);
      try {
        const { compressDataUrl } = await import('@/utils/compressImage');
        const blob = await compressDataUrl(profileStudentCardBase64, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 });
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const path = `student-cards/${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from('unit-media').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (!uploadErr) {
          const { data } = supabase.storage.from('unit-media').getPublicUrl(path);
          studentCardUrl = data?.publicUrl || null;
        }
      } catch (e) { console.error('Student card upload error:', e); }
      setProfileStudentCardUploading(false);
    } else if (profileStudentCardBase64 && isMockDatabase) {
      studentCardUrl = profileStudentCardBase64;
    }

    const profileData: Record<string, string | null> = {
      full_name: profileName.trim(),
      phone: profilePhone.trim(),
      passport_number: profileIdentityType === 'malaysian' ? null : (profilePassport.trim().toUpperCase() || null),
      school: profileSchool.trim() || null,
      company: profileCompany.trim() || null,
      local_id_number: profileIdentityType === 'malaysian' ? profileLocalId.replace(/[^0-9]/g, '') : null,
      document_url: docUrl,
      student_card_url: studentCardUrl,
      identity_type: profileIdentityType,
      ic_photo_front_url: profileIdentityType === 'malaysian' ? (icFrontPreview || icFrontUrl) : null,
      ic_photo_back_url: profileIdentityType === 'malaysian' ? (icBackPreview || icBackUrl) : null,
      passport_photo_url: profileIdentityType !== 'malaysian' ? (passportPreview || passportPhotoUrl) : null,
      work_permit_photo_url: profileIdentityType === 'international_other' ? (workPermitPreview || workPermitUrl) : null,
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
      if (profileStudentCardBase64) setProfileStudentCardUrl(profileStudentCardBase64);
      if (icFrontPreview) setIcFrontUrl(icFrontPreview);
      if (icBackPreview) setIcBackUrl(icBackPreview);
      if (passportPreview) setPassportPhotoUrl(passportPreview);
      if (workPermitPreview) setWorkPermitUrl(workPermitPreview);
    } else {
      try {
        const { compressImageFile } = await import('@/utils/compressImage');
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setProfileSaving(false); return; }

        const uploadHelper = async (file: File, path: string) => {
          const compressed = await compressImageFile(file, { quality: 0.85, maxWidth: 1600 });
          const { error: uploadErr } = await supabase.storage
            .from('unit-media')
            .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
          if (uploadErr) throw uploadErr;
          const { data } = supabase.storage.from('unit-media').getPublicUrl(path);
          return data.publicUrl;
        };

        if (profileIdentityType === 'malaysian') {
          if (icFrontFile) nextIcFrontUrl = await uploadHelper(icFrontFile, `tenant-docs/ic/${user.id}-front.jpg`);
          if (icBackFile) nextIcBackUrl = await uploadHelper(icBackFile, `tenant-docs/ic/${user.id}-back.jpg`);
          profileData.ic_photo_front_url = nextIcFrontUrl;
          profileData.ic_photo_back_url = nextIcBackUrl;
          profileData.passport_photo_url = null;
          profileData.work_permit_photo_url = null;
        } else {
          if (passportFile) nextPassportPhotoUrl = await uploadHelper(passportFile, `tenant-docs/passport/${user.id}.jpg`);
          profileData.passport_photo_url = nextPassportPhotoUrl;
          profileData.ic_photo_front_url = null;
          profileData.ic_photo_back_url = null;
          if (profileIdentityType === 'international_other' && workPermitFile) {
            nextWorkPermitUrl = await uploadHelper(workPermitFile, `tenant-docs/work-permit/${user.id}.jpg`);
            profileData.work_permit_photo_url = nextWorkPermitUrl;
          } else if (profileIdentityType === 'international_student') {
            profileData.work_permit_photo_url = null;
          }
        }

        const { error: metaErr } = await supabase.auth.updateUser({
          data: { role: 'student', identity_type: profileIdentityType, full_name: profileName.trim() },
        });
        if (metaErr) throw metaErr;

        const { error } = await supabase.from('users').upsert({ id: user.id, ...profileData });
        if (error) throw error;

        if (docUrl) setProfileDocUrl(docUrl);
        if (studentCardUrl) setProfileStudentCardUrl(studentCardUrl);
        setIcFrontUrl(nextIcFrontUrl);
        setIcBackUrl(nextIcBackUrl);
        setPassportPhotoUrl(nextPassportPhotoUrl);
        setWorkPermitUrl(nextWorkPermitUrl);
      } catch (e) {
        console.error('Save profile error:', e);
        setProfileSaving(false);
        setProfileSaveError(lang === 'zh' ? '保存失败，请重试' : 'Save failed, please try again');
        return;
      }
    }

    setProfileSaving(false);
    setProfileSaved(true);
    setProfileDocBase64(null);
    setProfileStudentCardBase64(null);
    setIcFrontFile(null);
    setIcBackFile(null);
    setPassportFile(null);
    setWorkPermitFile(null);
    setIcFrontPreview(null);
    setIcBackPreview(null);
    setPassportPreview(null);
    setWorkPermitPreview(null);
    setTimeout(() => setProfileSaved(false), 3000);
    window.dispatchEvent(new Event('ez_profile_updated'));
    setToastMsg(lang === 'zh' ? '个人信息已保存' : 'Profile saved');
    setToastType('success');
    setTimeout(() => setToastMsg(null), 2500);
  };

  const load = async (force = false) => {
    if (isLoaded && !force) {
      setLoading(false);
      return;
    }
    if (isMockDatabase) {
      const leases: Lease[] = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const allPayments: Payment[] = JSON.parse(localStorage.getItem('ez_payments') || '[]');
      const units: Unit[] = JSON.parse(localStorage.getItem('ez_units') || '[]');
      const communities: Community[] = JSON.parse(localStorage.getItem('ez_communities') || '[]');
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const myLease = leases.find(l => l.tenant_id === tenantId && l.status === 'active') || null;
      setLease(myLease);
      // Load lease history (expired/completed/terminated)
      const history = leases.filter(l => l.tenant_id === tenantId && l.status !== 'active').sort((a, b) => b.end_date.localeCompare(a.end_date));
      setLeaseHistory(history);
      // Auto-switch to history tab if no active lease but has history
      if (!myLease && history.length > 0) setLeaseTab('history');
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

        const [leaseRes, historyRes, interestRes] = await Promise.all([
          supabase
            .from('leases')
            .select('*')
            .eq('tenant_id', user.id)
            .eq('status', 'active')
            .maybeSingle(),
          supabase
            .from('leases')
            .select('*, units!inner(room_type, community_id, agent_id, communities!inner(name))')
            .eq('tenant_id', user.id)
            .neq('status', 'active')
            .order('end_date', { ascending: false }),
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
        const historyData = historyRes.data || [];
        setLeaseHistory(historyData);
        // Auto-switch to history tab if no active lease but has history
        if (!leaseData && historyData.length > 0) setLeaseTab('history');

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
            supabase.from('units').select('id, community_id, room_type, agent_id, landlord_qr_code, landlord_bank_info, communities(id, name)').eq('id', leaseData.unit_id).single(),
          ]);
          setPayments(payRes.data || []);
          if (unitRes.data) {
            const { communities: commData, ...unitRow } = unitRes.data as any;
            setUnit(unitRow);
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
        console.error('TenantPortal load error:', e);
        setLease(null);
        setPayments([]);
        setUnit(null);
        setCommunity(null);
        setRoommates([]);
      }
    }
    setIsLoaded(true);
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
        const { data } = await supabase
          .from('maintenance_requests')
          .select(`
            *,
            leases (
              unit_number,
              units (
                room_type,
                communities (
                  name
                )
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data) {
          const normalized = data.map((f: any) => {
            let replies = f.replies;
            if (!replies && f.admin_reply) {
              replies = [{ role: 'agent', content: f.admin_reply, at: f.resolved_at || f.updated_at || f.created_at }];
            }

            // Resolve unit_info from joined leases relation
            let unitInfo = '';
            const lease = f.leases;
            if (lease) {
              const unitObj = lease.units;
              const comm = unitObj?.communities;
              const parts = [comm?.name, unitObj?.room_type, lease.unit_number].filter(Boolean);
              if (parts.length) unitInfo = parts.join(' · ');
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

  // Listen for profile updates from other TenantPortal instances
  useEffect(() => {
    const handler = () => { loadProfile(); };
    window.addEventListener('ez_profile_updated', handler);
    return () => window.removeEventListener('ez_profile_updated', handler);
  }, []);

  useEffect(() => {
    (async () => {
      const force = tick > 0;
      if (force) {
        clearCache();
      }
      await Promise.all([
        load(force),
        loadProfile(force),
        loadMyFeedbacks()
      ]);
    })();
  }, [tick]);

  // Realtime subscription for TenantPortal
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

  if (loading) return <TenantSkeleton mode={mode} lang={lang} />;

  const renderToast = toastMsg && (
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
  );

  const renderCancelModal = showCancelConfirm && (
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
  );

  const renderDeleteHistoryModal = deleteHistoryId && (
    <div
      onClick={() => setDeleteHistoryId(null)}
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
          borderRadius: 16, width: '100%', maxWidth: 400, padding: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          position: 'relative'
        }}
      >
        <button
          onClick={() => setDeleteHistoryId(null)}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} color="var(--danger)" />
          </div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-h)' }}>
            {lang === 'zh' ? '删除历史租约' : 'Delete History'}
          </h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 24 }}>
          {lang === 'zh'
            ? '确定要删除这条历史租约记录吗？删除后将无法恢复，包括所有付款记录。'
            : 'Are you sure you want to delete this lease history? This action cannot be undone and will remove all payment records.'}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDeleteHistoryId(null)}
            style={{
              padding: '10px 16px', background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-h)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            {lang === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            onClick={async () => {
              if (deleteHistoryId) {
                await deleteHistoryLease(deleteHistoryId);
                setDeleteHistoryId(null);
              }
            }}
            style={{
              padding: '10px 16px', background: 'var(--danger)', border: 'none',
              color: 'white', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600
            }}
          >
            {lang === 'zh' ? '确认删除' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );

  // Profile mode — render independently of lease state
  if (mode === 'profile') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {(() => {
          const calculateProfileProgress = () => {
            let filled = 0;
            let total = profileIdentityType === 'malaysian' ? 7 : 6;
            if (profileName.trim()) filled++;
            if (profilePhone.trim()) filled++;
            if (profileUnit.trim()) filled++;
            if (profileIdentityType) filled++;
            if (profileIdentityType === 'malaysian') {
              if (profileLocalId.replace(/[^0-9]/g, '').length === 12) filled++;
              if (icFrontPreview || icFrontUrl) filled++;
              if (icBackPreview || icBackUrl) filled++;
            } else if (profileIdentityType) {
              if (profilePassport.trim()) filled++;
              if (passportPreview || passportPhotoUrl) filled++;
              if (profileIdentityType === 'international_student' && profileSchool.trim()) filled++;
              if (profileIdentityType === 'international_other' && profileCompany.trim()) filled++;
            }
            return Math.min(100, Math.round((filled / total) * 100));
          };

          const renderIdentityUpload = (
            label: string,
            preview: string | null,
            existingUrl: string | null,
            field: 'icFront' | 'icBack' | 'passport' | 'studentCard' | 'workPermit',
            required = false,
            onClear?: () => void,
          ) => {
            const shown = preview || existingUrl;
            return (
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                {shown ? (
                  <div style={{ position: 'relative', maxWidth: 220 }}>
                    <a href={shown} target="_blank" rel="noopener noreferrer">
                      <img src={shown} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--glass-border)' }} />
                    </a>
                    <button type="button" onClick={() => {
                      if (field === 'icFront') { setIcFrontFile(null); setIcFrontPreview(null); setIcFrontUrl(null); }
                      else if (field === 'icBack') { setIcBackFile(null); setIcBackPreview(null); setIcBackUrl(null); }
                      else if (field === 'passport') { setPassportFile(null); setPassportPreview(null); setPassportPhotoUrl(null); }
                      else if (field === 'workPermit') { setWorkPermitFile(null); setWorkPermitPreview(null); setWorkPermitUrl(null); }
                      else if (field === 'studentCard') { setProfileStudentCardBase64(null); setProfileStudentCardUrl(null); }
                      onClear?.();
                    }}
                      style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>
                      {lang === 'zh' ? '重选' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 16px', border: '2px dashed var(--glass-border)', borderRadius: 10, cursor: 'pointer', background: 'var(--glass-bg)', maxWidth: 220 }}>
                    <Upload size={20} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-body)', textAlign: 'center' }}>{lang === 'zh' ? '点击上传' : 'Click to upload'}</span>
                    <input type="file" accept="image/*" onChange={e => handleIdentityImageSelect(e, field)} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            );
          };
          const progressPercentage = calculateProfileProgress();
          return (
            <div className="glass-card">
              <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px' }}>
                <User size={18} style={{ color: 'var(--primary)' }} /> {t('myProfile')}
              </h4>

              {!profileIdentityType && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
                  {lang === 'zh'
                    ? '请先选择身份类型并上传对应证件，完成后方可使用房源浏览、租约等功能。'
                    : 'Please select your identity type and upload required documents before using listings and lease features.'}
                </div>
              )}

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
              <div className="grid-2" style={{ marginBottom: 20 }}>
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
                    {t('profileUnit')}
                    <span style={{ fontSize: '0.68rem', marginLeft: 6, color: 'var(--text-muted)', fontWeight: 400 }}>
                      {lang === 'zh' ? '（由合约自动填写）' : '(set by lease)'}
                    </span>
                  </label>
                  <input type="text" className="form-input" value={profileUnit} disabled
                    placeholder={lang === 'zh' ? '等待中介生成合约后自动填入' : 'Auto-filled when lease is created'}
                    style={{ width: '100%', boxSizing: 'border-box', opacity: profileUnit ? 1 : 0.5, cursor: 'not-allowed' }} />
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

              {/* Section 2: Identity verification */}
              <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: 16, marginBottom: 20 }}>
                <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>
                  {lang === 'zh' ? '身份验证' : 'Identity Verification'}
                </h5>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                  {lang === 'zh'
                    ? '请选择您的身份类型，并上传对应证件。信息加密存储，仅供租约审核使用。'
                    : 'Select your identity type and upload the required documents. Encrypted and used for lease verification only.'}
                </p>

                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
                  {lang === 'zh' ? '身份类型' : 'Identity Type'} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {IDENTITY_OPTIONS.map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setProfileIdentityType(opt.id)}
                      style={{
                        padding: '12px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s ease',
                        background: profileIdentityType === opt.id ? 'var(--primary-light)' : 'var(--glass-bg)',
                        border: `1px solid ${profileIdentityType === opt.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                      }}
                    >
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: profileIdentityType === opt.id ? 'var(--primary)' : 'var(--text-h)' }}>
                        {lang === 'zh' ? opt.labelZh : opt.labelEn}
                      </span>
                    </div>
                  ))}
                </div>

                {profileIdentityType === 'malaysian' && (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                        {t('profileLocalId')} <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <input type="text" className="form-input" value={profileLocalId}
                        onChange={e => setProfileLocalId(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="yymmddxxxxxx" maxLength={12}
                        style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div className="grid-2" style={{ gap: 16 }}>
                      {renderIdentityUpload(lang === 'zh' ? '身份证正面照片' : 'IC Photo (Front)', icFrontPreview, icFrontUrl, 'icFront', true)}
                      {renderIdentityUpload(lang === 'zh' ? '身份证背面照片' : 'IC Photo (Back)', icBackPreview, icBackUrl, 'icBack', true)}
                    </div>
                  </>
                )}

                {profileIdentityType && profileIdentityType !== 'malaysian' && (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                        {t('profilePassport')} <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <input type="text" className="form-input" value={profilePassport}
                        onChange={e => setProfilePassport(e.target.value.toUpperCase())}
                        placeholder={t('profilePassportPlaceholder')}
                        style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      {renderIdentityUpload(lang === 'zh' ? '护照照片页' : 'Passport Information Page', passportPreview, passportPhotoUrl, 'passport', true)}
                    </div>
                    {profileIdentityType === 'international_student' && (
                      <div style={{ marginTop: 8 }}>
                        {renderIdentityUpload(lang === 'zh' ? '学生证或录取函（选填）' : 'Student ID or Offer Letter (Optional)', profileStudentCardBase64, profileStudentCardUrl, 'studentCard')}
                      </div>
                    )}
                    {profileIdentityType === 'international_other' && (
                      <div style={{ marginTop: 8 }}>
                        {renderIdentityUpload(lang === 'zh' ? '工作准证/签证（选填）' : 'Work Permit / Visa (Optional)', workPermitPreview, workPermitUrl, 'workPermit')}
                      </div>
                    )}
                  </>
                )}

                {!profileIdentityType && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {lang === 'zh' ? '请先选择身份类型，系统将显示对应的证件上传要求。' : 'Select an identity type above to see required documents.'}
                  </div>
                )}
              </div>

              {profileSaveError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: 16 }}>
                  <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{profileSaveError}</span>
                </div>
              )}

              {/* Save button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={saveProfile} disabled={profileSaving || profileDocUploading || profileStudentCardUploading || !profileName.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none',
                    background: profileName.trim() ? 'var(--primary)' : 'var(--glass-border)',
                    color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
                    cursor: profileName.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: profileName.trim() ? '0 2px 8px var(--primary-glow)' : 'none'
                  }}>
                  <Save size={14} /> {profileSaving || profileDocUploading || profileStudentCardUploading ? t('saving') : t('profileSave')}
                </button>
                {profileSaved && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>{t('profileSaved')}</span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '12px 0 0' }}>{t('profileHint')}</p>
            </div>
          );
        })()}
        {renderToast}
      </div>
    );
  }

  // Maintenance mode — render independently of lease state
  if (mode === 'maintenance') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: (feedbackText.trim() && profileComplete) ? 'var(--gradient-primary)' : 'var(--glass-border)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', cursor: (feedbackText.trim() && profileComplete) ? 'pointer' : 'not-allowed', boxShadow: (feedbackText.trim() && profileComplete) ? '0 4px 12px -2px var(--primary-glow)' : 'none', transition: 'all 0.2s' }}>
                <Send size={13} /> {t('feedbackSubmit')}
              </button>
            </div>
          </div>

          {/* My feedback list */}
          {showMyFeedbacks && (
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
              {myFeedbacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  <div className="empty-state-icon" style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 12 }}><MessageSquare size={22} /></div>
                  <p style={{ fontSize: '0.82rem', margin: 0 }}>{t('feedbackNoItems')}</p>
                </div>
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
                            {lang === 'zh' ? ({
                              Aircon: '空调冷气',
                              Plumbing: '水管漏水',
                              Electrical: '电路照明',
                              Furniture: '家具五金',
                              Appliance: '家用电器',
                              Others: '其他问题'
                            } as Record<string, string>)[f.category || 'Others'] : f.category}
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
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          marginTop: 12,
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--glass-border)',
                          padding: 14,
                          borderRadius: 12
                        }}>
                          {f.replies.map((r: any, i: number) => {
                            const isAgent = r.role === 'agent';
                            return (
                              <div key={i} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                paddingBottom: i < f.replies.length - 1 ? 12 : 0,
                                borderBottom: i < f.replies.length - 1 ? '1px solid var(--glass-border)' : 'none'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '0.74rem',
                                  color: 'var(--text-muted)'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{
                                      fontWeight: 700,
                                      color: isAgent ? 'var(--primary)' : 'var(--success)',
                                      background: isAgent ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      fontSize: '0.68rem'
                                    }}>
                                      {isAgent ? (lang === 'zh' ? '中介' : 'Agent') : (lang === 'zh' ? '我' : 'Me')}
                                    </span>
                                  </div>
                                  <span>
                                    {new Date(r.at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div style={{
                                  fontSize: '0.82rem',
                                  color: 'var(--text-body)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.5,
                                  paddingLeft: 2
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
                        const agentReplies = f.replies.filter((r: any) => r.role === 'agent').length;
                        const studentReplies = f.replies.filter((r: any) => r.role === 'student').length;
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
        {renderToast}
      </div>
    );
  }

  if (!lease) {
    if (interest) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Lease sub-tabs — pill style matching Inbox */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            {[
              { id: 'current' as const, label: lang === 'zh' ? '当前租约' : 'Current Lease' },
              { id: 'history' as const, label: lang === 'zh' ? '历史租约' : 'Lease History' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLeaseTab(tab.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem',
                  border: '1px solid var(--glass-border)',
                  background: leaseTab === tab.id ? 'var(--gradient-primary)' : 'var(--glass-bg)',
                  color: leaseTab === tab.id ? 'white' : 'var(--text-body)',
                  fontWeight: 600, cursor: 'pointer', transition: '0.2s',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (leaseTab !== tab.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (leaseTab !== tab.id) e.currentTarget.style.background = 'var(--glass-bg)'; }}
              >
                {tab.label}
                {tab.id === 'history' && leaseHistory.length > 0 && null}
              </button>
            ))}
          </div>

          {leaseTab === 'current' && (<>
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
          </>
          )}

          {/* Lease History — history tab only (archived audit cards) */}
          {leaseTab === 'history' && (
            leaseHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leaseHistory.map(h => {
                  const isExpanded = expandedHistoryId === h.id;
                  const statusConfig: Record<string, { bg: string; color: string; border: string; label: string; labelZh: string }> = {
                    expired: { bg: 'rgba(245,158,11,0.02)', color: 'var(--warning)', border: 'rgba(245,158,11,0.3)', label: 'Expired', labelZh: '已到期' },
                    terminated: { bg: 'rgba(239,68,68,0.02)', color: 'var(--danger)', border: 'rgba(239,68,68,0.3)', label: 'Terminated', labelZh: '已终止' },
                    completed: { bg: 'rgba(16,185,129,0.01)', color: 'var(--success)', border: 'rgba(16,185,129,0.2)', label: 'Archived', labelZh: '已归档' },
                  };
                  const cfg = statusConfig[h.status] || statusConfig.completed;
                  const leaseDuration = (() => {
                    const s = new Date(h.start_date); const e = new Date(h.end_date);
                    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
                    return months > 0 ? months : 1;
                  })();
                  return (
                    <div key={h.id} style={{
                      borderRadius: 'var(--radius-md)', overflow: 'hidden',
                      border: `1px solid ${cfg.border}`, background: cfg.bg,
                    }}>
                      {/* Card header — clickable */}
                      <div onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', cursor: 'pointer', background: isExpanded ? 'var(--primary-light)' : 'var(--glass-bg)', transition: 'background 0.2s' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>
                              RM {h.monthly_rent?.toLocaleString()}{lang === 'zh' ? '/月' : '/mo'}
                            </span>
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, background: cfg.bg, color: cfg.color, fontWeight: 600, border: `1px solid ${cfg.border}` }}>
                              {lang === 'zh' ? cfg.labelZh : cfg.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                            {h.unit_number ? `${lang === 'zh' ? '单元' : 'Unit'} ${h.unit_number}` : ''}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {h.start_date} → {h.end_date} · {lang === 'zh' ? `${leaseDuration}个月` : `${leaseDuration} months`}
                          </div>
                          {/* Termination reason */}
                          <div style={{ fontSize: '0.75rem', color: cfg.color, marginTop: 4, fontWeight: 600 }}>
                            {h.status === 'terminated'
                              ? (lang === 'zh' ? '⚠️ 租客自行终止' : '⚠️ Terminated by tenant')
                              : h.status === 'expired'
                                ? (lang === 'zh' ? '⏰ 合约自然到期' : '⏰ Lease naturally expired')
                                : (lang === 'zh' ? '✅ 已结算归档' : '✅ Settled & archived')
                            }
                          </div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {lang === 'zh' ? '押金' : 'Deposit'}: <strong style={{ color: 'var(--text-h)' }}>RM {h.deposit_amount?.toLocaleString()}</strong>
                        </div>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                          {isExpanded ? <><ChevronUp size={13} /> {lang === 'zh' ? '收起' : 'Hide'}</> : <><ChevronDown size={13} /> {lang === 'zh' ? '查看收租核查' : 'Show Audit'}</>}
                        </button>
                      </div>

                      {/* Expanded: rent collection audit table */}
                      {isExpanded && (
                        <div style={{ padding: '16px', borderTop: `1px solid ${cfg.border}`, background: 'var(--bg-surface)' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {lang === 'zh' ? '📋 收租核查表' : '📋 Rent Collection Audit'}
                          </div>
                          <HistoryPaymentGrid leaseId={h.id} startDate={h.start_date} endDate={h.end_date} lang={lang} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card empty-state">
                <div className="empty-state-icon"><Clock size={30} /></div>
                <p>{lang === 'zh' ? '暂无历史租约' : 'No lease history yet'}</p>
              </div>
            )
          )}

          {renderCancelModal}
          {renderDeleteHistoryModal}
          {renderToast}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Lease sub-tabs — always visible */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {[
            { id: 'current' as const, label: lang === 'zh' ? '当前租约' : 'Current Lease' },
            { id: 'history' as const, label: lang === 'zh' ? '历史租约' : 'Lease History' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLeaseTab(tab.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem',
                border: '1px solid var(--glass-border)',
                background: leaseTab === tab.id ? 'var(--gradient-primary)' : 'var(--glass-bg)',
                color: leaseTab === tab.id ? 'white' : 'var(--text-body)',
                fontWeight: 600, cursor: 'pointer', transition: '0.2s',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { if (leaseTab !== tab.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (leaseTab !== tab.id) e.currentTarget.style.background = 'var(--glass-bg)'; }}
            >
              {tab.label}
              {tab.id === 'history' && leaseHistory.length > 0 && null}
            </button>
          ))}
        </div>

        {/* Current tab — no active lease, show empty state */}
        {leaseTab === 'current' && (
          <div className="glass-card empty-state">
            <div className="empty-state-icon"><Home size={32} /></div>
            <h3>{t('noLeaseTitle')}</h3>
            <p>{t('noLeaseDesc')}</p>
            <button className="btn btn-primary empty-cta" onClick={() => router.push('/listings')}>
              <Search size={15} />{lang === 'zh' ? '去找房源' : 'Browse Listings'}
            </button>
          </div>
        )}

        {/* History tab — archived lease audit cards (matches admin panel style) */}
        {leaseTab === 'history' && (
          leaseHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaseHistory.map(h => {
                const isExpanded = expandedHistoryId === h.id;
                const statusConfig: Record<string, { bg: string; color: string; border: string; label: string; labelZh: string }> = {
                  expired: { bg: 'rgba(245,158,11,0.02)', color: 'var(--warning)', border: 'rgba(245,158,11,0.3)', label: 'Expired', labelZh: '已到期' },
                  terminated: { bg: 'rgba(239,68,68,0.02)', color: 'var(--danger)', border: 'rgba(239,68,68,0.3)', label: 'Terminated', labelZh: '已终止' },
                  completed: { bg: 'rgba(16,185,129,0.01)', color: 'var(--success)', border: 'rgba(16,185,129,0.2)', label: 'Archived', labelZh: '已归档' },
                };
                const cfg = statusConfig[h.status] || statusConfig.completed;
                const leaseDuration = (() => {
                  const s = new Date(h.start_date); const e = new Date(h.end_date);
                  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
                  return months > 0 ? months : 1;
                })();
                return (
                  <div key={h.id} style={{
                    borderRadius: 'var(--radius-md)', overflow: 'hidden',
                    border: `1px solid ${cfg.border}`, background: cfg.bg,
                  }}>
                    {/* Card header — clickable */}
                    <div onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', cursor: 'pointer', background: isExpanded ? 'var(--primary-light)' : 'var(--glass-bg)', transition: 'background 0.2s' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* 社区名称 + 房型 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>
                            {h.units?.communities?.name || (lang === 'zh' ? '未知小区' : 'Unknown Community')}
                          </span>
                          <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, background: cfg.bg, color: cfg.color, fontWeight: 600, border: `1px solid ${cfg.border}` }}>
                            {lang === 'zh' ? cfg.labelZh : cfg.label}
                          </span>
                        </div>
                        {/* 房型 */}
                        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 3 }}>
                          {h.units?.room_type || ''}
                        </div>
                        {/* 价格 */}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>
                            RM {h.monthly_rent?.toLocaleString()}{lang === 'zh' ? '/月' : '/mo'}
                          </span>
                        </div>
                        {/* Unit Number + 日期 */}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {h.unit_number ? `${lang === 'zh' ? '单元' : 'Unit'} ${h.unit_number} · ` : ''}
                          {h.start_date} → {h.end_date} · {lang === 'zh' ? `${leaseDuration}个月` : `${leaseDuration} months`}
                        </div>
                        {/* Termination reason */}
                        <div style={{ fontSize: '0.75rem', color: cfg.color, marginTop: 4, fontWeight: 600 }}>
                          {h.status === 'terminated'
                            ? (lang === 'zh' ? '⚠️ 租客自行终止' : '⚠️ Terminated by tenant')
                            : h.status === 'expired'
                              ? (lang === 'zh' ? '⏰ 合约自然到期' : '⏰ Lease naturally expired')
                              : (lang === 'zh' ? '✅ 已结算归档' : '✅ Settled & archived')
                          }
                        </div>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {lang === 'zh' ? '押金' : 'Deposit'}: <strong style={{ color: 'var(--text-h)' }}>RM {h.deposit_amount?.toLocaleString()}</strong>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        {isExpanded ? <><ChevronUp size={13} /> {lang === 'zh' ? '收起' : 'Hide'}</> : <><ChevronDown size={13} /> {lang === 'zh' ? '查看收租核查' : 'Show Audit'}</>}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteHistoryId(h.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                        title={lang === 'zh' ? '删除此历史记录' : 'Delete this history'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Expanded: rent collection audit table */}
                    {isExpanded && (
                      <div style={{ padding: '16px', borderTop: `1px solid ${cfg.border}`, background: 'var(--bg-surface)' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {lang === 'zh' ? '📋 收租核查表' : '📋 Rent Collection Audit'}
                        </div>
                        <HistoryPaymentGrid leaseId={h.id} startDate={h.start_date} endDate={h.end_date} lang={lang} />

                        {/* 评价中介 */}
                        {h.units?.agent_id && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${cfg.border}` }}>
                            <AgentRating
                              agentId={h.units.agent_id}
                              leaseId={h.id}
                              tenantId={h.tenant_id}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card empty-state">
              <div className="empty-state-icon"><Clock size={30} /></div>
              <p>{lang === 'zh' ? '暂无历史租约' : 'No lease history yet'}</p>
            </div>
          )
        )}

        {renderCancelModal}
        {renderDeleteHistoryModal}
        {renderToast}
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
      {mode === 'lease' && (
        <>
          {/* Lease sub-tabs — pill style matching Inbox */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            {[
              { id: 'current' as const, label: lang === 'zh' ? '当前租约' : 'Current Lease' },
              { id: 'history' as const, label: lang === 'zh' ? '历史租约' : 'Lease History' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLeaseTab(tab.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem',
                  border: '1px solid var(--glass-border)',
                  background: leaseTab === tab.id ? 'var(--gradient-primary)' : 'var(--glass-bg)',
                  color: leaseTab === tab.id ? 'white' : 'var(--text-body)',
                  fontWeight: 600, cursor: 'pointer', transition: '0.2s',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (leaseTab !== tab.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (leaseTab !== tab.id) e.currentTarget.style.background = 'var(--glass-bg)'; }}
              >
                {tab.label}
                {tab.id === 'history' && leaseHistory.length > 0 && null}
              </button>
            ))}
          </div>

          {/* Current lease content */}
          {leaseTab === 'current' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

          {/* Agent Rating - only show for completed/expired/terminated leases */}
          {unit?.agent_id && ['completed', 'expired', 'terminated'].includes(lease.status) && (
            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={16} style={{ color: 'var(--primary)' }} /> {lang === 'zh' ? '评价中介' : 'Rate Agent'}
              </h4>
              <AgentRating
                agentId={unit.agent_id}
                leaseId={lease.id}
                tenantId={lease.tenant_id}
              />
            </div>
          )}
          </div>
          )}

          {/* Lease History — history tab only */}
          {leaseTab === 'history' && (
            leaseHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leaseHistory.map(h => {
                  const isExpanded = expandedHistoryId === h.id;
                  const statusConfig: Record<string, { bg: string; color: string; border: string; label: string; labelZh: string; note: string; noteEn: string }> = {
                    expired: { bg: 'rgba(245,158,11,0.02)', color: 'var(--warning)', border: 'rgba(245,158,11,0.3)', label: 'Expired', labelZh: '已到期', note: '⏰ 合约已到期', noteEn: '⏰ Lease expired' },
                    terminated: { bg: 'rgba(239,68,68,0.02)', color: 'var(--danger)', border: 'rgba(239,68,68,0.3)', label: 'Terminated', labelZh: '已终止', note: '⚠️ 租客已手动终止', noteEn: '⚠️ Terminated by tenant' },
                    completed: { bg: 'rgba(16,185,129,0.01)', color: 'var(--success)', border: 'rgba(16,185,129,0.2)', label: 'Archived', labelZh: '已归档', note: '✅ 已结算归档', noteEn: '✅ Settled & archived' },
                  };
                  const cfg = statusConfig[h.status] || statusConfig.completed;
                  const leaseDuration = (() => {
                    const s = new Date(h.start_date); const e = new Date(h.end_date);
                    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
                    return months > 0 ? months : 1;
                  })();
                  return (
                    <div key={h.id} style={{
                      borderRadius: 'var(--radius-md)', overflow: 'hidden',
                      border: `1px solid ${cfg.border}`, background: cfg.bg,
                    }}>
                      {/* Card header — clickable */}
                      <div onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', cursor: 'pointer', background: isExpanded ? 'var(--primary-light)' : 'var(--glass-bg)', transition: 'background 0.2s' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.9rem' }}>
                              RM {h.monthly_rent?.toLocaleString()}{lang === 'zh' ? '/月' : '/mo'}
                            </span>
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, background: cfg.bg, color: cfg.color, fontWeight: 600, border: `1px solid ${cfg.border}` }}>
                              {lang === 'zh' ? cfg.labelZh : cfg.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                            {h.unit_number ? `${lang === 'zh' ? '单元' : 'Unit'} ${h.unit_number}` : ''}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {h.start_date} → {h.end_date} · {lang === 'zh' ? `${leaseDuration}个月` : `${leaseDuration} months`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: cfg.color, marginTop: 4, fontStyle: 'italic', fontWeight: 500 }}>
                            {lang === 'zh' ? cfg.note : cfg.noteEn}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {lang === 'zh' ? '押金' : 'Deposit'}: <strong style={{ color: 'var(--text-h)' }}>RM {h.deposit_amount?.toLocaleString()}</strong>
                        </div>
                        {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                      </div>

                      {/* Expanded: payment history */}
                      {isExpanded && (
                        <div style={{ padding: '12px 16px', borderTop: `1px solid ${cfg.border}`, background: 'var(--bg-surface)' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 8 }}>
                            {lang === 'zh' ? '付款记录' : 'Payment History'}
                          </div>
                          <HistoryPaymentGrid leaseId={h.id} startDate={h.start_date} endDate={h.end_date} lang={lang} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card empty-state">
                <div className="empty-state-icon"><Clock size={30} /></div>
                <p>{lang === 'zh' ? '暂无历史租约' : 'No lease history yet'}</p>
              </div>
            )
          )}
        </>
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
      {renderToast}
      {renderCancelModal}
      {renderDeleteHistoryModal}
    </div>
  );
}
