-- Migration: Add language field to pickup_points
-- Date: 2025-11-03
-- Description: Simple language field - store each pickup point in both Uzbek and Russian

-- Add language column
ALTER TABLE pickup_points
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'uz';

-- Add check constraint to ensure only valid languages
ALTER TABLE pickup_points
ADD CONSTRAINT valid_language CHECK (language IN ('uz', 'ru'));

-- Add comment for documentation
COMMENT ON COLUMN pickup_points.language IS 'Language of the pickup point data (uz = Uzbek/Latin, ru = Russian/Cyrillic)';

-- Create index for faster language filtering
CREATE INDEX IF NOT EXISTS idx_pickup_points_language ON pickup_points(language);

-- For existing data, set all to Uzbek by default
UPDATE pickup_points
SET language = 'uz'
WHERE language IS NULL;

-- Note: After running this migration, you need to:
-- 1. Duplicate all existing pickup points with language='ru'
-- 2. Translate the city, state, and address fields to Russian (Cyrillic)
