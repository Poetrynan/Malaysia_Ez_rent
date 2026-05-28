-- Agent registration system for Malaysian real estate negotiators
-- Agents apply via /register-agent, super admin reviews in admin panel

-- Normalization function for Malaysian phone numbers
CREATE OR REPLACE FUNCTION normalize_my_phone(raw TEXT)
RETURNS TEXT AS $$
DECLARE digits TEXT;
BEGIN
  IF raw IS NULL OR TRIM(raw) = '' THEN RETURN NULL; END IF;
  digits := regexp_replace(raw, '[^0-9]', '', 'g');
  IF digits LIKE '60%' THEN digits := substring(digits FROM 3); END IF;
  IF digits LIKE '0%' THEN digits := substring(digits FROM 2); END IF;
  IF digits !~ '^1[0-9]{8,9}$' THEN RETURN NULL; END IF;
  RETURN '60' || digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Normalization function for REN number
CREATE OR REPLACE FUNCTION normalize_ren(raw TEXT)
RETURNS TEXT AS $$
DECLARE cleaned TEXT;
BEGIN
  IF raw IS NULL OR TRIM(raw) = '' THEN RETURN NULL; END IF;
  cleaned := UPPER(regexp_replace(TRIM(raw), '[-\s]', '', 'g'));
  IF cleaned !~ '^REN[0-9]{4,7}$' THEN RETURN NULL; END IF;
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE IF NOT EXISTS agent_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID,

  -- Agent fields
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  whatsapp VARCHAR(20),
  agency_name VARCHAR(120) NOT NULL,
  ren_number VARCHAR(20) NOT NULL,
  ren_tag_image_url TEXT NOT NULL,

  -- Status
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended', 'banned')),
  rejection_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,

  -- Constraints
  CONSTRAINT valid_phone CHECK (phone ~ '^601[0-9]{8,9}$'),
  CONSTRAINT valid_whatsapp CHECK (whatsapp IS NULL OR whatsapp ~ '^601[0-9]{8,9}$'),
  CONSTRAINT valid_ren CHECK (ren_number ~ '^REN[0-9]{4,7}$')
);

-- Indexes
CREATE INDEX idx_agent_reg_status ON agent_registrations(verification_status);
CREATE INDEX idx_agent_reg_ren ON agent_registrations(ren_number);
CREATE INDEX idx_agent_reg_auth ON agent_registrations(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_reg_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_reg_updated_at
  BEFORE UPDATE ON agent_registrations
  FOR EACH ROW EXECUTE FUNCTION update_agent_reg_timestamp();

-- RLS
ALTER TABLE agent_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register as agent"
  ON agent_registrations FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own registration"
  ON agent_registrations FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can read all registrations"
  ON agent_registrations FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update registrations"
  ON agent_registrations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Storage policy for ren-tags folder
CREATE POLICY "Anon can upload REN tag"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'unit-media' AND (storage.foldername(name))[1] = 'ren-tags');

CREATE POLICY "Anyone can view REN tag"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'unit-media');
