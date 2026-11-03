-- ============================================================================
-- product-images: only admins may DELETE or UPDATE (overwrite) objects
-- REQUIRED for this release; run AFTER secure-admin-users.sql.
-- (production pre-check review, 2026-10-25)
--
-- PRODUCTION FINDING: storage.objects has permissive policies for role
-- {public} on product-images: product_images_delete (DELETE), product_images_update
-- (UPDATE, also used by upsert/overwrite), product_images_insert, product_images_select;
-- anon/authenticated hold the matching grants. So anyone with the public anon
-- key can delete any image or overwrite one with other content.
-- protect-referenced-storage-objects.sql stops deletes of REFERENCED images
-- only; it does not stop deleting drafts/unused images or overwriting.
--
-- WHAT: two RESTRICTIVE policies (AND-ed with any permissive ones, so they do
-- not depend on knowing them): DELETE and UPDATE inside product-images require
-- public.is_admin() (trustworthy only after secure-admin-users.sql).
-- Not changed: SELECT (public image reads) and INSERT — customers' review
-- photo uploads (WriteReviewPage, anon) create NEW objects with random names
-- and upsert=false, which needs INSERT only. service_role bypasses RLS.
-- The app never uses upsert/move/copy (traced 2026-10-25).
--
-- Idempotent. NO ROLLBACK that weakens it: do not drop these policies (that
-- re-opens deletion/overwrite of any image by anyone with the anon key).
-- Every app version in the rollback path (image A, the release) works with
-- them. If an admin is refused, fix forward: check their admin_users row;
-- service_role (dashboard) can still remove a file in an emergency.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'restrict-storage-writes-to-admins: public.is_admin() missing — run secure-admin-users.sql first';
  END IF;
  IF (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.admin_users'::regclass) IS NOT TRUE
     OR has_table_privilege('authenticated', 'public.admin_users', 'INSERT')
     OR has_table_privilege('anon', 'public.admin_users', 'INSERT') THEN
    RAISE EXCEPTION 'restrict-storage-writes-to-admins: admin_users is still writable by API roles — run secure-admin-users.sql first';
  END IF;
END $$;

DROP POLICY IF EXISTS product_images_delete_admins_only ON storage.objects;
CREATE POLICY product_images_delete_admins_only ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (bucket_id IS DISTINCT FROM 'product-images' OR public.is_admin());

DROP POLICY IF EXISTS product_images_update_admins_only ON storage.objects;
CREATE POLICY product_images_update_admins_only ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (bucket_id IS DISTINCT FROM 'product-images' OR public.is_admin())
  WITH CHECK (bucket_id IS DISTINCT FROM 'product-images' OR public.is_admin());

COMMIT;

-- POST-CHECK (read-only):
--   SELECT policyname, permissive, cmd, qual FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY cmd, permissive;
