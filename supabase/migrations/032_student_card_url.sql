-- Migration 032: Add student card URL to user profiles
-- Allows tenants to upload their student card (学生证) separately from passport/IC

ALTER TABLE users ADD COLUMN IF NOT EXISTS student_card_url TEXT;
