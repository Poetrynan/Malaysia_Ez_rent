-- 047_add_unit_area.sql
-- Add area size column to units table (in square feet)

ALTER TABLE units ADD COLUMN IF NOT EXISTS area INTEGER;
