-- Migration: Convert app to Uzbek-only
-- Run this in Supabase SQL Editor

-- ============================================
-- PRODUCTS TABLE
-- ============================================

-- Update products: Copy _uz fields to main fields, drop language-specific fields
UPDATE products
SET 
  name = COALESCE(name_uz, name),
  description = COALESCE(description_uz, description),
  material = COALESCE(material_uz, material);

-- Drop multilingual columns for products
ALTER TABLE products DROP COLUMN IF EXISTS name_uz;
ALTER TABLE products DROP COLUMN IF EXISTS name_ru;
ALTER TABLE products DROP COLUMN IF EXISTS description_uz;
ALTER TABLE products DROP COLUMN IF EXISTS description_ru;
ALTER TABLE products DROP COLUMN IF EXISTS material_uz;
ALTER TABLE products DROP COLUMN IF EXISTS material_ru;

-- For colors, sizes, and tags: Use _uz arrays as main, drop _ru
UPDATE products
SET 
  colors = COALESCE(colors_uz, colors),
  sizes = COALESCE(sizes_uz, sizes),
  tags = COALESCE(tags_uz, tags);

ALTER TABLE products DROP COLUMN IF EXISTS colors_uz;
ALTER TABLE products DROP COLUMN IF EXISTS colors_ru;
ALTER TABLE products DROP COLUMN IF EXISTS sizes_uz;
ALTER TABLE products DROP COLUMN IF EXISTS sizes_ru;
ALTER TABLE products DROP COLUMN IF EXISTS tags_uz;
ALTER TABLE products DROP COLUMN IF EXISTS tags_ru;

-- ============================================
-- CATEGORIES TABLE
-- ============================================

-- Update categories: Use Uzbek as primary
UPDATE categories
SET name = COALESCE(name_uz, name);

ALTER TABLE categories DROP COLUMN IF EXISTS name_uz;
ALTER TABLE categories DROP COLUMN IF EXISTS name_ru;

-- ============================================
-- PICKUP POINTS TABLE
-- ============================================

-- Pickup points: Remove language field since we're Uzbek-only now
ALTER TABLE pickup_points DROP COLUMN IF EXISTS language;

-- ============================================
-- PRODUCT VARIANTS
-- ============================================

-- Note: Variants are stored as JSONB with color/size fields
-- We'll handle this in application code by using only single color/size fields
-- No database changes needed for variants structure

-- ============================================
-- VERIFICATION
-- ============================================

-- Check products schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('name', 'description', 'material', 'colors', 'sizes', 'tags', 'name_uz', 'name_ru')
ORDER BY column_name;

-- Check categories schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories' 
  AND column_name IN ('name', 'name_uz', 'name_ru')
ORDER BY column_name;

-- Check pickup_points schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pickup_points' 
  AND column_name = 'language';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN products.name IS 'Product name in Uzbek';
COMMENT ON COLUMN products.description IS 'Product description in Uzbek';
COMMENT ON COLUMN products.material IS 'Product material in Uzbek';
COMMENT ON COLUMN categories.name IS 'Category name in Uzbek';
