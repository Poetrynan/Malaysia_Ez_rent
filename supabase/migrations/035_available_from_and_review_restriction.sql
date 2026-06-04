-- Migration 035: 添加可入住时间字段 + 评价权限限制（幂等版本，可重复运行）

-- 1. 添加 available_from 字段到 units 表
ALTER TABLE units ADD COLUMN IF NOT EXISTS available_from DATE;

-- 2. 创建函数：检查用户是否有资格评价（租约已完成）
CREATE OR REPLACE FUNCTION can_review_unit(p_user_id UUID, p_unit_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM leases
        WHERE tenant_id = p_user_id
        AND unit_id = p_unit_id
        AND status IN ('completed', 'expired', 'terminated')
    );
END;
$$ LANGUAGE plpgsql;

-- 3. 更新 reviews 表的 RLS 策略，添加评价资格检查
DROP POLICY IF EXISTS "Users can add reviews" ON reviews;

CREATE POLICY "Users can add reviews" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND can_review_unit(user_id, unit_id)
    );
