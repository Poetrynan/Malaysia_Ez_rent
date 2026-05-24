-- ==========================================
-- MALAYSIA EZ RENT - SUPABASE POSTGRESQL SCHEMA
-- ==========================================

-- 1. Activate Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Vector semantic search (1536 dims)

-- 2. Core Entity Tables

-- Table 1: users (Student Users linked with auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    phone VARCHAR(30) UNIQUE,
    full_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: admin_users (Administrators linked with auth.users)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    wechat_id VARCHAR(100),
    role VARCHAR(20) CHECK (role IN ('super_admin', 'editor')) DEFAULT 'editor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT at_least_one_contact CHECK (phone IS NOT NULL OR whatsapp IS NOT NULL OR wechat_id IS NOT NULL)
);

-- Table 3: communities (Residential Communities)
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: amenities (Facility Dictionary)
CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    icon_key VARCHAR(50) NOT NULL -- Lucide icon keys, e.g., 'Waves', 'Dumbbell', 'ShieldAlert'
);

-- Table 5: community_amenities (Many-to-Many Bridge)
CREATE TABLE IF NOT EXISTS community_amenities (
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (community_id, amenity_id)
);

-- Table 6: units (Individual Apartment Rooms)
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
    unit_number VARCHAR(50) NOT NULL, -- Masked for ordinary students, visible to admins
    room_type VARCHAR(50) CHECK (room_type IN ('Studio', 'Master Room', 'Medium Room', 'Small Room')),
    rent DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('available', 'rented')) DEFAULT 'available',
    bedrooms INT DEFAULT 1,
    bathrooms INT DEFAULT 1,
    description TEXT,
    embedding VECTOR(1536), -- Text Embedding for room details
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 7: unit_images (Unit Media Assets)
CREATE TABLE IF NOT EXISTS unit_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')) DEFAULT 'image',
    sort_order INT DEFAULT 0
);

-- Table 8: leases (Rental Agreements)
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'completed', 'terminated')) DEFAULT 'active',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 9: payment_records (Monthly Ledger Billing with Mobile Evidence Support)
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    billing_month DATE NOT NULL, -- Always stored as the 1st of the month, e.g., 2026-05-01
    paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    evidence_url TEXT, -- Transfer screenshot URL uploaded from mobile
    status VARCHAR(30) CHECK (status IN ('unpaid', 'pending_review', 'approved', 'rejected')) DEFAULT 'unpaid',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (lease_id, billing_month)
);

-- Table 10: universities (Malaysian University GPS coordinates)
CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) UNIQUE NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL
);

-- Table 11: agent_conversations (Conversational AI Memory Logs)
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    intermediate_steps JSONB DEFAULT '[]'::jsonb, -- Thoughts/Tool traces
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. Database Triggers & Stored Procedures
-- ==========================================

-- Trigger: auto-create user profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Trigger: limit admin_users to max 3 records
CREATE OR REPLACE FUNCTION check_admin_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM admin_users) >= 5 THEN
    RAISE EXCEPTION '管理员数量已达上限（最多 5 人）';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS limit_admin_count ON admin_users;
CREATE TRIGGER limit_admin_count
  BEFORE INSERT ON admin_users
  FOR EACH ROW EXECUTE FUNCTION check_admin_count();

-- Trigger to auto-generate monthly payment records when a lease is inserted
CREATE OR REPLACE FUNCTION generate_lease_payments()
RETURNS TRIGGER AS $$
DECLARE
    current_month DATE;
    end_month DATE;
BEGIN
    -- Start from the first day of the start month
    current_month := date_trunc('month', NEW.start_date)::DATE;
    -- Go until the first day of the end month
    end_month := date_trunc('month', NEW.end_date)::DATE;
    
    WHILE current_month <= end_month LOOP
        INSERT INTO payment_records (lease_id, billing_month, paid, paid_date)
        VALUES (NEW.id, current_month, FALSE, NULL)
        ON CONFLICT (lease_id, billing_month) DO NOTHING;
        
        current_month := (current_month + INTERVAL '1 month')::DATE;
    END LOOP;
    
    -- Automatically set unit status to 'rented' when active lease begins
    UPDATE units
    SET status = 'rented'
    WHERE id = NEW.unit_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_lease_insert
AFTER INSERT ON leases
FOR EACH ROW
EXECUTE FUNCTION generate_lease_payments();

-- Stored Procedure for Cosine Distance Semantic Matching (pgvector)
CREATE OR REPLACE FUNCTION match_units (
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT,
    filter_room_type VARCHAR DEFAULT NULL,
    filter_max_rent DECIMAL DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    community_name VARCHAR,
    room_type VARCHAR,
    rent DECIMAL,
    status VARCHAR,
    description TEXT,
    similarity FLOAT,
    bedrooms INT,
    bathrooms INT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        c.name AS community_name,
        u.room_type,
        u.rent,
        u.status,
        u.description,
        1 - (u.embedding <=> query_embedding) AS similarity,
        u.bedrooms,
        u.bathrooms
    FROM units u
    JOIN communities c ON u.community_id = c.id
    WHERE 1 - (u.embedding <=> query_embedding) > match_threshold
      AND (filter_room_type IS NULL OR u.room_type = filter_room_type)
      AND (filter_max_rent IS NULL OR u.rent <= filter_max_rent)
      AND u.status = 'available'
    ORDER BY u.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ==========================================
-- 4. Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "Allow public read on users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can edit own profile" ON users FOR ALL USING (auth.uid() = id);

-- admin_users policies
CREATE POLICY "Admin check policy" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Super admin can manage admins" ON admin_users FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super_admin')
);

-- communities / amenities policies
CREATE POLICY "Allow public read on communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Admin write communities" ON communities FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Allow public read on amenities" ON amenities FOR SELECT USING (true);
CREATE POLICY "Admin write amenities" ON amenities FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Allow public read on community_amenities" ON community_amenities FOR SELECT USING (true);
CREATE POLICY "Admin write community_amenities" ON community_amenities FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

-- units / unit_images policies
CREATE POLICY "Allow public read on units" ON units FOR SELECT USING (true);
CREATE POLICY "Admin write units" ON units FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Allow public read on unit_images" ON unit_images FOR SELECT USING (true);
CREATE POLICY "Admin write unit_images" ON unit_images FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

-- leases policies
CREATE POLICY "Admin read and write leases" ON leases FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));
CREATE POLICY "Tenant can read own lease" ON leases FOR SELECT USING (auth.uid() = tenant_id);

-- payment_records policies
CREATE POLICY "Admin full control payments" ON payment_records FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));
CREATE POLICY "Tenant read own payments" ON payment_records FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM leases 
        WHERE leases.id = payment_records.lease_id 
          AND leases.tenant_id = auth.uid()
    )
);
CREATE POLICY "Tenant update own payment evidence" ON payment_records FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM leases 
        WHERE leases.id = payment_records.lease_id 
          AND leases.tenant_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM leases 
        WHERE leases.id = payment_records.lease_id 
          AND leases.tenant_id = auth.uid()
    )
);

-- universities policies
CREATE POLICY "Allow public read on universities" ON universities FOR SELECT USING (true);
CREATE POLICY "Admin write universities" ON universities FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

-- agent_conversations policies
CREATE POLICY "Users can manage own conversation history" ON agent_conversations FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 5. Realtime Replication Subscription Setup
-- ==========================================

-- Ensure the supabase_realtime publication exists and subscribe to payment_records
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE payment_records;
