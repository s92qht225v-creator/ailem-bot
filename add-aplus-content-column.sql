-- Add A+ Content column to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products
ADD COLUMN IF NOT EXISTS a_plus_content JSONB DEFAULT NULL;

COMMENT ON COLUMN products.a_plus_content IS 'A+ Content modules for enhanced product descriptions (JSON array of module objects)';

-- Create index for faster queries on products with A+ content
CREATE INDEX IF NOT EXISTS idx_products_has_aplus ON products ((a_plus_content IS NOT NULL));
