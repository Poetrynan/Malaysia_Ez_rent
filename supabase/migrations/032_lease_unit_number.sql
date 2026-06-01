-- Migration 032: Add unit_number to leases table
-- The agent fills in the tenant's unit/room number when creating a lease contract.
-- This value flows to the tenant profile (read-only) and payment review screens.

ALTER TABLE leases ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100);

-- When a lease is terminated or completed, clear unit_number from the tenant's profile
-- so stale room numbers don't persist after the tenant moves out.
CREATE OR REPLACE FUNCTION clear_user_unit_number_on_lease_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('terminated', 'completed') AND OLD.status = 'active' THEN
    UPDATE users SET unit_number = NULL WHERE id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clear_unit_number ON leases;
CREATE TRIGGER trigger_clear_unit_number
  AFTER UPDATE OF status ON leases
  FOR EACH ROW
  EXECUTE FUNCTION clear_user_unit_number_on_lease_end();
