'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DiagnosePage() {
  const [status, setStatus] = useState<any>({
    loading: true,
    supabaseUrl: '',
    supabaseKeyExists: false,
    supabaseKeyLength: 0,
    session: null,
    error: null,
    cookies: '',
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      let sessionData = null;
      let errStr = null;

      try {
        if (url && key) {
          const supabase = createClient();
          const { data, error } = await supabase.auth.getSession();
          if (error) errStr = error.message;
          sessionData = data?.session;
        } else {
          errStr = 'Supabase environment variables are missing on the server/client side.';
        }
      } catch (e: any) {
        errStr = e.message || 'Failed to initialize Supabase client.';
      }

      setStatus({
        loading: false,
        supabaseUrl: url ? `${url.substring(0, 12)}...${url.substring(url.length - 4)}` : 'MISSING',
        supabaseKeyExists: !!key,
        supabaseKeyLength: key.length,
        session: sessionData,
        error: errStr,
        cookies: typeof document !== 'undefined' ? document.cookie : '',
      });
    };

    runDiagnostics();
  }, []);

  if (status.loading) {
    return <div style={{ padding: 40, fontFamily: 'monospace' }}>Running diagnostics...</div>;
  }

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', maxWidth: 800, margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>🌐 Malaysia Ez Rent - Deployment Diagnostics</h2>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginTop: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>1. Environment Variables in Vercel</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 0', fontWeight: 600, width: '250px' }}>NEXT_PUBLIC_SUPABASE_URL</td>
              <td style={{ padding: '8px 0', color: status.supabaseUrl === 'MISSING' ? 'red' : 'green' }}>
                {status.supabaseUrl}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 0', fontWeight: 600 }}>NEXT_PUBLIC_SUPABASE_KEY</td>
              <td style={{ padding: '8px 0', color: status.supabaseKeyExists ? 'green' : 'red' }}>
                {status.supabaseKeyExists ? `Configured (Length: ${status.supabaseKeyLength})` : 'MISSING'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginTop: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>2. Client-side Auth Session</h3>
        <pre style={{ background: '#f1f5f9', padding: 12, borderRadius: 6, overflowX: 'auto', fontSize: '0.85rem' }}>
          {JSON.stringify(status.session, null, 2)}
        </pre>
        {status.error && (
          <div style={{ color: '#ef4444', marginTop: 10, fontWeight: 600 }}>
            ❌ Error: {status.error}
          </div>
        )}
        {!status.error && status.session && (
          <div style={{ color: '#22c55e', marginTop: 10, fontWeight: 600 }}>
            ✅ User is successfully logged in. User Email: {status.session.user?.email}
          </div>
        )}
        {!status.error && !status.session && (
          <div style={{ color: '#eab308', marginTop: 10, fontWeight: 600 }}>
            ⚠️ No active session found. User is currently anonymous.
          </div>
        )}
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginTop: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>3. Browser Cookies</h3>
        <pre style={{ background: '#f1f5f9', padding: 12, borderRadius: 6, overflowX: 'auto', fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {status.cookies || 'No cookies found'}
        </pre>
      </div>

      <div style={{ marginTop: 30, fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
        Click <a href="/login" style={{ color: '#2563eb', textDecoration: 'underline' }}>here</a> to return to login.
      </div>
    </div>
  );
}
