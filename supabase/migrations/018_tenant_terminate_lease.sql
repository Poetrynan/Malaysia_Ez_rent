-- Create an RPC to safely allow tenants to terminate their own leases.
-- This bypasses RLS on `leases` and `units` because the tenant does not have UPDATE permissions.

CREATE OR REPLACE FUNCTION tenant_terminate_lease(p_lease_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Extremely important: runs as database owner to bypass RLS
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_unit_id UUID;
    v_curr_notes TEXT;
BEGIN
    -- 1. Get lease details and ensure it's currently 'active'
    SELECT tenant_id, unit_id, admin_notes
    INTO v_tenant_id, v_unit_id, v_curr_notes
    FROM leases
    WHERE id = p_lease_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lease % not found or not active', p_lease_id;
    END IF;

    -- 2. Security Check: ensure the current authenticated user owns this lease
    IF v_tenant_id != auth.uid() THEN
        RAISE EXCEPTION 'User % is not authorized to terminate lease %', auth.uid(), p_lease_id;
    END IF;

    -- 3. Mark the lease as terminated and append to admin_notes
    UPDATE leases
    SET status = 'terminated',
        admin_notes = TRIM(COALESCE(v_curr_notes, '') || E'\n[' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '] Terminated by tenant.')
    WHERE id = p_lease_id;

    -- 4. Mark the unit as available again
    IF v_unit_id IS NOT NULL THEN
        UPDATE units
        SET status = 'available'
        WHERE id = v_unit_id;

        -- 5. Also mark the tenant interest as 'left' so it doesn't show up in listings as active
        UPDATE tenant_interests
        SET status = 'left'
        WHERE unit_id = v_unit_id AND user_id = v_tenant_id;
    END IF;
END;
$$;
