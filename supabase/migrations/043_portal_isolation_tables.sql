-- Migration 043: Portal Isolation — New tables & users table extensions
-- Description: Creates agent_profiles, email_verifications tables and extends users table
--              for the tenant/agent registration separation.

-- ─── 1. Extend users table with identity/document fields ───

ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_type VARCHAR(30)
  CHECK (identity_type IN ('malaysian', 'international_student', 'international_other'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS ic_photo_front_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ic_photo_back_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_permit_photo_url TEXT;


-- ─── 2. Create agent_profiles table ───

CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  agency_name TEXT NOT NULL,
  ren_number TEXT NOT NULL,
  ren_tag_image_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for agent_profiles
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can read own profile"
  ON agent_profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can read all agent profiles"
  ON agent_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can update agent profiles"
  ON agent_profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete agent profiles"
  ON agent_profiles FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Anyone can insert agent profiles"
  ON agent_profiles FOR INSERT
  WITH CHECK (true);


-- ─── 3. Create email_verifications table ───

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS needed — accessed via server-side API routes only
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (API routes use service role)
CREATE POLICY "Service role full access on email_verifications"
  ON email_verifications FOR ALL
  USING (true)
  WITH CHECK (true);
