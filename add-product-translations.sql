-- Migration: Add multilingual support for products and categories
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ADD TRANSLATION COLUMNS TO PRODUCTS
-- ============================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name_uz TEXT,
ADD COLUMN IF NOT EXISTS name_ru TEXT,
ADD COLUMN IF NOT EXISTS description_uz TEXT,
ADD COLUMN IF NOT EXISTS description_ru TEXT,
ADD COLUMN IF NOT EXISTS material_uz TEXT,
ADD COLUMN IF NOT EXISTS material_ru TEXT;

-- ============================================
-- 2. MIGRATE EXISTING DATA TO UZBEK COLUMNS
-- ============================================

-- Copy existing data to Uzbek columns (default language)
UPDATE products 
SET 
  name_uz = name,
  description_uz = description,
  material_uz = material
WHERE name_uz IS NULL;

-- ============================================
-- 3. ADD TRANSLATION COLUMNS TO CATEGORIES
-- ============================================

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS name_uz TEXT,
ADD COLUMN IF NOT EXISTS name_ru TEXT;

-- Copy existing category names to Uzbek columns
UPDATE categories 
SET name_uz = name
WHERE name_uz IS NULL;

-- ============================================
-- 4. CREATE INDEXES FOR BETTER SEARCH PERFORMANCE
-- ============================================

-- Index for searching Uzbek product names
CREATE INDEX IF NOT EXISTS idx_products_name_uz ON products(name_uz);

-- Index for searching Russian product names
CREATE INDEX IF NOT EXISTS idx_products_name_ru ON products(name_ru);

-- Index for searching Uzbek materials
CREATE INDEX IF NOT EXISTS idx_products_material_uz ON products(material_uz);

-- Index for searching Russian materials
CREATE INDEX IF NOT EXISTS idx_products_material_ru ON products(material_ru);

-- ============================================
-- 5. ADD HELPFUL COMMENTS
-- ============================================

COMMENT ON COLUMN products.name_uz IS 'Product name in Uzbek';
COMMENT ON COLUMN products.name_ru IS 'Product name in Russian';
COMMENT ON COLUMN products.description_uz IS 'Product description in Uzbek';
COMMENT ON COLUMN products.description_ru IS 'Product description in Russian';
COMMENT ON COLUMN products.material_uz IS 'Product material in Uzbek';
COMMENT ON COLUMN products.material_ru IS 'Product material in Russian';
COMMENT ON COLUMN categories.name_uz IS 'Category name in Uzbek';
COMMENT ON COLUMN categories.name_ru IS 'Category name in Russian';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check migration status
-- SELECT 
--   COUNT(*) as total_products,
--   COUNT(name_uz) as has_uzbek_name,
--   COUNT(name_ru) as has_russian_name
-- FROM products;

-- View sample data
-- SELECT id, name, name_uz, name_ru, material, material_uz, material_ru 
-- FROM products 
-- LIMIT 5;
