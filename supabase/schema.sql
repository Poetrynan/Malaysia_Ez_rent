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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unit_number VARCHAR(100),
    passport_number VARCHAR(100),
    school VARCHAR(200),
    company VARCHAR(200),
    local_id_number VARCHAR(100),
    document_url TEXT,
    student_card_url TEXT,
    email VARCHAR(255)
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
    ren_number VARCHAR(20),
    ren_tag_url TEXT,
    avatar_url TEXT,
    job_title VARCHAR(100) DEFAULT 'Real Estate Negotiator',
    agency_name VARCHAR(200) DEFAULT 'Malaysia Ez Rent',
    agency_license VARCHAR(100),
    agency_address TEXT,
    bio TEXT,
    experience_years INT DEFAULT 0,
    experience_months INT DEFAULT 0,
    area_expertise TEXT[],
    property_types TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    payment_qr_code TEXT,
    facebook_url TEXT,
    website_url TEXT,
    CONSTRAINT at_least_one_contact CHECK (phone IS NOT NULL OR whatsapp IS NOT NULL OR wechat_id IS NOT NULL)
);

-- Table 3: communities (Residential Communities)
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    amenities TEXT[] DEFAULT '{}'::text[]
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
    agent_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    room_type VARCHAR(50) CHECK (room_type IN ('Studio', 'Master Room', 'Medium Room', 'Small Room', 'Whole Unit')),
    rent DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('available', 'rented')) DEFAULT 'available',
    bedrooms INT DEFAULT 1,
    bathrooms INT DEFAULT 1,
    description TEXT,
    embedding VECTOR(1536), -- Text Embedding for room details
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    max_occupants INT DEFAULT 1,
    media_urls TEXT[] DEFAULT '{}'::text[],
    video_url TEXT,
    landlord_qr_code TEXT,
    landlord_bank_info TEXT
);

-- Table 7: unit_images (Unit Media Assets)
CREATE TABLE IF NOT EXISTS unit_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')) DEFAULT 'image',
    sort_order INT DEFAULT 0
);

-- Table 8: lease_groups (Groups of leases for co-living/co-tenanting)
CREATE TABLE IF NOT EXISTS lease_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'breached', 'completed')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 9: leases (Rental Agreements)
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'completed', 'terminated', 'transferred')) DEFAULT 'active',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    security_deposit_months DECIMAL DEFAULT 2,
    utility_deposit_months DECIMAL DEFAULT 0.5,
    lease_group_id UUID REFERENCES lease_groups(id) ON DELETE SET NULL
);

-- Table 10: payment_records (Monthly Ledger Billing with Mobile Evidence Support)
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

-- Table 11: universities (Malaysian University GPS coordinates)
CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) UNIQUE NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL
);

-- Table 12: agent_conversations (Conversational AI Memory Logs)
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    intermediate_steps JSONB DEFAULT '[]'::jsonb, -- Thoughts/Tool traces
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 13: lease_transfers (Tracks co-tenant substitutions)
CREATE TABLE IF NOT EXISTS lease_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_group_id UUID REFERENCES lease_groups(id) ON DELETE CASCADE,
    exiting_lease_id UUID REFERENCES leases(id) ON DELETE RESTRICT,
    exiting_tenant_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    incoming_tenant_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    transfer_date DATE NOT NULL,
    deposit_handle_type VARCHAR(20) CHECK (deposit_handle_type IN ('transfer_to_new', 'refunded', 'forfeited')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 14: tenant_interests (Tenant expressions of interest)
CREATE TABLE IF NOT EXISTS tenant_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'confirmed', 'left')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (unit_id, user_id)
);

-- Table 15: maintenance_requests (Maintenance issues submitted by tenants)
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Aircon', 'Plumbing', 'Electrical', 'Furniture', 'Appliance', 'Others')),
    content TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    replies JSONB DEFAULT '[]'::jsonb
);

-- Table 16: mobile_upload_sessions (Temporary mobile image uploads)
CREATE TABLE IF NOT EXISTS mobile_upload_sessions (
    id VARCHAR(100) PRIMARY KEY,
    media_urls TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 17: agent_registrations (Agent sign up applications)
CREATE TABLE IF NOT EXISTS agent_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL DEFAULT '',
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL CHECK (phone ~ '^601[0-9]{8,9}$'),
    whatsapp VARCHAR(30) CHECK (whatsapp IS NULL OR whatsapp ~ '^601[0-9]{8,9}$'),
    agency_name VARCHAR(200) NOT NULL,
    ren_number VARCHAR(20) NOT NULL CHECK (ren_number ~ '^REN[0-9]{4,7}$'),
    ren_tag_image_url TEXT NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended', 'banned')),
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Table 18: user_notifications (System Inbox Messages / Announcements)
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'system' CHECK (type IN ('system', 'announcement', 'update', 'bonus', 'agent_status')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. Database Triggers & Stored Procedures
-- ==========================================

-- Trigger: auto-create user profile + link admin_users when new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- If this email exists in admin_users, link the auth ID
  IF NEW.email IS NOT NULL THEN
    UPDATE public.admin_users SET id = NEW.id WHERE email = NEW.email;
    
    -- Also send an approval notification if they were linked as admin/agent
    IF FOUND THEN
      -- Check if notification already exists to avoid duplicates
      IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = NEW.id AND type = 'agent_status') THEN
        INSERT INTO public.user_notifications (user_id, title, content, type, is_read)
        VALUES (
          NEW.id,
          '中介申请已通过 / Agent Application Approved',
          '您的中介申请已通过审核，现在您可以发布房源和管理租约了！ / Your agent application has been approved, you can now post listings and manage leases!',
          'agent_status',
          FALSE
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Trigger: limit super_admin to max 5, allow unlimited editor agents
CREATE OR REPLACE FUNCTION check_super_admin_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'super_admin' AND (SELECT COUNT(*) FROM admin_users WHERE role = 'super_admin' AND id <> NEW.id) >= 5 THEN
    RAISE EXCEPTION '超级管理员（Super Admin）数量已达上限（最多 5 人）';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS limit_super_admin_count ON admin_users;
CREATE TRIGGER limit_super_admin_count
  BEFORE INSERT OR UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION check_super_admin_count();

-- Trigger: auto-sync admin_users ID with auth.users by email
CREATE OR REPLACE FUNCTION public.sync_admin_user_id()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = NEW.email LIMIT 1;
  IF v_auth_id IS NOT NULL THEN
    NEW.id := v_auth_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_admin_id_before_insert ON public.admin_users;
CREATE TRIGGER sync_admin_id_before_insert
  BEFORE INSERT ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_user_id();

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

-- Trigger to auto-update maintenance_requests timestamp
CREATE OR REPLACE FUNCTION update_maintenance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_updated_at ON maintenance_requests;
CREATE TRIGGER maintenance_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_timestamp();

-- Trigger to auto-update agent_registrations timestamp
CREATE OR REPLACE FUNCTION update_agent_reg_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_reg_updated_at ON agent_registrations;
CREATE TRIGGER agent_reg_updated_at
  BEFORE UPDATE ON agent_registrations
  FOR EACH ROW EXECUTE FUNCTION update_agent_reg_timestamp();

-- Create Transactional RPC for substituting a co-tenant (No pro-rating)
CREATE OR REPLACE FUNCTION substitute_co_tenant(
  p_lease_group_id UUID,
  p_exiting_lease_id UUID,
  p_incoming_user_id UUID,
  p_transfer_date DATE,
  p_deposit_handle VARCHAR,
  p_notes TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_orig record;
  v_new_lease_id UUID;
  v_curr_billing_month DATE;
  v_loop_month DATE;
  v_inc_email TEXT;
BEGIN
  -- 1. Fetch original lease
  SELECT * INTO v_orig FROM leases WHERE id = p_exiting_lease_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exiting lease not found';
  END IF;

  -- 2. Fetch incoming user email
  SELECT email INTO v_inc_email FROM users WHERE id = p_incoming_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incoming user not found in users table';
  END IF;

  -- 3. Modify exiting lease: status -> transferred, end_date -> day before transfer
  UPDATE leases
  SET status = 'transferred',
      end_date = p_transfer_date - INTERVAL '1 day',
      admin_notes = COALESCE(admin_notes, '') || E'\n[System] Transferred to new tenant on ' || p_transfer_date::text
  WHERE id = p_exiting_lease_id;

  -- 4. Create new lease for the incoming tenant
  INSERT INTO leases (
    unit_id,
    lease_group_id,
    tenant_id,
    start_date,
    end_date,
    monthly_rent,
    deposit_amount,
    status,
    security_deposit_months,
    utility_deposit_months,
    admin_notes
  ) VALUES (
    v_orig.unit_id,
    p_lease_group_id,
    p_incoming_user_id,
    p_transfer_date,
    v_orig.end_date,
    v_orig.monthly_rent,
    CASE WHEN p_deposit_handle = 'transfer_to_new' THEN v_orig.deposit_amount ELSE 0.00 END,
    'active',
    v_orig.security_deposit_months,
    v_orig.utility_deposit_months,
    COALESCE(p_notes, '') || E'\n[System] Substituted from original tenant lease ID: ' || p_exiting_lease_id::text
  ) RETURNING id INTO v_new_lease_id;

  -- 5. Insert change history record
  INSERT INTO lease_transfers (
    lease_group_id,
    exiting_lease_id,
    exiting_tenant_id,
    incoming_tenant_id,
    transfer_date,
    deposit_handle_type,
    admin_notes
  ) VALUES (
    p_lease_group_id,
    p_exiting_lease_id,
    v_orig.tenant_id,
    p_incoming_user_id,
    p_transfer_date,
    p_deposit_handle,
    p_notes
  );

  -- 6. Perform billing adjustment for the transfer month (No pro-rating)
  v_curr_billing_month := date_trunc('month', p_transfer_date)::DATE;

  IF p_transfer_date = v_curr_billing_month THEN
    -- If transfer date is exactly the 1st of the month, the exiting tenant is not responsible for this month
    -- Delete the current month's unpaid bill for the exiting tenant
    DELETE FROM payment_records 
    WHERE lease_id = p_exiting_lease_id 
      AND billing_month >= v_curr_billing_month 
      AND paid = false;
      
    -- Start billing the incoming tenant from the current month
    v_loop_month := v_curr_billing_month;
  ELSE
    -- If transfer date is after the 1st of the month, the exiting tenant is responsible for this entire month
    -- Delete all future unpaid billing records of the exiting tenant after the current month
    DELETE FROM payment_records 
    WHERE lease_id = p_exiting_lease_id 
      AND billing_month > v_curr_billing_month 
      AND paid = false;
      
    -- Start billing the incoming tenant from the next month
    v_loop_month := (v_curr_billing_month + INTERVAL '1 month')::DATE;
  END IF;

  -- Generate standard full billing records for the incoming tenant for all active months
  WHILE v_loop_month <= v_orig.end_date LOOP
    INSERT INTO payment_records (
      lease_id,
      billing_month,
      paid,
      status,
      admin_notes
    ) VALUES (
      v_new_lease_id,
      v_loop_month,
      false,
      'unpaid',
      E'[System] Standard Monthly Rent'
    ) ON CONFLICT (lease_id, billing_month) DO NOTHING;

    v_loop_month := (v_loop_month + INTERVAL '1 month')::DATE;
  END LOOP;

  -- Update original unit's tenant interests status
  -- Mark exiting tenant as 'left', and incoming tenant as 'confirmed'
  UPDATE tenant_interests
  SET status = 'left'
  WHERE unit_id = v_orig.unit_id AND user_id = v_orig.tenant_id;

  INSERT INTO tenant_interests (
    unit_id,
    user_id,
    email,
    full_name,
    status
  ) VALUES (
    v_orig.unit_id,
    p_incoming_user_id,
    v_inc_email,
    (SELECT display_name FROM users WHERE id = p_incoming_user_id),
    'confirmed'
  ) ON CONFLICT (unit_id, user_id) DO UPDATE
  SET status = 'confirmed';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
ALTER TABLE lease_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "Allow public read on users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can edit own profile" ON users FOR ALL USING (auth.uid() = id);

-- admin_users policies
CREATE POLICY "Admin check policy" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Allow self insert admin" ON admin_users FOR INSERT WITH CHECK (
  id = auth.uid() 
  AND email = 'admin@ezrent.my'
  AND role = 'super_admin'
);
CREATE POLICY "Allow self update admin" ON admin_users FOR UPDATE USING (id = auth.uid() OR email = auth.jwt()->>'email');
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

-- lease_groups / lease_transfers policies
CREATE POLICY "Admins manage lease groups" ON lease_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Anyone read lease groups" ON lease_groups FOR SELECT USING (true);

CREATE POLICY "Admins manage lease transfers" ON lease_transfers FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Anyone read lease transfers" ON lease_transfers FOR SELECT USING (true);

-- tenant_interests policies
CREATE POLICY "Anyone can view interests" ON tenant_interests FOR SELECT USING (true);
CREATE POLICY "Users can express interest" ON tenant_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own interest" ON tenant_interests FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own interest" ON tenant_interests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all interests" ON tenant_interests FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- maintenance_requests policies
CREATE POLICY "Students can insert maintenance requests" ON maintenance_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can view own maintenance requests" ON maintenance_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can update own maintenance requests" ON maintenance_requests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all maintenance requests" ON maintenance_requests FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins can update all maintenance requests" ON maintenance_requests FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins can delete maintenance requests" ON maintenance_requests FOR DELETE USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- agent_registrations policies
CREATE POLICY "Anyone can register as agent" ON agent_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own registration" ON agent_registrations FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Admins can read all registrations" ON agent_registrations FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins can update registrations" ON agent_registrations FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- user_notifications policies
CREATE POLICY "Users can read own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON user_notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON user_notifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "Admins can update/delete any notification" ON user_notifications FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

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
