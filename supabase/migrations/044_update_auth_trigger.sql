-- Migration 044: Update auth trigger — remove notification insert
-- Description: Updates handle_new_auth_user() to remove the automatic
--              user_notifications insert for agent_status (now using email).

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create public user profile
  INSERT INTO public.users (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- If this email exists in admin_users, link the auth ID
  IF NEW.email IS NOT NULL THEN
    UPDATE public.admin_users SET id = NEW.id WHERE email = NEW.email;
    -- NOTE: Removed auto-insert of user_notifications for agent_status.
    -- Approval/rejection notifications are now sent via email (Resend API).
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
