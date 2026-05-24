-- Migration 012: Update get_mobile_upload_info RPC to return room_type instead of unit_number for privacy / removal of door number
CREATE OR REPLACE FUNCTION public.get_mobile_upload_info(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id',             pr.id,
        'lease_id',       pr.lease_id,
        'billing_month',  pr.billing_month,
        'paid',           pr.paid,
        'evidence_url',   pr.evidence_url,
        'status',         pr.status,
        'monthly_rent',   l.monthly_rent,
        'room_type',      u.room_type,
        'community_name', c.name,
        'admin_qr_code',  COALESCE(
            (SELECT au.payment_qr_code FROM admin_users au WHERE au.id = u.agent_id),
            (SELECT au.payment_qr_code FROM admin_users au WHERE au.payment_qr_code IS NOT NULL LIMIT 1)
        )
    )
    INTO v_result
    FROM payment_records pr
    LEFT JOIN leases       l ON l.id = pr.lease_id
    LEFT JOIN units        u ON u.id = l.unit_id
    LEFT JOIN communities  c ON c.id = u.community_id
    WHERE pr.id = p_payment_id;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mobile_upload_info(uuid) TO anon, authenticated;
