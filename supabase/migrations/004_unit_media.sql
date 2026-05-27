-- ============================================================
-- Migration 004: Unit media + admin contact + storage
-- 在 Supabase SQL Editor 中分两次运行（复制粘贴即可）
-- ============================================================

-- ╔══════════════════════════════════════════════════════════╗
-- ║  第 1 段：添加列（安全，可反复运行）                      ║
-- ╚══════════════════════════════════════════════════════════╝

-- 0. Admin users: contact fields + payment QR
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'display_name') THEN
    ALTER TABLE admin_users ADD COLUMN display_name VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'phone') THEN
    ALTER TABLE admin_users ADD COLUMN phone VARCHAR(30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'whatsapp') THEN
    ALTER TABLE admin_users ADD COLUMN whatsapp VARCHAR(30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'wechat_id') THEN
    ALTER TABLE admin_users ADD COLUMN wechat_id VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'payment_qr_code') THEN
    ALTER TABLE admin_users ADD COLUMN payment_qr_code TEXT;
  END IF;
END $$;

-- Fill defaults for existing admins
UPDATE admin_users
SET display_name = COALESCE(display_name, split_part(email, '@', 1)),
    whatsapp = COALESCE(whatsapp, '请填写WhatsApp号码')
WHERE display_name IS NULL OR (phone IS NULL AND whatsapp IS NULL AND wechat_id IS NULL);

-- Contact constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS at_least_one_contact;
ALTER TABLE admin_users ADD CONSTRAINT at_least_one_contact
  CHECK (phone IS NOT NULL OR whatsapp IS NOT NULL OR wechat_id IS NOT NULL);

-- 1. Units: media_urls
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'media_urls') THEN
    ALTER TABLE units ADD COLUMN media_urls TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 2. Communities: amenities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'amenities') THEN
    ALTER TABLE communities ADD COLUMN amenities TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 3. Leases: deposit months
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leases' AND column_name = 'security_deposit_months') THEN
    ALTER TABLE leases ADD COLUMN security_deposit_months NUMERIC DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leases' AND column_name = 'utility_deposit_months') THEN
    ALTER TABLE leases ADD COLUMN utility_deposit_months NUMERIC DEFAULT 0.5;
  END IF;
END $$;

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-media', 'unit-media', true)
ON CONFLICT (id) DO NOTHING;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  第 2 段：RLS 策略（先删后建，可反复运行）                ║
-- ╚══════════════════════════════════════════════════════════╝

-- admin_users 策略
DROP POLICY IF EXISTS "Admin check policy" ON admin_users;
DROP POLICY IF EXISTS "Anyone can read admin contact" ON admin_users;
DROP POLICY IF EXISTS "Super admin can manage admins" ON admin_users;
DROP POLICY IF EXISTS "Allow public read on admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admin insert admins" ON admin_users;
DROP POLICY IF EXISTS "Super admin update admins" ON admin_users;
DROP POLICY IF EXISTS "Super admin delete admins" ON admin_users;
DROP POLICY IF EXISTS "Allow self insert admin" ON admin_users;
DROP POLICY IF EXISTS "Allow self update admin" ON admin_users;

-- 所有人可读（学生需要读管理员联系方式和收款码）
CREATE POLICY "Anyone can read admin contact"
  ON admin_users FOR SELECT USING (true);

-- 允许首位超级管理员自动注册，或由超级管理员直接添加其他管理员
CREATE POLICY "Allow self insert admin"
  ON admin_users FOR INSERT
  WITH CHECK (
    id = auth.uid() 
    AND email = 'admin@ezrent.my'
    AND role = 'super_admin'
  );

-- 允许用户更新自己的管理员行 (包含初次登录时将随机 ID 变更为 auth.uid())
CREATE POLICY "Allow self update admin"
  ON admin_users FOR UPDATE
  USING (id = auth.uid() OR email = auth.jwt()->>'email');

-- 超级管理员可增删改其他管理员
CREATE POLICY "Super admin insert admins"
  ON admin_users FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Super admin update admins"
  ON admin_users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Super admin delete admins"
  ON admin_users FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super_admin'));

-- Storage 策略
DROP POLICY IF EXISTS "Public can view unit media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload unit media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete unit media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can manage unit media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload unit media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete unit media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update unit media" ON storage.objects;

CREATE POLICY "Public can view unit media" ON storage.objects
  FOR SELECT USING (bucket_id = 'unit-media');

CREATE POLICY "Authenticated can upload unit media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'unit-media');

CREATE POLICY "Authenticated can delete unit media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'unit-media');

CREATE POLICY "Authenticated can update unit media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'unit-media')
  WITH CHECK (bucket_id = 'unit-media');
