-- Migration 017: Add iProperty Agent Profile fields to admin_users table
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100) DEFAULT 'Real Estate Negotiator',
ADD COLUMN IF NOT EXISTS agency_name VARCHAR(200) DEFAULT 'Malaysia Ez Rent',
ADD COLUMN IF NOT EXISTS agency_license VARCHAR(100),
ADD COLUMN IF NOT EXISTS agency_address TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS experience_months INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS area_expertise TEXT[],
ADD COLUMN IF NOT EXISTS property_types TEXT[];
