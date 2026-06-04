-- Migration 038: 中介评分系统（幂等版本，可重复运行）

-- 1. 创建中介评分表
CREATE TABLE IF NOT EXISTS agent_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, lease_id)  -- 每个租约只能评价一次
);

-- 2. 添加 RLS 策略
ALTER TABLE agent_ratings ENABLE ROW LEVEL SECURITY;

-- 所有人可查看评分（用于展示中介评分）
DROP POLICY IF EXISTS "Anyone can view agent ratings" ON agent_ratings;
CREATE POLICY "Anyone can view agent ratings" ON agent_ratings
    FOR SELECT USING (true);

-- 租客只能添加评价（需要有完成的租约）
DROP POLICY IF EXISTS "Tenants can add ratings" ON agent_ratings;
CREATE POLICY "Tenants can add ratings" ON agent_ratings
    FOR INSERT WITH CHECK (
        auth.uid() = tenant_id
        AND EXISTS (
            SELECT 1 FROM leases
            WHERE id = lease_id
            AND tenant_id = auth.uid()
            AND status IN ('completed', 'expired', 'terminated')
        )
    );

-- 租客只能删除自己的评价
DROP POLICY IF EXISTS "Tenants can delete own ratings" ON agent_ratings;
CREATE POLICY "Tenants can delete own ratings" ON agent_ratings
    FOR DELETE USING (auth.uid() = tenant_id);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_agent_ratings_agent ON agent_ratings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_tenant ON agent_ratings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_lease ON agent_ratings(lease_id);

-- 4. 创建获取中介平均评分的函数
CREATE OR REPLACE FUNCTION get_agent_average_rating(p_agent_id UUID)
RETURNS TABLE(average_rating NUMERIC, total_ratings BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROUND(AVG(ar.rating), 1)::NUMERIC as average_rating,
        COUNT(ar.id)::BIGINT as total_ratings
    FROM agent_ratings ar
    JOIN leases l ON ar.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    WHERE u.agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;
