-- ============================================================
-- 迁移脚本：给 admin_users 表添加联系方式字段
-- 安全操作，不删表，不丢数据
-- 在 Supabase SQL Editor 中运行
-- ============================================================

-- 1. 添加新字段（都是可选的）
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS wechat_id VARCHAR(100);

-- 2. 先给现有管理员补充姓名和联系方式（否则约束加不上）
-- ⚠️ 请根据实际情况修改下面的值
UPDATE admin_users
SET display_name = COALESCE(display_name, split_part(email, '@', 1)),
    whatsapp = COALESCE(whatsapp, '请填写WhatsApp号码')
WHERE display_name IS NULL OR (phone IS NULL AND whatsapp IS NULL AND wechat_id IS NULL);

-- 3. 现有数据满足条件了，再加约束
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS at_least_one_contact;
ALTER TABLE admin_users ADD CONSTRAINT at_least_one_contact
  CHECK (phone IS NOT NULL OR whatsapp IS NOT NULL OR wechat_id IS NOT NULL);

-- 4. 更新 RLS 策略：允许所有登录用户读取管理员联系方式（学生需要看到）
DROP POLICY IF EXISTS "Anyone can read admin contact" ON admin_users;
CREATE POLICY "Anyone can read admin contact"
  ON admin_users FOR SELECT
  USING (true);

-- 5. RLS 策略：超级管理员可以增删改其他管理员
DROP POLICY IF EXISTS "Super admin can manage admins" ON admin_users;
CREATE POLICY "Super admin can manage admins"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 6. 把第一个管理员设为超级管理员（邮箱改成你的）
UPDATE admin_users
SET role = 'super_admin'
WHERE id = (SELECT id FROM admin_users ORDER BY created_at LIMIT 1);
