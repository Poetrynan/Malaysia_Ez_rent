-- ============================================================================
-- 042_admin_rls_override.sql
-- 一劳永逸的超管权限方案
-- ============================================================================
--
-- 问题背景：
--   项目的每张表都启用了 RLS（Row Level Security），默认策略只允许用户操作自己的数据。
--   管理员（super_admin）需要用管理员身份删除/修改其他用户的数据（如删除评价、中介评分等）。
--   之前每张表都要单独写管理员策略，容易遗漏，导致管理员操作被数据库静默拒绝。
--
-- 本迁移做三件事：
--   1. 创建 is_super_admin() 函数 — 判断当前用户是否是超管
--   2. 给现有 10 张关键表批量加管理员策略
--   3. 创建 Event Trigger — 以后新建表时自动加管理员策略，不用再手动改数据库
--
-- 权限说明：
--   - super_admin（超管）：对所有表有完整 CRUD 权限（通过 is_super_admin() 判断）
--   - editor（普通中介）：只能操作自己的数据，不能删别人的评价/评分
--   - 普通用户：只能操作自己的数据
--
-- 前端配合：
--   - 前端通过 adminRole === 'super_admin' 控制 UI 显示（如删除按钮、管理 Tab）
--   - 数据库通过 RLS 策略控制实际数据操作权限
--   - 两层配合：前端决定"看不看到"，RLS 决定"能不能做"
-- ============================================================================

-- ──────────────────────────────────────────────────────────────
-- 1. 创建 is_super_admin() 函数
-- ──────────────────────────────────────────────────────────────
-- 作用：判断当前登录用户（auth.uid()）是否在 admin_users 表中且角色为 super_admin
-- 特点：
--   - SECURITY DEFINER：函数以创建者权限执行，避免 RLS 递归
--   - STABLE：结果在同一事务内不变，提升性能
--   - 可复用：任何 RLS 策略都可以调用 is_super_admin() 来判断权限
-- 以后新表加策略只需：FOR ALL USING (is_super_admin())
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ──────────────────────────────────────────────────────────────
-- 2. 给现有关键表加管理员策略
-- ──────────────────────────────────────────────────────────────
-- 每张表的策略说明：
--   FOR DELETE — 允许超管删除任何人的数据（如删除违规评价）
--   FOR UPDATE — 允许超管修改任何人的数据（如修改房源信息）
--   FOR ALL   — 允许超管完整 CRUD（增删改查），用于管理类表
-- DROP POLICY IF EXISTS 保证幂等，重复跑不会报错

-- reviews（租客评价表）
-- 之前的问题：只有评价作者能删除自己的评价，超管删不了别人的 → RLS 静默拒绝
-- 解决：加 DELETE + UPDATE 策略，超管可以删除任何评价
DROP POLICY IF EXISTS "Admins can delete any review" ON reviews;
CREATE POLICY "Admins can delete any review" ON reviews
    FOR DELETE USING (is_super_admin());
DROP POLICY IF EXISTS "Admins can update any review" ON reviews;
CREATE POLICY "Admins can update any review" ON reviews
    FOR UPDATE USING (is_super_admin());

-- agent_ratings（中介评分表）
-- 同上：租客对中介的评分，超管需要能删除不当评价
DROP POLICY IF EXISTS "Admins can delete any agent rating" ON agent_ratings;
CREATE POLICY "Admins can delete any agent rating" ON agent_ratings
    FOR DELETE USING (is_super_admin());
DROP POLICY IF EXISTS "Admins can update any agent rating" ON agent_ratings;
CREATE POLICY "Admins can update any agent rating" ON agent_ratings
    FOR UPDATE USING (is_super_admin());

-- units（房源表）
-- 超管需要能管理所有房源（上架、下架、修改信息）
DROP POLICY IF EXISTS "Admins can manage all units" ON units;
CREATE POLICY "Admins can manage all units" ON units
    FOR ALL USING (is_super_admin());

-- communities（小区表）
-- 超管需要能管理小区信息（添加、修改、删除）
DROP POLICY IF EXISTS "Admins can manage all communities" ON communities;
CREATE POLICY "Admins can manage all communities" ON communities
    FOR ALL USING (is_super_admin());

-- leases（租约表）
-- 超管需要能管理所有租约（创建、修改、终止）
DROP POLICY IF EXISTS "Admins can manage all leases" ON leases;
CREATE POLICY "Admins can manage all leases" ON leases
    FOR ALL USING (is_super_admin());

-- favorites（收藏表）
-- 超管需要能查看和管理所有用户的收藏数据
DROP POLICY IF EXISTS "Admins can manage all favorites" ON favorites;
CREATE POLICY "Admins can manage all favorites" ON favorites
    FOR ALL USING (is_super_admin());

-- maintenance_requests（维修工单表）
-- 超管需要能管理所有维修工单（分配、关闭、删除）
DROP POLICY IF EXISTS "Admins can manage all maintenance" ON maintenance_requests;
CREATE POLICY "Admins can manage all maintenance" ON maintenance_requests
    FOR ALL USING (is_super_admin());

-- user_notifications（用户通知表）
-- 超管需要能发送和管理系统通知
DROP POLICY IF EXISTS "Admins can manage all notifications" ON user_notifications;
CREATE POLICY "Admins can manage all notifications" ON user_notifications
    FOR ALL USING (is_super_admin());

-- unit_images（房源图片表）
-- 超管需要能管理所有房源的图片（上传、删除）
DROP POLICY IF EXISTS "Admins can manage unit images" ON unit_images;
CREATE POLICY "Admins can manage unit images" ON unit_images
    FOR ALL USING (is_super_admin());

-- rental_knowledge_base（AI 知识库表）
-- 超管需要能管理 AI 助手的知识库数据（导入、更新、删除小区信息）
DROP POLICY IF EXISTS "Admins can manage knowledge base" ON rental_knowledge_base;
CREATE POLICY "Admins can manage knowledge base" ON rental_knowledge_base
    FOR ALL USING (is_super_admin());

-- ──────────────────────────────────────────────────────────────
-- 3. Event Trigger：自动为未来新表加管理员策略
-- ──────────────────────────────────────────────────────────────
-- 原理：PostgreSQL 的 Event Trigger 会在 DDL 事件（如 CREATE TABLE）执行后自动触发
-- 效果：以后任何新表创建时，自动为超管添加 FOR ALL USING (is_super_admin()) 策略
-- 好处：以后加新功能建新表时，不用再手动写管理员 RLS 策略
--
-- 工作流程：
--   1. 开发者执行 CREATE TABLE new_feature (...)
--   2. Event Trigger 自动触发 auto_admin_policy() 函数
--   3. 函数自动执行：CREATE POLICY "Admins can manage new_feature" ON new_feature FOR ALL USING (is_super_admin())
--   4. 超管立刻对该表有完整权限，无需额外操作
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
