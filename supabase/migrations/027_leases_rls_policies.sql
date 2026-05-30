-- 027_leases_rls_policies.sql
-- Fix: leases and payment_records tables have RLS enabled but NO policies,
-- causing all browser-client queries to return empty results.

-- ============================================================
-- LEASES TABLE POLICIES
-- ============================================================

-- Tenants can view their own leases
DROP POLICY IF EXISTS "Tenants can view own leases" ON leases;
CREATE POLICY "Tenants can view own leases" ON leases FOR SELECT
  USING (auth.uid() = tenant_id);

-- Admins can view all leases
DROP POLICY IF EXISTS "Admins can view all leases" ON leases;
CREATE POLICY "Admins can view all leases" ON leases FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Admins can insert leases
DROP POLICY IF EXISTS "Admins can insert leases" ON leases;
CREATE POLICY "Admins can insert leases" ON leases FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Admins can update leases
DROP POLICY IF EXISTS "Admins can update leases" ON leases;
CREATE POLICY "Admins can update leases" ON leases FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Admins can delete leases
DROP POLICY IF EXISTS "Admins can delete leases" ON leases;
CREATE POLICY "Admins can delete leases" ON leases FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ============================================================
-- PAYMENT_RECORDS TABLE POLICIES
-- ============================================================

-- Tenants can view their own payment records (via lease)
DROP POLICY IF EXISTS "Tenants can view own payments" ON payment_records;
CREATE POLICY "Tenants can view own payments" ON payment_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM leases WHERE leases.id = payment_records.lease_id AND leases.tenant_id = auth.uid()
  ));

-- Admins can view all payment records
DROP POLICY IF EXISTS "Admins can view all payments" ON payment_records;
CREATE POLICY "Admins can view all payments" ON payment_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Admins can insert payment records
DROP POLICY IF EXISTS "Admins can insert payments" ON payment_records;
CREATE POLICY "Admins can insert payments" ON payment_records FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Admins can update payment records
DROP POLICY IF EXISTS "Admins can update payments" ON payment_records;
CREATE POLICY "Admins can update payments" ON payment_records FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Admins can delete payment records
DROP POLICY IF EXISTS "Admins can delete payments" ON payment_records;
CREATE POLICY "Admins can delete payments" ON payment_records FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
