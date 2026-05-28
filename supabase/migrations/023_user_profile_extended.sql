-- Extended profile fields for students and local tenants
-- Supports passport, school, company, local ID, and document upload

ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS local_id_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_url TEXT;
