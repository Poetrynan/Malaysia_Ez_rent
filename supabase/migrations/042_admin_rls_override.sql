-- 042_admin_rls_override.sql
-- 一劳永逸：创建 admin 判断函数 + 给所有关键表加管理员全局策略
-- 以后新建表只需调用 admin_policy() 即可

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

-- maintenance_conversations（维修对话）
DROP POLICY IF EXISTS "Admins can manage all maintenance conversations" ON maintenance_conversations;
CREATE POLICY "Admins can manage all maintenance conversations" ON maintenance_conversations
    FOR ALL USING (is_super_admin());

-- user_notifications（用户通知）
DROP POLICY IF EXISTS "Admins can manage all notifications" ON user_notifications;
CREATE POLICY "Admins can manage all notifications" ON user_notifications
    FOR ALL USING (is_super_admin());

-- admin_notifications（管理通知）
DROP POLICY IF EXISTS "Admins can manage admin notifications" ON admin_notifications;
CREATE POLICY "Admins can manage admin notifications" ON admin_notifications
    FOR ALL USING (is_super_admin());

-- announcements（公告）
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Admins can manage announcements" ON announcements
    FOR ALL USING (is_super_admin());

-- unit_images（房源图片）
DROP POLICY IF EXISTS "Admins can manage unit images" ON unit_images;
CREATE POLICY "Admins can manage unit images" ON unit_images
    FOR ALL USING (is_super_admin());

-- rental_knowledge_base（知识库）
DROP POLICY IF EXISTS "Admins can manage knowledge base" ON rental_knowledge_base;
CREATE POLICY "Admins can manage knowledge base" ON rental_knowledge_base
    FOR ALL USING (is_super_admin());
