'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isMockDatabase } from '@/lib/supabase';

interface AuthState {
  role: 'student' | 'admin' | null;
  adminRole: 'super_admin' | 'editor' | null;
  userEmail: string;
  agentRegStatus: string | null;
  loading: boolean;
  setRole: (role: 'student' | 'admin') => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<'student' | 'admin' | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'editor' | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [agentRegStatus, setAgentRegStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockDatabase) {
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

      const finalRole: 'student' | 'admin' = isAdmin ? 'admin' : 'student';
      localStorage.setItem('ez_user_role', finalRole);
      setRoleState(finalRole);
      setUserEmail(email);
      if (finalRole === 'student') {
        const regs = JSON.parse(localStorage.getItem('ez_agent_registrations') || '[]');
        const myReg = regs.find((r: any) => r.auth_user_id === tenantId || (r.email === email && email !== ''));
        if (myReg) setAgentRegStatus(myReg.verification_status);
      }
      setLoading(false);
    } else {
      let active = true;
      let unsubscribe: (() => void) | null = null;

      // Resolve the app role for a given authenticated user (or clear when null).
      // Driven by onAuthStateChange so we never lock in role=null before the
      // session cookie has hydrated (the cause of "must log in twice").
      const resolveRole = async (user: { id: string; email?: string | null } | null) => {
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

          let adminRecord: { id: string; role: string; email?: string } | null = null;
          if (user.email) {
            const { data: record } = await supabase
              .from('admin_users')
              .select('id, role, email')
              .or(`id.eq.${user.id},email.eq.${user.email}`)
              .maybeSingle();
            if (record) {
              adminRecord = record;
              if (record.id !== user.id) {
                const { error: updErr } = await supabase
                  .from('admin_users')
                  .update({ id: user.id })
                  .eq('email', user.email);
                if (!updErr) adminRecord.id = user.id;
              }
            }
          } else {
            const { data: record } = await supabase
              .from('admin_users')
              .select('id, role')
              .eq('id', user.id)
              .maybeSingle();
            adminRecord = record;
          }

          if (!active) return;

          const activeRole = adminRecord ? 'admin' : 'student';
          setAdminRole(adminRecord ? (adminRecord.role as 'super_admin' | 'editor') : null);
          setRoleState(activeRole);
          setUserEmail(user.email || '');
          localStorage.setItem('ez_tenant_id', user.id);

          if (!adminRecord && user.email) {
            const { data: byEmail } = await supabase
              .from('agent_registrations')
              .select('verification_status, email, auth_user_id')
              .eq('email', user.email)
              .maybeSingle();
            if (byEmail) {
              setAgentRegStatus(byEmail.verification_status);
            } else {
              const { data: byId } = await supabase
                .from('agent_registrations')
                .select('verification_status')
                .eq('auth_user_id', user.id)
                .maybeSingle();
              if (byId && active) setAgentRegStatus(byId.verification_status);
            }
          }
        } catch (e) {
          console.error('[AuthContext] resolveRole error:', e);
        }
        if (active) setLoading(false);
      };

      const init = async () => {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();

        // onAuthStateChange fires INITIAL_SESSION immediately from persisted
        // storage (no network) and SIGNED_IN once a fresh login completes, so
        // the session is always reflected even if cookies arrive slightly late.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            resolveRole(null);
            return;
          }
          // Defer out of the callback to avoid Supabase auth lock re-entrancy.
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
      localStorage.setItem('ez_users', JSON.stringify(users.filter((u: any) => u.id !== tenantId)));
      const interests = JSON.parse(localStorage.getItem('ez_interests') || '[]');
      localStorage.setItem('ez_interests', JSON.stringify(interests.filter((i: any) => i.user_id !== tenantId)));
      const feedbacks = JSON.parse(localStorage.getItem('ez_feedback') || '[]');
      localStorage.setItem('ez_feedback', JSON.stringify(feedbacks.filter((f: any) => f.user_id !== tenantId)));
      const agentRegs = JSON.parse(localStorage.getItem('ez_agent_registrations') || '[]');
      localStorage.setItem('ez_agent_registrations', JSON.stringify(agentRegs.filter((r: any) => r.auth_user_id !== tenantId)));
      const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
      localStorage.setItem('ez_admins', JSON.stringify(admins.filter((a: any) => a.id !== tenantId)));
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
