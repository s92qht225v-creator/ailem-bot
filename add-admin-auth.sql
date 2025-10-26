-- Admin Authentication Migration
-- Run this in Supabase SQL Editor

-- Create admin_users table to track who has admin access
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each user can only be admin once
  UNIQUE(user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read admin_users (to check their own status)
CREATE POLICY "Users can check if they are admin"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: No one can insert/update/delete via client (must be done via Supabase Dashboard or service role)
CREATE POLICY "Only service role can modify admin_users"
  ON admin_users FOR ALL
  TO service_role
  USING (true);

-- Instructions:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Go to Authentication → Users → Add User (or invite yourself)
-- 3. After creating user, get their user_id from the users table
-- 4. Insert admin record:
--    INSERT INTO admin_users (user_id, role) VALUES ('your-user-id-here', 'admin');
-- 5. Or use Supabase Dashboard → Table Editor → admin_users → Insert row
