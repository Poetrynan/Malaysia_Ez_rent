-- Migration 028: Remove total admin count limit, allow unlimited agents, and restrict super admins count to 5
-- Also set primary developer emails as super_admin, and auto-link Auth IDs by email.

-- 1. Drop the old trigger and function that limited the total admin count to 5
DROP TRIGGER IF EXISTS limit_admin_count ON admin_users;
DROP FUNCTION IF EXISTS check_admin_count();

-- 2. Create a new function and trigger to limit only "super_admin" roles to maximum 5
CREATE OR REPLACE FUNCTION check_super_admin_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'super_admin' AND (SELECT COUNT(*) FROM admin_users WHERE role = 'super_admin' AND id <> NEW.id) >= 5 THEN
    RAISE EXCEPTION '超级管理员（Super Admin）数量已达上限（最多 5 人）';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS limit_super_admin_count ON admin_users;
CREATE TRIGGER limit_super_admin_count
  BEFORE INSERT OR UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION check_super_admin_count();

-- 3. Set the key developer and admin emails to 'super_admin' role
UPDATE admin_users
SET role = 'super_admin'
WHERE email IN ('poetrynan666@gmail.com', 'esarrol2@gmail.com');

-- 4. Trigger BEFORE INSERT on admin_users to automatically map email to existing auth.users ID
CREATE OR REPLACE FUNCTION public.sync_admin_user_id()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Look up if user already exists in auth.users by email
  SELECT id INTO v_auth_id FROM auth.users WHERE email = NEW.email LIMIT 1;
  IF v_auth_id IS NOT NULL THEN
    NEW.id := v_auth_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_admin_id_before_insert ON public.admin_users;
CREATE TRIGGER sync_admin_id_before_insert
  BEFORE INSERT ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_user_id();

-- 5. Update auth user trigger to automatically link pre-created admin records when new users sign up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- If this newly registered email exists in admin_users, update the ID to link permissions
  IF NEW.email IS NOT NULL THEN
    UPDATE public.admin_users
    SET id = NEW.id
    WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
