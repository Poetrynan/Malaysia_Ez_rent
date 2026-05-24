-- 009_unit_video_url.sql
-- Store one optional walkthrough video per unit (Supabase Storage URL)

ALTER TABLE units ADD COLUMN IF NOT EXISTS video_url TEXT;
