-- 040_rental_knowledge_base.sql
-- External rental knowledge base for AI Agent RAG retrieval

-- 1. Knowledge base table
CREATE TABLE IF NOT EXISTS rental_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_name VARCHAR(200) NOT NULL,
    community_name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    state VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    description TEXT,
    property_type VARCHAR(100),
    data JSONB NOT NULL,           -- Full rich data (price_range, pros, cons, ratings, etc.)
    embedding VECTOR(1024),        -- bge-m3 semantic embedding
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_rkb_university ON rental_knowledge_base(university_name);
CREATE INDEX IF NOT EXISTS idx_rkb_community ON rental_knowledge_base(community_name);
CREATE INDEX IF NOT EXISTS idx_rkb_state ON rental_knowledge_base(state);

-- 3. Semantic search function (cosine similarity)
CREATE OR REPLACE FUNCTION match_knowledge_base (
    query_embedding VECTOR(1024),
    match_threshold FLOAT DEFAULT 0.2,
    match_count INT DEFAULT 5,
    filter_state VARCHAR DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    university_name VARCHAR,
    community_name VARCHAR,
    address TEXT,
    state VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    description TEXT,
    property_type VARCHAR,
    data JSONB,
    similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.university_name,
        k.community_name,
        k.address,
        k.state,
        k.latitude,
        k.longitude,
        k.description,
        k.property_type,
        k.data,
        1 - (k.embedding <=> query_embedding) AS similarity
    FROM rental_knowledge_base k
    WHERE k.embedding IS NOT NULL
      AND 1 - (k.embedding <=> query_embedding) > match_threshold
      AND (filter_state IS NULL OR k.state = filter_state)
    ORDER BY k.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 4. RLS policies (allow anon read for agent queries)
ALTER TABLE rental_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON rental_knowledge_base
    FOR SELECT USING (true);

CREATE POLICY "Allow service role full access" ON rental_knowledge_base
    FOR ALL USING (auth.role() = 'service_role');
