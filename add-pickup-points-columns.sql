-- Add missing columns to pickup_points table
-- Run this in Supabase SQL Editor

-- Add courier_service column
ALTER TABLE pickup_points
ADD COLUMN IF NOT EXISTS courier_service TEXT;

-- Add state column
ALTER TABLE pickup_points
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add city column
ALTER TABLE pickup_points
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add active column if it doesn't exist
ALTER TABLE pickup_points
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN pickup_points.courier_service IS 'Name of the courier service (BTS, MaxWay, etc.)';
COMMENT ON COLUMN pickup_points.state IS 'State or region of the pickup point';
COMMENT ON COLUMN pickup_points.city IS 'City of the pickup point';
COMMENT ON COLUMN pickup_points.active IS 'Whether this pickup point is currently active';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_pickup_points_courier ON pickup_points(courier_service);
CREATE INDEX IF NOT EXISTS idx_pickup_points_state ON pickup_points(state);
CREATE INDEX IF NOT EXISTS idx_pickup_points_city ON pickup_points(city);
CREATE INDEX IF NOT EXISTS idx_pickup_points_active ON pickup_points(active);
