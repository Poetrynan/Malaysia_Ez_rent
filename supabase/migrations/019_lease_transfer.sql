-- Migration 019: Co-tenant substitution for Whole Unit rentals
-- 019_lease_transfer.sql

-- 1. Safely update leases status check constraint
ALTER TABLE leases DROP CONSTRAINT IF EXISTS leases_status_check;
ALTER TABLE leases ADD CONSTRAINT leases_status_check CHECK (status IN ('active', 'completed', 'terminated', 'transferred'));

-- 2. Create Lease Group table if not exists
CREATE TABLE IF NOT EXISTS lease_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'breached', 'completed')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add lease_group_id to leases table if not exists
ALTER TABLE leases ADD COLUMN IF NOT EXISTS lease_group_id UUID REFERENCES lease_groups(id) ON DELETE SET NULL;

-- 4. Create Lease Transfers tracking table
CREATE TABLE IF NOT EXISTS lease_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_group_id UUID REFERENCES lease_groups(id) ON DELETE CASCADE,
    exiting_lease_id UUID REFERENCES leases(id) ON DELETE RESTRICT,
    exiting_tenant_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    incoming_tenant_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    transfer_date DATE NOT NULL,
    deposit_handle_type VARCHAR(20) CHECK (deposit_handle_type IN ('transfer_to_new', 'refunded', 'forfeited')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE lease_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_transfers ENABLE ROW LEVEL SECURITY;

-- Add simple admin policies
CREATE POLICY "Admins manage lease groups" ON lease_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Anyone read lease groups" ON lease_groups FOR SELECT USING (true);

CREATE POLICY "Admins manage lease transfers" ON lease_transfers FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Anyone read lease transfers" ON lease_transfers FOR SELECT USING (true);

-- 5. Create Transactional RPC for substituting a co-tenant
CREATE OR REPLACE FUNCTION substitute_co_tenant(
  p_lease_group_id UUID,
  p_exiting_lease_id UUID,
  p_incoming_user_id UUID,
  p_transfer_date DATE,
  p_deposit_handle VARCHAR,
  p_notes TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_orig record;
  v_new_lease_id UUID;
  v_curr_billing_month DATE;
  v_loop_month DATE;
  v_inc_email TEXT;
BEGIN
  -- 1. Fetch original lease
  SELECT * INTO v_orig FROM leases WHERE id = p_exiting_lease_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exiting lease not found';
  END IF;

  -- 2. Fetch incoming user email
  SELECT email INTO v_inc_email FROM users WHERE id = p_incoming_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incoming user not found in users table';
  END IF;

  -- 3. Modify exiting lease: status -> transferred, end_date -> day before transfer
  UPDATE leases
  SET status = 'transferred',
      end_date = p_transfer_date - INTERVAL '1 day',
      admin_notes = COALESCE(admin_notes, '') || E'\n[System] Transferred to new tenant on ' || p_transfer_date::text
  WHERE id = p_exiting_lease_id;

  -- 4. Create new lease for the incoming tenant
  INSERT INTO leases (
    unit_id,
    lease_group_id,
    tenant_id,
    start_date,
    end_date,
    monthly_rent,
    deposit_amount,
    status,
    security_deposit_months,
    utility_deposit_months,
    admin_notes
  ) VALUES (
    v_orig.unit_id,
    p_lease_group_id,
    p_incoming_user_id,
    p_transfer_date,
    v_orig.end_date,
    v_orig.monthly_rent,
    CASE WHEN p_deposit_handle = 'transfer_to_new' THEN v_orig.deposit_amount ELSE 0.00 END,
    'active',
    v_orig.security_deposit_months,
    v_orig.utility_deposit_months,
    COALESCE(p_notes, '') || E'\n[System] Substituted from original tenant lease ID: ' || p_exiting_lease_id::text
  ) RETURNING id INTO v_new_lease_id;

  -- 5. Insert change history record
  INSERT INTO lease_transfers (
    lease_group_id,
    exiting_lease_id,
    exiting_tenant_id,
    incoming_tenant_id,
    transfer_date,
    deposit_handle_type,
    admin_notes
  ) VALUES (
    p_lease_group_id,
    p_exiting_lease_id,
    v_orig.tenant_id,
    p_incoming_user_id,
    p_transfer_date,
    p_deposit_handle,
    p_notes
  );

  -- 6. Perform billing adjustment for the transfer month (No pro-rating)
  v_curr_billing_month := date_trunc('month', p_transfer_date)::DATE;

  IF p_transfer_date = v_curr_billing_month THEN
    -- If transfer date is exactly the 1st of the month, the exiting tenant is not responsible for this month
    -- Delete the current month's unpaid bill for the exiting tenant
    DELETE FROM payment_records 
    WHERE lease_id = p_exiting_lease_id 
      AND billing_month >= v_curr_billing_month 
      AND paid = false;
      
    -- Start billing the incoming tenant from the current month
    v_loop_month := v_curr_billing_month;
  ELSE
    -- If transfer date is after the 1st of the month, the exiting tenant is responsible for this entire month
    -- Delete all future unpaid billing records of the exiting tenant after the current month
    DELETE FROM payment_records 
    WHERE lease_id = p_exiting_lease_id 
      AND billing_month > v_curr_billing_month 
      AND paid = false;
      
    -- Start billing the incoming tenant from the next month
    v_loop_month := (v_curr_billing_month + INTERVAL '1 month')::DATE;
  END IF;

  -- Generate standard full billing records for the incoming tenant for all active months
  WHILE v_loop_month <= v_orig.end_date LOOP
    INSERT INTO payment_records (
      lease_id,
      billing_month,
      paid,
      status,
      admin_notes
    ) VALUES (
      v_new_lease_id,
      v_loop_month,
      false,
      'unpaid',
      E'[System] Standard Monthly Rent'
    ) ON CONFLICT (lease_id, billing_month) DO NOTHING;

    v_loop_month := (v_loop_month + INTERVAL '1 month')::DATE;
  END LOOP;

  -- Update original unit's tenant interests status
  -- Mark exiting tenant as 'left', and incoming tenant as 'confirmed'
  UPDATE tenant_interests
  SET status = 'left'
  WHERE unit_id = v_orig.unit_id AND user_id = v_orig.tenant_id;

  INSERT INTO tenant_interests (
    unit_id,
    user_id,
    email,
    full_name,
    status
  ) VALUES (
    v_orig.unit_id,
    p_incoming_user_id,
    v_inc_email,
    (SELECT display_name FROM users WHERE id = p_incoming_user_id),
    'confirmed'
  ) ON CONFLICT (unit_id, user_id) DO UPDATE
  SET status = 'confirmed';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
