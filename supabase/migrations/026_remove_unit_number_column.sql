-- Migration 026: Remove unit_number column from units table for privacy and avoiding agent competition
ALTER TABLE public.units DROP COLUMN IF EXISTS unit_number CASCADE;
