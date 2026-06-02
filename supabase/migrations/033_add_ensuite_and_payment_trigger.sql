-- Migration 033: Add Ensuite room type + generate_lease_payments trigger

-- 1. Update room_type CHECK constraint to include 'Ensuite'
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_room_type_check;
ALTER TABLE units ADD CONSTRAINT units_room_type_check
    CHECK (room_type IN ('Studio', 'Master Room', 'Medium Room', 'Small Room', 'Ensuite', 'Whole Unit'));

-- 2. Drop and recreate the function (clean approach)
DROP FUNCTION IF EXISTS generate_lease_payments() CASCADE;

CREATE OR REPLACE FUNCTION generate_lease_payments()
RETURNS TRIGGER AS $$
DECLARE
    current_month DATE;
    end_month DATE;
BEGIN
    current_month := date_trunc('month', NEW.start_date)::DATE;
    end_month := date_trunc('month', NEW.end_date)::DATE;

    WHILE current_month <= end_month LOOP
        INSERT INTO payment_records (lease_id, billing_month, paid, paid_date)
        VALUES (NEW.id, current_month, FALSE, NULL)
        ON CONFLICT (lease_id, billing_month) DO NOTHING;
        current_month := (current_month + INTERVAL '1 month')::DATE;
    END LOOP;

    UPDATE units SET status = 'rented' WHERE id = NEW.unit_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS after_lease_insert ON leases;

CREATE TRIGGER after_lease_insert
AFTER INSERT ON leases
FOR EACH ROW
EXECUTE FUNCTION generate_lease_payments();
