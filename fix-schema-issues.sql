-- Critical Schema Fixes for Ailem E-commerce
-- Run this in Supabase SQL Editor to fix schema mismatches

-- ============================================
-- FIX 1: Add email column to users table
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- FIX 2: Add date column to orders table
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS date TEXT;

-- Update existing orders to have date from created_at
UPDATE orders SET date = TO_CHAR(created_at, 'YYYY-MM-DD') WHERE date IS NULL;

-- ============================================
-- FIX 3: Create pickup_points table
-- ============================================
CREATE TABLE IF NOT EXISTS pickup_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  working_hours TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for pickup_points
ALTER TABLE pickup_points ENABLE ROW LEVEL SECURITY;

-- Pickup points: Everyone can read, only service role can write
CREATE POLICY "Pickup points are viewable by everyone" ON pickup_points
  FOR SELECT USING (true);

CREATE POLICY "Pickup points are insertable by service role" ON pickup_points
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Pickup points are updatable by service role" ON pickup_points
  FOR UPDATE USING (true);

CREATE POLICY "Pickup points are deletable by service role" ON pickup_points
  FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_pickup_points_updated_at BEFORE UPDATE ON pickup_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default pickup points
INSERT INTO pickup_points (name, address, phone, working_hours) VALUES
  ('Main Office', 'Tashkent, Yunusabad District', '+998901234567', '9:00 - 18:00'),
  ('Shopping Center', 'Tashkent, Chilanzar District', '+998901234568', '10:00 - 20:00')
ON CONFLICT DO NOTHING;

-- ============================================
-- NOTE about orders.id:
-- ============================================
-- The orders table uses UUID for id, but the app generates human-readable IDs like "ORD-123456789".
-- These should be stored in the order_number field (which already exists).
-- The frontend code should be updated to use order_number instead of trying to insert into id.
--
-- DO NOT change id from UUID to TEXT as it would break foreign key references in reviews table.
-- Instead, ensure frontend uses order_number for display and id for database operations.

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the fixes:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'date';
-- SELECT * FROM pickup_points;
