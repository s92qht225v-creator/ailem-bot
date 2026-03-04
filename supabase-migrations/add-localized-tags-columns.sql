-- Migration: Add localized tags columns for Uzbek and Russian
-- Date: 2025-11-03
-- Description: Adds tags_uz and tags_ru TEXT[] columns to products table for multilingual tag support

-- Add Uzbek tags column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS tags_uz TEXT[] DEFAULT '{}';

-- Add Russian tags column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS tags_ru TEXT[] DEFAULT '{}';

-- Create GIN indexes for efficient array searching
CREATE INDEX IF NOT EXISTS idx_products_tags_uz ON products USING GIN (tags_uz);
CREATE INDEX IF NOT EXISTS idx_products_tags_ru ON products USING GIN (tags_ru);

-- Add comments for documentation
COMMENT ON COLUMN products.tags_uz IS 'Product tags in Uzbek language (array of keywords)';
COMMENT ON COLUMN products.tags_ru IS 'Product tags in Russian language (array of keywords)';
