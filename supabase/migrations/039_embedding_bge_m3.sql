-- 039_embedding_bge_m3.sql
-- Migrate embedding column from 1536 dims (bge-large-zh-v1.5) to 1024 dims (bge-m3)

-- 1. Change embedding column dimension (existing vectors become invalid, need regeneration)
ALTER TABLE units ALTER COLUMN embedding TYPE VECTOR(1024);

-- 2. Drop the existing function first (required because parameter type changed)
DROP FUNCTION IF EXISTS match_units(vector, double precision, integer, character varying, numeric);

-- 3. Recreate match_units with 1024-dim vector parameter
CREATE OR REPLACE FUNCTION match_units (
    query_embedding VECTOR(1024),
    match_threshold FLOAT,
    match_count INT,
    filter_room_type VARCHAR DEFAULT NULL,
    filter_max_rent DECIMAL DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    community_name VARCHAR,
    room_type VARCHAR,
    rent DECIMAL,
    status VARCHAR,
    description TEXT,
    similarity FLOAT,
    bedrooms INT,
    bathrooms INT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        c.name AS community_name,
        u.room_type,
        u.rent,
        u.status,
        u.description,
        1 - (u.embedding <=> query_embedding) AS similarity,
        u.bedrooms,
        u.bathrooms
    FROM units u
    JOIN communities c ON u.community_id = c.id
    WHERE 1 - (u.embedding <=> query_embedding) > match_threshold
      AND (filter_room_type IS NULL OR u.room_type = filter_room_type)
      AND (filter_max_rent IS NULL OR u.rent <= filter_max_rent)
      AND u.status = 'available'
    ORDER BY u.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 4. Null out old 1536-dim embeddings so sync_missing_embeddings() regenerates them
UPDATE units SET embedding = NULL WHERE embedding IS NOT NULL;
