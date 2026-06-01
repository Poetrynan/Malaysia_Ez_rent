-- Migration 031: Add email column to public.users and sync with auth.users
-- This enables administrators to see and search tenant emails in the user directory.

-- 1. Add email column to public.users if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Backfill existing emails from auth.users to public.users
UPDATE public.users pu
SET email = au.email
FROM auth.users au
WHERE pu.id = au.id;

-- 3. Update the auth trigger function to automatically populate and sync email
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update in public.users, including email
  INSERT INTO public.users (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  -- If this newly registered email exists in admin_users, update the ID to link permissions
  IF NEW.email IS NOT NULL THEN
    UPDATE public.admin_users
    SET id = NEW.id
    WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
