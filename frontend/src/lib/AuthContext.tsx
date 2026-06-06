'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isMockDatabase } from '@/lib/supabase';

interface AuthState {
  role: 'student' | 'admin' | 'agent_pending' | null;
  adminRole: 'super_admin' | 'editor' | null;
  userEmail: string;
  agentRegStatus: string | null;
  loading: boolean;
  setRole: (role: 'student' | 'admin') => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function purgeExpiredMockUsers() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
    const expiredAgentIds: string[] = [];
    const keptAdmins = admins.filter((a: any) => {
      if (a.avatar_url?.startsWith('DELETED:')) {
        const deletedAt = new Date(a.avatar_url.slice(8));
        if (deletedAt < sevenDaysAgo) {
          expiredAgentIds.push(a.id);
          return false;
        }
      }
      return true;
    });

    if (expiredAgentIds.length > 0) {
      localStorage.setItem('ez_admins', JSON.stringify(keptAdmins));
      const profiles = JSON.parse(localStorage.getItem('ez_agent_profiles') || '[]');
      localStorage.setItem('ez_agent_profiles', JSON.stringify(
        profiles.filter((p: any) => !expiredAgentIds.includes(p.auth_user_id)),
      ));
      const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
      localStorage.setItem('ez_users', JSON.stringify(
        users.filter((u: any) => !expiredAgentIds.includes(u.id)),
      ));
    }

    const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
    const expiredUserIds: string[] = [];
    const filteredUsers = users.filter((u: any) => {
      if (u.avatar_url?.startsWith('DELETED:')) {
        const deletedAt = new Date(u.avatar_url.slice(8));
        if (deletedAt < sevenDaysAgo) {
          expiredUserIds.push(u.id);
          return false;
        }
      }
      return true;
    });

    if (expiredUserIds.length > 0) {
      localStorage.setItem('ez_users', JSON.stringify(filteredUsers));

      const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      localStorage.setItem('ez_leases', JSON.stringify(
        leases.map((l: any) => expiredUserIds.includes(l.tenant_id) ? { ...l, tenant_id: null } : l),
      ));

      const reviews = JSON.parse(localStorage.getItem('ez_reviews') || '[]');
      localStorage.setItem('ez_reviews', JSON.stringify(
        reviews.map((r: any) => expiredUserIds.includes(r.user_id) ? { ...r, user_id: null } : r),
      ));

      const agentRatings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
      localStorage.setItem('ez_agent_ratings', JSON.stringify(
        agentRatings.map((ar: any) => expiredUserIds.includes(ar.tenant_id) ? { ...ar, tenant_id: null } : ar),
      ));

      const favorites = JSON.parse(localStorage.getItem('ez_favorites') || '[]');
      localStorage.setItem('ez_favorites', JSON.stringify(
        favorites.filter((f: any) => !expiredUserIds.includes(f.user_id)),
      ));
    }
  } catch (err) {
    console.error('Error purging expired mock users:', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<'student' | 'admin' | 'agent_pending' | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'editor' | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [agentRegStatus, setAgentRegStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockDatabase) {
      // Periodic cleanup of expired deleted users in mock mode (7+ days)
      purgeExpiredMockUsers();

      const loggedIn = localStorage.getItem('ez_logged_in');
      if (!loggedIn) {
        setLoading(false);
        return;
      }
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const email = localStorage.getItem('ez_user_email') || 'tenant@ezrent.my';
      const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');

      const mockAdminIdx = admins.findIndex((a: any) => a.id === tenantId || (a.email === email && email !== ''));
      let isAdmin = false;
      if (mockAdminIdx !== -1) {
        isAdmin = true;
        if (admins[mockAdminIdx].id !== tenantId) {
          admins[mockAdminIdx].id = tenantId;
          localStorage.setItem('ez_admins', JSON.stringify(admins));
        }
        setAdminRole(admins[mockAdminIdx].role as 'super_admin' | 'editor');
      } else {
        setAdminRole(null);
      }

      let finalRole: 'student' | 'admin' | 'agent_pending' = isAdmin ? 'admin' : 'student';
      if (!isAdmin) {
        const regs = JSON.parse(localStorage.getItem('ez_agent_profiles') || '[]');
        const myReg = regs.find((r: any) => r.auth_user_id === tenantId || (r.email === email && email !== ''));
        if (myReg) {
          if (myReg.verification_status === 'approved') {
            finalRole = 'admin';
          } else {
            finalRole = 'agent_pending';
            setAgentRegStatus(myReg.verification_status);
          }
        }
      }

      localStorage.setItem('ez_user_role', finalRole === 'agent_pending' ? 'student' : finalRole); // keep backward compatibility for storage role
      setRoleState(finalRole);
      setUserEmail(email);
      setLoading(false);
    } else {
      let active = true;
      let unsubscribe: (() => void) | null = null;

      // Resolve the app role for a given authenticated user (or clear when null).
      const resolveRole = async (user: any) => {
        if (!active) return;
        if (!user) {
          setRoleState(null);
          setAdminRole(null);
          setUserEmail('');
          setAgentRegStatus(null);
          setLoading(false);
          return;
        }
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();

          const userRole = user.user_metadata?.role; // 'student' | 'agent'

          if (userRole === 'agent') {
            // Check agent_profiles
            const { data: profile, error: profileErr } = await supabase
              .from('agent_profiles')
              .select('verification_status')
              .eq('auth_user_id', user.id)
              .maybeSingle();

            if (profile?.verification_status === 'approved') {
              // Get admin record
              const { data: record } = await supabase
                .from('admin_users')
                .select('id, role')
                .eq('id', user.id)
                .maybeSingle();

              if (record) {
                setAdminRole(record.role as 'super_admin' | 'editor');
                setRoleState('admin');
              } else {
                // Approved but admin_users record not fully linked yet
                setAdminRole(null);
                setRoleState('admin');
              }
              setAgentRegStatus('approved');
            } else {
              setAdminRole(null);
              setRoleState('agent_pending');
              setAgentRegStatus(profile?.verification_status || 'pending');
            }
          } else {
            // Default to tenant (student)
            setAdminRole(null);
            setRoleState('student');
            setAgentRegStatus(null);
          }

          setUserEmail(user.email || '');
          localStorage.setItem('ez_tenant_id', user.id);
        } catch (e) {
          console.error('[AuthContext] resolveRole error:', e);
        }
        if (active) setLoading(false);
      };

      const init = async () => {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            resolveRole(null);
            return;
          }
          setTimeout(() => resolveRole(session?.user ?? null), 0);
        });
        unsubscribe = () => subscription.unsubscribe();
      };
      init();

      return () => {
        active = false;
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  const setRole = useCallback((newRole: 'student' | 'admin') => {
    setRoleState(newRole);
    localStorage.setItem('ez_user_role', newRole);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('ez_logged_in');
    localStorage.removeItem('ez_user_role');
    localStorage.removeItem('ez_tenant_id');
    document.cookie = "ez_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (!isMockDatabase) {
      const { createClient } = await import('@/utils/supabase/client');
      await createClient().auth.signOut();
    }
    window.location.href = '/login';
  }, []);

  const deleteAccount = useCallback(async () => {
    if (isMockDatabase) {
      const tenantId = localStorage.getItem('ez_tenant_id') || 'tenant-123';
      const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
      const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
      const isAdmin = admins.some((a: any) => a.id === tenantId);

      // 1. Run cleanup for previously expired deleted mock users (7+ days)
      purgeExpiredMockUsers();
      const freshUsers = JSON.parse(localStorage.getItem('ez_users') || '[]');

      let filteredUsers = [...freshUsers];

      if (isAdmin) {
        const units = JSON.parse(localStorage.getItem('ez_units') || '[]');
        const unitIds = units.filter((u: any) => u.agent_id === tenantId).map((u: any) => u.id);
        if (unitIds.length > 0) {
          const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
          const hasActive = leases.some((l: any) => l.status === 'active' && unitIds.includes(l.unit_id));
          if (hasActive) {
            window.alert('您还有未到期的活跃租约，无法注销。请先等待所有租约到期或完成结算后再注销。');
            return;
          }
        }

        const deletedMarker = 'DELETED:' + new Date().toISOString();
        localStorage.setItem('ez_admins', JSON.stringify(admins.map((a: any) =>
          a.id === tenantId ? { ...a, avatar_url: deletedMarker } : a,
        )));
        const agentRegs = JSON.parse(localStorage.getItem('ez_agent_profiles') || '[]');
        localStorage.setItem('ez_agent_profiles', JSON.stringify(agentRegs.map((r: any) =>
          r.auth_user_id === tenantId
            ? { ...r, verification_status: 'rejected', rejection_reason: deletedMarker }
            : r,
        )));
        filteredUsers = filteredUsers.map((u: any) =>
          u.id === tenantId ? { ...u, avatar_url: deletedMarker } : u,
        );
        const notifications = JSON.parse(localStorage.getItem('ez_notifications') || '[]');
        localStorage.setItem('ez_notifications', JSON.stringify(
          notifications.filter((n: any) => n.user_id !== tenantId),
        ));
      } else {
        // Tenant deactivation: immediately mark user row as deleted but keep personal info/photos for 7 days
        filteredUsers = filteredUsers.map((u: any) => {
          if (u.id === tenantId) {
            return {
              ...u,
              avatar_url: 'DELETED:' + new Date().toISOString()
            };
          }
          return u;
        });

        // Delete auth-level mock data immediately
        const interests = JSON.parse(localStorage.getItem('ez_interests') || '[]');
        localStorage.setItem('ez_interests', JSON.stringify(interests.filter((i: any) => i.user_id !== tenantId)));
        const feedbacks = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
        localStorage.setItem('ez_feedback', JSON.stringify(feedbacks.filter((f: any) => f.user_id !== tenantId)));
        const notifications = JSON.parse(localStorage.getItem('ez_notifications') || '[]');
        localStorage.setItem('ez_notifications', JSON.stringify(notifications.filter((n: any) => n.user_id !== tenantId)));
      }

      localStorage.setItem('ez_users', JSON.stringify(filteredUsers));
      localStorage.removeItem('ez_logged_in');
      localStorage.removeItem('ez_user_role');
      localStorage.removeItem('ez_tenant_id');
      window.location.href = '/login';
    } else {
      const { deleteAccountAction } = await import('@/app/actions/deleteAccount');
      const result = await deleteAccountAction();
      if (!result.success) {
        window.alert(result.error || 'Delete account failed');
        return;
      }
      const { createClient } = await import('@/utils/supabase/client');
      await createClient().auth.signOut();
      localStorage.clear();
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ role, adminRole, userEmail, agentRegStatus, loading, setRole, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
