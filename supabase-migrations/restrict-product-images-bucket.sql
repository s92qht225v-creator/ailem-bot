-- ============================================================================
-- Restrict the product-images bucket to images up to 10 MB (CAT-12)
-- (audit-reports/2026-10-25-categories)
--
-- OPTIONAL, run AFTER add-category-integrity.sql and after the new client is
-- deployed. The bucket is shared by category, product, banner, A+ content and
-- customer review uploads, so the list below matches what the app accepts
-- (src/utils/validation.js → IMAGE_UPLOAD_RULES) plus HEIC/HEIF for phone
-- photos in reviews. Existing objects are not affected.
--
-- SVG policy: SVG stays allowed because all current category icons are SVG.
-- Uploads are admin-only for categories, and the app renders category images
-- only via <img> / CSS background-image, where SVG scripts do not execute.
--
-- Rollback (removes the type/size limits again — only if a legitimate upload
-- type was missed; prefer adding that type to allowed_mime_types):
--   UPDATE storage.buckets SET allowed_mime_types = NULL, file_size_limit = NULL
--   WHERE id = 'product-images';
-- ============================================================================

-- Pre-check (read-only): current settings
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'product-images';

UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/svg+xml',
    'image/heic',
    'image/heif'
  ]
WHERE id = 'product-images';
