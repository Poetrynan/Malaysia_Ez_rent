-- Migration 025: Fix missing public.users rows
-- Problem: If handle_new_auth_user trigger was not applied, existing auth.users
-- have no corresponding public.users row, causing feedback lists to show UUIDs.
-- This migration re-creates the trigger and backfills missing rows.

-- Step 1: Ensure the trigger function exists
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Step 3: Backfill — insert public.users rows for any auth.users that are missing
-- This uses a direct insert from auth.users (requires superuser/service_role)
INSERT INTO public.users (id, full_name, avatar_url)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''),
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture', '')
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
