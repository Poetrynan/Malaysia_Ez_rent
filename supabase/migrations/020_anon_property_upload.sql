-- 020_anon_property_upload.sql
-- Enable anon uploads to property folder and create mobile_upload_sessions table

-- 1. Create table for mobile upload sessions
CREATE TABLE IF NOT EXISTS public.mobile_upload_sessions (
    id VARCHAR(100) PRIMARY KEY,
    media_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mobile_upload_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public select on mobile_upload_sessions" ON public.mobile_upload_sessions;
DROP POLICY IF EXISTS "Allow public insert on mobile_upload_sessions" ON public.mobile_upload_sessions;
DROP POLICY IF EXISTS "Allow public update on mobile_upload_sessions" ON public.mobile_upload_sessions;

-- Policies for public access (uuid/session_id are unguessable)
CREATE POLICY "Allow public select on mobile_upload_sessions"
  ON public.mobile_upload_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert on mobile_upload_sessions"
  ON public.mobile_upload_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update on mobile_upload_sessions"
  ON public.mobile_upload_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Storage Policies for 'property' folder in 'unit-media' bucket
DROP POLICY IF EXISTS "Anon can upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update property photos" ON storage.objects;

CREATE POLICY "Anon can upload property photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'unit-media'
    AND (storage.foldername(name))[1] = 'property'
  );

CREATE POLICY "Anon can update property photos"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'unit-media'
    AND (storage.foldername(name))[1] = 'property'
  )
  WITH CHECK (
    bucket_id = 'unit-media'
    AND (storage.foldername(name))[1] = 'property'
  );
