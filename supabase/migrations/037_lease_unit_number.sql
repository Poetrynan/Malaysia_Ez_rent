-- Migration 037: Add unit_number to leases table + auto-expiry + clear unit_number on lease end

ALTER TABLE leases ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100);

-- Clear unit_number from the tenant's profile when a lease leaves 'active' status
-- (terminated, expired, or completed).
CREATE OR REPLACE FUNCTION clear_user_unit_number_on_lease_end()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status IN ('terminated', 'expired', 'completed') THEN
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

-- Auto-expire leases whose end_date has passed.
-- Called by the app on lease list load (one call per session is enough).
CREATE OR REPLACE FUNCTION expire_ended_leases()
RETURNS void AS $$
BEGIN
  UPDATE leases
    SET status = 'expired'
    WHERE status = 'active'
      AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
