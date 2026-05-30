-- Migration 028: Remove total admin count limit, allow unlimited agents, and restrict super admins count to 5
-- Also set primary developer emails as super_admin

-- 1. Drop the old trigger and function that limited the total admin count to 5
DROP TRIGGER IF EXISTS limit_admin_count ON admin_users;
DROP FUNCTION IF EXISTS check_admin_count();

-- 2. Create a new function and trigger to limit only "super_admin" roles to maximum 5
CREATE OR REPLACE FUNCTION check_super_admin_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only count as super_admin if the role is being inserted/updated to super_admin
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
