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
    const users = JSON.parse(localStorage.getItem('ez_users') || '[]');
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const expiredUserIds: string[] = [];
    const filteredUsers = users.filter((u: any) => {
      if (u.avatar_url && u.avatar_url.startsWith('DELETED:')) {
        const deletedAtStr = u.avatar_url.substring(8);
        const deletedAt = new Date(deletedAtStr);
        if (deletedAt < sevenDaysAgo) {
          expiredUserIds.push(u.id);
          return false;
        }
      }
      return true;
    });

    if (expiredUserIds.length > 0) {
      localStorage.setItem('ez_users', JSON.stringify(filteredUsers));

      // 1. Dissociate leases (preserve archived rent records)
      const leases = JSON.parse(localStorage.getItem('ez_leases') || '[]');
      const updatedLeases = leases.map((l: any) => 
        expiredUserIds.includes(l.tenant_id) ? { ...l, tenant_id: null } : l
      );
      localStorage.setItem('ez_leases', JSON.stringify(updatedLeases));

      // 2. Dissociate reviews
      const reviews = JSON.parse(localStorage.getItem('ez_reviews') || '[]');
      const updatedReviews = reviews.map((r: any) => 
        expiredUserIds.includes(r.user_id) ? { ...r, user_id: null } : r
      );
      localStorage.setItem('ez_reviews', JSON.stringify(updatedReviews));

      // 3. Dissociate agent ratings
      const agentRatings = JSON.parse(localStorage.getItem('ez_agent_ratings') || '[]');
      const updatedAgentRatings = agentRatings.map((ar: any) => 
        expiredUserIds.includes(ar.tenant_id) ? { ...ar, tenant_id: null } : ar
      );
      localStorage.setItem('ez_agent_ratings', JSON.stringify(updatedAgentRatings));

      // 4. Delete favorites
      const favorites = JSON.parse(localStorage.getItem('ez_favorites') || '[]');
      const updatedFavorites = favorites.filter((f: any) => !expiredUserIds.includes(f.user_id));
      localStorage.setItem('ez_favorites', JSON.stringify(updatedFavorites));
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
        // Agent deactivation: delete completely immediately
        filteredUsers = filteredUsers.filter((u: any) => u.id !== tenantId);
        localStorage.setItem('ez_admins', JSON.stringify(admins.filter((a: any) => a.id !== tenantId)));
        const agentRegs = JSON.parse(localStorage.getItem('ez_agent_profiles') || '[]');
        localStorage.setItem('ez_agent_profiles', JSON.stringify(agentRegs.filter((r: any) => r.auth_user_id !== tenantId)));
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
      if (!result.success) console.error('Delete account failed:', result.error);
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
