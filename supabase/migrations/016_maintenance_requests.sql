-- 016_maintenance_requests.sql
-- Replace feedback table with maintenance_requests table and set up RLS policies

-- 1. Clean up old feedback table if exists
DROP TABLE IF EXISTS feedback CASCADE;

-- 2. Create maintenance_requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Aircon', 'Plumbing', 'Electrical', 'Furniture', 'Appliance', 'Others')),
  content TEXT NOT NULL,
  photo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  admin_reply TEXT,
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_maintenance_user ON maintenance_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_lease ON maintenance_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned ON maintenance_requests(assigned_to);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- 5. Define Policies

-- Students can insert maintenance requests for themselves
DROP POLICY IF EXISTS "Students can insert maintenance requests" ON maintenance_requests;
CREATE POLICY "Students can insert maintenance requests" ON maintenance_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students can view their own maintenance requests
DROP POLICY IF EXISTS "Students can view own maintenance requests" ON maintenance_requests;
CREATE POLICY "Students can view own maintenance requests" ON maintenance_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Students can update their own maintenance requests (e.g. to set satisfaction rating)
DROP POLICY IF EXISTS "Students can update own maintenance requests" ON maintenance_requests;
CREATE POLICY "Students can update own maintenance requests" ON maintenance_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all maintenance requests
DROP POLICY IF EXISTS "Admins can view all maintenance requests" ON maintenance_requests;
CREATE POLICY "Admins can view all maintenance requests" ON maintenance_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Admins can update all maintenance requests (claim, status, reply)
DROP POLICY IF EXISTS "Admins can update all maintenance requests" ON maintenance_requests;
CREATE POLICY "Admins can update all maintenance requests" ON maintenance_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Admins can delete maintenance requests
DROP POLICY IF EXISTS "Admins can delete maintenance requests" ON maintenance_requests;
CREATE POLICY "Admins can delete maintenance requests" ON maintenance_requests FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
