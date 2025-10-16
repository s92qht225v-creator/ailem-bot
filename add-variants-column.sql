-- Migration: Add variants column to products table
-- This enables tracking stock for each color+size combination

-- Add variants column (JSONB for flexible structure)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- Add index for faster variant queries
CREATE INDEX IF NOT EXISTS idx_products_variants ON products USING GIN (variants);

-- Example of variants structure:
-- [
--   {"color": "Red", "size": "Small", "stock": 5, "sku": "PROD-RED-S"},
--   {"color": "Red", "size": "Medium", "stock": 8, "sku": "PROD-RED-M"},
--   {"color": "Blue", "size": "Large", "stock": 3, "sku": "PROD-BLU-L"}
-- ]

-- Add comment for documentation
COMMENT ON COLUMN products.variants IS 'Array of variant objects with color, size, stock, and optional SKU';
