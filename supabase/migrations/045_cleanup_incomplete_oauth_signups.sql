-- Migration 045: Find stale incomplete Google OAuth signups for cleanup
-- Targets accounts that authenticated via Google but never saved identity_type
-- within the grace period. Excludes agents and users with any tenant activity.

CREATE OR REPLACE FUNCTION public.find_stale_incomplete_oauth_signups(stale_minutes int DEFAULT 30)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id AS user_id
  FROM public.users u
  INNER JOIN auth.users au ON au.id = u.id
  WHERE u.identity_type IS NULL
    AND u.created_at < now() - (stale_minutes * interval '1 minute')
    AND EXISTS (
      SELECT 1 FROM auth.identities i
      WHERE i.user_id = au.id AND i.provider = 'google'
    )
    AND NOT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.leases l WHERE l.tenant_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.tenant_interests ti WHERE ti.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.maintenance_requests mr WHERE mr.user_id = u.id);
$$;

REVOKE ALL ON FUNCTION public.find_stale_incomplete_oauth_signups(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_stale_incomplete_oauth_signups(int) TO service_role;
