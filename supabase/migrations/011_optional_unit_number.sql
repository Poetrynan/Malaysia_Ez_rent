-- Migration: Make unit_number optional in units table
ALTER TABLE units ALTER COLUMN unit_number DROP NOT NULL;
