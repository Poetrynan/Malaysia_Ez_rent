-- Migration: Co-renting feature
-- 003_corenting.sql

-- 1. Units: add max occupants
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'max_occupants') THEN
    ALTER TABLE units ADD COLUMN max_occupants INT DEFAULT 1;
  END IF;
END $$;

-- 2. Tenant interests table
CREATE TABLE IF NOT EXISTS tenant_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  note TEXT DEFAULT '',
  status TEXT DEFAULT 'interested',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (unit_id, user_id)
);

-- 3. Check constraint for status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_interests_status_check') THEN
    ALTER TABLE tenant_interests ADD CONSTRAINT tenant_interests_status_check CHECK (status IN ('interested', 'confirmed', 'left'));
  END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_interests_unit ON tenant_interests(unit_id);
CREATE INDEX IF NOT EXISTS idx_interests_user ON tenant_interests(user_id);

-- 5. RLS
ALTER TABLE tenant_interests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view interests' AND tablename = 'tenant_interests') THEN
    CREATE POLICY "Anyone can view interests" ON tenant_interests FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can express interest' AND tablename = 'tenant_interests') THEN
    CREATE POLICY "Users can express interest" ON tenant_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can cancel own interest' AND tablename = 'tenant_interests') THEN
    CREATE POLICY "Users can cancel own interest" ON tenant_interests FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all interests' AND tablename = 'tenant_interests') THEN
    CREATE POLICY "Admins can manage all interests" ON tenant_interests FOR ALL USING (
      EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );
  END IF;
END $$;
