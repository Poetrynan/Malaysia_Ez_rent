-- Migration 015: RPC for tenant interest submit/cancel (bypasses missing UPDATE RLS on older envs)

CREATE OR REPLACE FUNCTION public.submit_tenant_interest(p_unit_id uuid, p_note text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_row tenant_interests;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), '')
  INTO v_email, v_name
  FROM auth.users u
  WHERE u.id = v_user_id;

  INSERT INTO tenant_interests (unit_id, user_id, email, full_name, note, status)
  VALUES (
    p_unit_id,
    v_user_id,
    COALESCE(v_email, ''),
    COALESCE(v_name, ''),
    COALESCE(p_note, ''),
    'interested'
  )
  ON CONFLICT (unit_id, user_id)
  DO UPDATE SET
    note = EXCLUDED.note,
    status = 'interested',
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'interest', to_jsonb(v_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_tenant_interest(p_unit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE tenant_interests
  SET status = 'left'
  WHERE unit_id = p_unit_id AND user_id = v_user_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tenant_interest(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_tenant_interest(uuid) TO authenticated;
