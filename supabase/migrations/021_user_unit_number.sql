-- Add unit_number to users table so tenants can specify their room number
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_number VARCHAR(50);
