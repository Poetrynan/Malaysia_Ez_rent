-- ============================================================
-- 迁移脚本：限制管理员最多 3 人
-- 在 Supabase SQL Editor 中运行
-- ============================================================

-- 用触发器限制 admin_users 表最多 3 条记录
CREATE OR REPLACE FUNCTION check_admin_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM admin_users) >= 5 THEN
    RAISE EXCEPTION '管理员数量已达上限（最多 5 人）';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS limit_admin_count ON admin_users;
CREATE TRIGGER limit_admin_count
  BEFORE INSERT ON admin_users
  FOR EACH ROW EXECUTE FUNCTION check_admin_count();
