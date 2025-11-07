-- Add display_order column to pickup_points table for drag-and-drop reordering
-- Run this in Supabase SQL Editor

-- Add display_order column (defaults to created_at timestamp converted to seconds for initial ordering)
ALTER TABLE pickup_points
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set initial display_order based on existing data (ordered by courier, then created_at)
-- First, create a temporary sequence for ordering
WITH ordered_points AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY courier_service, state, city, created_at) as new_order
  FROM pickup_points
)
UPDATE pickup_points
SET display_order = ordered_points.new_order
FROM ordered_points
WHERE pickup_points.id = ordered_points.id;

-- Make display_order NOT NULL after setting initial values
ALTER TABLE pickup_points
ALTER COLUMN display_order SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN pickup_points.display_order IS 'Display order for drag-and-drop sorting in admin panel (lower numbers appear first)';

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_pickup_points_display_order ON pickup_points(display_order);
