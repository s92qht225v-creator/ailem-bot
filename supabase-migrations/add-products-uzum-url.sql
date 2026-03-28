-- Add uzum_url column to products table for UZUM marketplace links
ALTER TABLE products ADD COLUMN IF NOT EXISTS uzum_url TEXT DEFAULT NULL;
