-- Migration 046: Consolidate agent onboarding onto agent_profiles
-- Description:
--   1. Backfill agent_profiles from legacy agent_registrations
--   2. Ensure approved agents have admin_users rows
--   3. Add indexes + updated_at trigger on agent_profiles
--   4. Tighten RLS insert policy (own auth_user_id only)
--
-- Frontend AdminPanel reads agent_profiles (not agent_registrations) as of 2026-06.

-- ─── 1. Indexes & updated_at trigger (idempotent) ───

CREATE INDEX IF NOT EXISTS idx_agent_profiles_status
  ON agent_profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_auth_user
  ON agent_profiles(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_profiles_created
  ON agent_profiles(created_at DESC);

CREATE OR REPLACE FUNCTION update_agent_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_profiles_updated_at ON agent_profiles;
CREATE TRIGGER agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_agent_profile_timestamp();

-- ─── 2. Backfill agent_profiles from legacy agent_registrations ───
-- Maps suspended/banned → rejected (agent_profiles only allows pending/approved/rejected).

INSERT INTO agent_profiles (
  auth_user_id,
  email,
  full_name,
  phone,
  whatsapp,
  agency_name,
  ren_number,
  ren_tag_image_url,
  verification_status,
  rejection_reason,
  created_at,
  updated_at
)
SELECT
  ar.auth_user_id,
  LOWER(TRIM(ar.email)),
  ar.full_name,
  ar.phone,
  ar.whatsapp,
  ar.agency_name,
  ar.ren_number,
  ar.ren_tag_image_url,
  CASE
    WHEN ar.verification_status = 'approved' THEN 'approved'
    WHEN ar.verification_status = 'rejected' THEN 'rejected'
    WHEN ar.verification_status = 'pending' THEN 'pending'
    ELSE 'rejected'
  END,
  ar.rejection_reason,
  ar.created_at,
  COALESCE(ar.reviewed_at, ar.updated_at, ar.created_at)
FROM agent_registrations ar
WHERE NOT EXISTS (
  SELECT 1
  FROM agent_profiles ap
  WHERE LOWER(TRIM(ap.email)) = LOWER(TRIM(ar.email))
     OR (
       ar.auth_user_id IS NOT NULL
       AND ap.auth_user_id IS NOT NULL
       AND ap.auth_user_id = ar.auth_user_id
     )
)
ON CONFLICT (email) DO NOTHING;

-- ─── 3. Promote approved legacy registrations still only in agent_registrations ───
-- (Some environments may still have approved rows that were not deleted.)

INSERT INTO admin_users (
  id,
  email,
  display_name,
  phone,
  whatsapp,
  role,
  agency_name,
  job_title,
  ren_number,
  ren_tag_url
)
SELECT
  ar.auth_user_id,
  LOWER(TRIM(ar.email)),
  ar.full_name,
  ar.phone,
  ar.whatsapp,
  'editor',
  ar.agency_name,
  'Real Estate Negotiator',
  ar.ren_number,
  ar.ren_tag_image_url
FROM agent_registrations ar
WHERE ar.verification_status = 'approved'
  AND ar.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_users au WHERE au.id = ar.auth_user_id
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  phone = EXCLUDED.phone,
  whatsapp = EXCLUDED.whatsapp,
  agency_name = EXCLUDED.agency_name,
  ren_number = EXCLUDED.ren_number,
  ren_tag_url = EXCLUDED.ren_tag_url;

-- ─── 4. Ensure approved agent_profiles have admin_users rows ───

INSERT INTO admin_users (
  id,
  email,
  display_name,
  phone,
  whatsapp,
  role,
  agency_name,
  job_title,
  ren_number,
  ren_tag_url
)
SELECT
  ap.auth_user_id,
  LOWER(TRIM(ap.email)),
  ap.full_name,
  ap.phone,
  ap.whatsapp,
  'editor',
  ap.agency_name,
  'Real Estate Negotiator',
  ap.ren_number,
  ap.ren_tag_image_url
FROM agent_profiles ap
WHERE ap.verification_status = 'approved'
  AND ap.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_users au WHERE au.id = ap.auth_user_id
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  phone = EXCLUDED.phone,
  whatsapp = EXCLUDED.whatsapp,
  agency_name = EXCLUDED.agency_name,
  ren_number = EXCLUDED.ren_number,
  ren_tag_url = EXCLUDED.ren_tag_url;

-- ─── 5. Tighten insert policy: only the registering agent may insert their row ───

DROP POLICY IF EXISTS "Anyone can insert agent profiles" ON agent_profiles;
DROP POLICY IF EXISTS "Agents can insert own profile on registration" ON agent_profiles;
CREATE POLICY "Agents can insert own profile on registration"
  ON agent_profiles FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- ─── 6. Deprecation note (table kept for audit; no new writes from app) ───

COMMENT ON TABLE agent_registrations IS
  'DEPRECATED (2026-06): Legacy agent onboarding. New flow uses agent_profiles via /register/agent. Existing rows backfilled by migration 046.';

COMMENT ON TABLE agent_profiles IS
  'Agent onboarding applications from /register/agent. Super admin reviews in AdminPanel agent-reviews tab.';
