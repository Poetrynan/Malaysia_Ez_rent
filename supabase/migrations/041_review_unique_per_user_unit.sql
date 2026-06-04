-- 041_review_unique_per_user_unit.sql
-- Each user can only have one review per unit (one lease = one review)
-- Also: allow super_admin to delete any review

-- 1. Admin delete policy (idempotent)
DROP POLICY IF EXISTS "Admins can delete any review" ON reviews;
CREATE POLICY "Admins can delete any review" ON reviews
    FOR DELETE USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE role = 'super_admin')
    );

-- 2. Remove duplicate reviews first (keep latest per user+unit)
DELETE FROM reviews a USING reviews b
WHERE a.user_id = b.user_id
  AND a.unit_id = b.unit_id
  AND a.created_at < b.created_at;

-- 3. Add unique constraint (one review per user per unit)
ALTER TABLE reviews ADD CONSTRAINT unique_review_per_user_unit UNIQUE (user_id, unit_id);
