-- Add localized tag fields to products table
-- Run this in Supabase SQL Editor

-- Add tags_uz and tags_ru columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tags_uz TEXT[],
ADD COLUMN IF NOT EXISTS tags_ru TEXT[];

-- Copy existing tags to tags_uz as default (assuming they're in Uzbek or English)
UPDATE products 
SET tags_uz = tags 
WHERE tags_uz IS NULL AND tags IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN products.tags_uz IS 'Product tags in Uzbek for search and filtering';
COMMENT ON COLUMN products.tags_ru IS 'Product tags in Russian for search and filtering';
COMMENT ON COLUMN products.tags IS 'Legacy/default tags field (kept for backwards compatibility)';

-- Create GIN indexes for faster tag searches
CREATE INDEX IF NOT EXISTS idx_products_tags_uz ON products USING GIN (tags_uz);
CREATE INDEX IF NOT EXISTS idx_products_tags_ru ON products USING GIN (tags_ru);
