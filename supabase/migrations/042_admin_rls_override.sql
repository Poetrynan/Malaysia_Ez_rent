-- 042_admin_rls_override.sql
-- 一劳永逸：创建 admin 判断函数 + 给所有关键表加管理员全局策略

-- 1. 创建 admin 判断函数（可复用）
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. 给所有关键表加管理员 DELETE + UPDATE 策略

-- reviews（评价）
DROP POLICY IF EXISTS "Admins can delete any review" ON reviews;
CREATE POLICY "Admins can delete any review" ON reviews
    FOR DELETE USING (is_super_admin());
DROP POLICY IF EXISTS "Admins can update any review" ON reviews;
CREATE POLICY "Admins can update any review" ON reviews
    FOR UPDATE USING (is_super_admin());

-- agent_ratings（中介评分）
DROP POLICY IF EXISTS "Admins can delete any agent rating" ON agent_ratings;
CREATE POLICY "Admins can delete any agent rating" ON agent_ratings
    FOR DELETE USING (is_super_admin());
DROP POLICY IF EXISTS "Admins can update any agent rating" ON agent_ratings;
CREATE POLICY "Admins can update any agent rating" ON agent_ratings
    FOR UPDATE USING (is_super_admin());

-- units（房源）
DROP POLICY IF EXISTS "Admins can manage all units" ON units;
CREATE POLICY "Admins can manage all units" ON units
    FOR ALL USING (is_super_admin());

-- communities（小区）
DROP POLICY IF EXISTS "Admins can manage all communities" ON communities;
CREATE POLICY "Admins can manage all communities" ON communities
    FOR ALL USING (is_super_admin());

-- leases（租约）
DROP POLICY IF EXISTS "Admins can manage all leases" ON leases;
CREATE POLICY "Admins can manage all leases" ON leases
    FOR ALL USING (is_super_admin());

-- favorites（收藏）
DROP POLICY IF EXISTS "Admins can manage all favorites" ON favorites;
CREATE POLICY "Admins can manage all favorites" ON favorites
    FOR ALL USING (is_super_admin());

-- maintenance_requests（维修工单）
DROP POLICY IF EXISTS "Admins can manage all maintenance" ON maintenance_requests;
CREATE POLICY "Admins can manage all maintenance" ON maintenance_requests
    FOR ALL USING (is_super_admin());

-- user_notifications（用户通知）
DROP POLICY IF EXISTS "Admins can manage all notifications" ON user_notifications;
CREATE POLICY "Admins can manage all notifications" ON user_notifications
    FOR ALL USING (is_super_admin());

-- unit_images（房源图片）
DROP POLICY IF EXISTS "Admins can manage unit images" ON unit_images;
CREATE POLICY "Admins can manage unit images" ON unit_images
    FOR ALL USING (is_super_admin());

-- rental_knowledge_base（知识库）
DROP POLICY IF EXISTS "Admins can manage knowledge base" ON rental_knowledge_base;
CREATE POLICY "Admins can manage knowledge base" ON rental_knowledge_base
    FOR ALL USING (is_super_admin());

-- 3. 自动为新建表添加管理员策略（Event Trigger）
CREATE OR REPLACE FUNCTION auto_admin_policy()
RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'
  LOOP
    EXECUTE format(
      'CREATE POLICY "Admins can manage %s" ON %s FOR ALL USING (is_super_admin())',
      obj.object_identity, obj.object_identity
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP EVENT TRIGGER IF EXISTS auto_admin_policy_trigger;
CREATE EVENT TRIGGER auto_admin_policy_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION auto_admin_policy();
