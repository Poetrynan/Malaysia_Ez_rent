-- Migration 031: Add pre-registration agent approval notification trigger
-- Description: Automatically inserts an approval notification when a pre-approved agent registers

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
    
    -- Also send an approval notification if they were linked as admin/agent
    IF FOUND THEN
      -- Check if notification already exists to avoid duplicates
      IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = NEW.id AND type = 'agent_status') THEN
        INSERT INTO public.user_notifications (user_id, title, content, type, is_read)
        VALUES (
          NEW.id,
          '中介申请已通过 / Agent Application Approved',
          '您的中介申请已通过审核，现在您可以发布房源和管理租约了！ / Your agent application has been approved, you can now post listings and manage leases!',
          'agent_status',
          FALSE
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
