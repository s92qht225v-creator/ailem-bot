-- Add images column to reviews table
-- This allows storing multiple image URLs for each review

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN reviews.images IS 'Array of image URLs uploaded with the review';
