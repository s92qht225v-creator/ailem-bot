-- Migration: Add banners array column to app_settings table
-- This allows storing multiple promotional banners for homepage carousel

-- Add banners column (JSONB array)
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS banners JSONB DEFAULT '[]'::jsonb;

-- Migrate existing sale_banner data to banners array (if it exists)
UPDATE app_settings
SET banners = CASE 
  WHEN sale_banner IS NOT NULL 
  THEN jsonb_build_array(sale_banner)
  ELSE '[]'::jsonb
END
WHERE id = 1 AND (banners IS NULL OR banners = '[]'::jsonb);

-- Add comment for documentation
COMMENT ON COLUMN app_settings.banners IS 'Array of promotional banners for homepage carousel. Each banner has: title, subtitle, imageUrl, enabled';

-- Example banner structure:
-- [
--   {
--     "title": "Summer Sale",
--     "subtitle": "Up to 50% Off",
--     "imageUrl": "https://...",
--     "enabled": true
--   },
--   {
--     "title": "New Arrivals",
--     "subtitle": "Check out our latest products",
--     "imageUrl": "https://...",
--     "enabled": true
--   }
-- ]
