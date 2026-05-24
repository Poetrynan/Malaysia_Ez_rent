-- 007_mobile_upload.sql
-- 修复手机端扫码上传支付凭证流程
--
-- 问题背景：
-- 学生在 PC 上看到收款二维码后用手机扫描，扫码后浏览器打开 /mobile-upload/[id]
-- 但此时手机浏览器没有登录态，payment_records 的 RLS 拒绝匿名 SELECT/UPDATE，
-- 导致页面提示「未找到该账单记录」，且即便能读到也无法上传到 Storage（unit-media 桶要求 authenticated）。
--
-- 解决方案：
-- 1) 用 SECURITY DEFINER 函数把「按账单 ID 读取最少必要字段」「按账单 ID 提交凭证」封装成 RPC，授权 anon 调用
--    —— 既绕过 RLS，又把权限收窄在「持有完整 UUID」即可访问的最小面，足够安全（UUID 是不可枚举的 128 位随机数）
-- 2) Storage 上加一条仅针对 unit-media/evidence/ 子目录的匿名插入/更新策略
--    —— 限定子目录，避免冲击其他房源图片的安全模型

-- ============================================================
-- 1. RPC：手机端拉取上传页所需的所有展示信息
-- ============================================================
DROP FUNCTION IF EXISTS public.get_mobile_upload_info(uuid);
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
        'unit_number',    u.unit_number,
        'community_name', c.name,
        'admin_qr_code',  (
            SELECT au.payment_qr_code
            FROM admin_users au
            WHERE au.payment_qr_code IS NOT NULL
            LIMIT 1
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

-- ============================================================
-- 2. RPC：手机端提交支付凭证（只允许写 evidence_url + 把状态置为 pending_review）
-- ============================================================
DROP FUNCTION IF EXISTS public.submit_mobile_payment_evidence(uuid, text);
CREATE OR REPLACE FUNCTION public.submit_mobile_payment_evidence(
    p_payment_id   uuid,
    p_evidence_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated payment_records%ROWTYPE;
BEGIN
    -- 已通过审核的账单不允许覆盖凭证
    UPDATE payment_records
       SET evidence_url = p_evidence_url,
           status       = 'pending_review'
     WHERE id   = p_payment_id
       AND paid = FALSE
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found or already approved (id=%)', p_payment_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
        'id',            v_updated.id,
        'evidence_url',  v_updated.evidence_url,
        'status',        v_updated.status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_mobile_payment_evidence(uuid, text) TO anon, authenticated;

-- ============================================================
-- 3. Storage：允许匿名将凭证图片上传到 unit-media/evidence/ 子目录
--    —— 仅限子目录，避免影响房源照片的现有权限模型
-- ============================================================
DROP POLICY IF EXISTS "Anon can upload payment evidence"  ON storage.objects;
DROP POLICY IF EXISTS "Anon can update payment evidence"  ON storage.objects;

-- INSERT：仅允许写入 unit-media/evidence/ 路径
CREATE POLICY "Anon can upload payment evidence"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'unit-media'
    AND (storage.foldername(name))[1] = 'evidence'
  );

-- UPDATE：upsert=true 时 supabase-js 会触发 UPDATE，需要单独放行
CREATE POLICY "Anon can update payment evidence"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'unit-media'
    AND (storage.foldername(name))[1] = 'evidence'
  )
  WITH CHECK (
    bucket_id = 'unit-media'
    AND (storage.foldername(name))[1] = 'evidence'
  );
