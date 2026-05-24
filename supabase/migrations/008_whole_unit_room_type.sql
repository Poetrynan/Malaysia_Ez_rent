-- 008_whole_unit_room_type.sql
-- 前端 AdminPanel / PropertyListings 已支持 Whole Unit（整租/合租），
-- 但 units.room_type CHECK 约束仍只有 4 种房型，导致插入报：
--   units_room_type_check violation

ALTER TABLE units DROP CONSTRAINT IF EXISTS units_room_type_check;

ALTER TABLE units ADD CONSTRAINT units_room_type_check
  CHECK (room_type IN ('Studio', 'Master Room', 'Medium Room', 'Small Room', 'Whole Unit'));
