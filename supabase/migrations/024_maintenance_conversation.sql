-- 024_maintenance_conversation.sql
-- Convert admin_reply TEXT to JSONB conversation thread
-- Remove rating column (unused feature)

-- 1. Add updated_at column first (needed by step 3 migration)
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Add new JSONB column for conversation thread
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS replies JSONB DEFAULT '[]'::jsonb;

-- 3. Migrate existing admin_reply text into the new format
UPDATE maintenance_requests
SET replies = jsonb_build_array(
  jsonb_build_object(
    'role', 'agent',
    'content', admin_reply,
    'at', COALESCE(resolved_at, updated_at, created_at)
  )
)
WHERE admin_reply IS NOT NULL AND admin_reply != ''
  AND (replies IS NULL OR replies = '[]'::jsonb);

-- 4. Drop old admin_reply column
ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS admin_reply;

-- 5. Drop rating column
ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS rating;

-- 6. Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_maintenance_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_updated_at ON maintenance_requests;
CREATE TRIGGER maintenance_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_timestamp();
