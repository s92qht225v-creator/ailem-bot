-- Add translation fields for categories
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS name_uz TEXT,
ADD COLUMN IF NOT EXISTS name_ru TEXT;

-- Populate default values (copy from existing name field)
UPDATE categories SET name_uz = name WHERE name_uz IS NULL;
UPDATE categories SET name_ru = name WHERE name_ru IS NULL;

-- Add translation fields for products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS name_uz TEXT,
ADD COLUMN IF NOT EXISTS name_ru TEXT,
ADD COLUMN IF NOT EXISTS description_uz TEXT,
ADD COLUMN IF NOT EXISTS description_ru TEXT;

-- Populate default values (copy from existing fields)
UPDATE products SET name_uz = name WHERE name_uz IS NULL;
UPDATE products SET name_ru = name WHERE name_ru IS NULL;
UPDATE products SET description_uz = description WHERE description_uz IS NULL;
UPDATE products SET description_ru = description WHERE description_ru IS NULL;

-- Optional: Make original name/description nullable since we now have language-specific fields
-- Or keep them as fallback defaults
COMMENT ON COLUMN categories.name IS 'Default/fallback category name';
COMMENT ON COLUMN products.name IS 'Default/fallback product name';
COMMENT ON COLUMN products.description IS 'Default/fallback product description';
