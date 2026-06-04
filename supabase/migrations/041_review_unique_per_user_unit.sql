-- 041_review_unique_per_user_unit.sql
-- Each user can only have one review per unit (one lease = one review)

-- Remove duplicate reviews first (keep latest per user+unit)
DELETE FROM reviews a USING reviews b
WHERE a.user_id = b.user_id
  AND a.unit_id = b.unit_id
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE reviews ADD CONSTRAINT unique_review_per_user_unit UNIQUE (user_id, unit_id);
