-- 006_bedrooms_bathrooms.sql
-- Add bedrooms and bathrooms to units table and update match_units function

-- 1. Add columns to units table if they do not exist
ALTER TABLE units ADD COLUMN IF NOT EXISTS bedrooms INT DEFAULT 1;
ALTER TABLE units ADD COLUMN IF NOT EXISTS bathrooms INT DEFAULT 1;

-- 2. Drop the existing function first (required because the return table type changed)
DROP FUNCTION IF EXISTS match_units(vector, double precision, integer, character varying, numeric);

-- 3. Update match_units RPC function to return bedrooms and bathrooms columns
CREATE OR REPLACE FUNCTION match_units (
    query_embedding VECTOR(1536),
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
