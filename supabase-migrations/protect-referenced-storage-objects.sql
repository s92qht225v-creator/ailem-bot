-- ============================================================================
-- Server-side protection: storage objects in product-images that are still
-- referenced by database rows cannot be deleted through the Storage API.
-- (category review V2 — old browser tabs; audit-reports/2026-10-25-categories)
--
-- WHY
--   The currently deployed admin client deletes a category's image BEFORE it
--   deletes the category row. After add-category-integrity.sql, deleting an
--   occupied category is refused by the database — but the image would already
--   be gone. Deploying new JavaScript does not update admin tabs that are
--   already open, so this must be enforced by the server.
--
--   With this policy, the old client's early image delete is refused while the
--   category row still references the image (the old client ignores that error
--   and continues), so a refused category delete no longer loses its image.
--
-- PREREQUISITE: add-category-integrity.sql (provides the category_internal
-- schema and storage_path_reference_status).
-- Run it immediately AFTER that migration and BEFORE deploying the new client;
-- follow it with restrict-storage-writes-to-admins.sql (RUNBOOK.md).
--
-- TRADE-OFF (read before running)
--   * The product delete flow (AdminContext.deleteProduct) also removes images
--     before deleting the product row. With this policy those removals are
--     refused, so deleted products leave their image files behind (orphans,
--     never lost data). Reorder that flow to delete the row first if storage
--     use matters.
--   * Each protected DELETE runs a reference scan of the public tables
--     (see storage_path_reference_status). Fine at the current data size;
--     revisit if deletes become frequent or tables large.
--   * "unknown" (undecodable data, errors) blocks the delete.
--   * The Storage API reports success for objects filtered by RLS; the new
--     client checks what was actually removed.
--   * service_role bypasses RLS (server jobs / dashboard keep full control).
--
-- UNINSTALL REFERENCE ONLY — not a rollback step: image A and the release
-- both work with this policy, and dropping it lets admins (and, without
-- restrict-storage-writes-to-admins.sql, anyone) delete images still in use.
--   DROP POLICY IF EXISTS product_images_delete_only_unreferenced ON storage.objects;
--   DROP FUNCTION IF EXISTS category_internal.storage_object_deletable(text, text);
-- ============================================================================

BEGIN;

-- Policy first: it may still reference the old public helper
DROP POLICY IF EXISTS product_images_delete_only_unreferenced ON storage.objects;
DROP FUNCTION IF EXISTS public.storage_object_deletable(text, text);

-- In category_internal (created by add-category-integrity.sql) so it is not
-- exposed as /rest/v1/rpc/...; every deleting role needs EXECUTE because the
-- policy below calls it with the caller's privileges.
CREATE OR REPLACE FUNCTION category_internal.storage_object_deletable(p_bucket text, p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_bucket IS DISTINCT FROM 'product-images'
      OR category_internal.storage_path_reference_status(p_name) = 'unreferenced';
$$;
REVOKE ALL ON FUNCTION category_internal.storage_object_deletable(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION category_internal.storage_object_deletable(text, text) TO anon, authenticated, service_role;

-- RESTRICTIVE: AND-ed with the existing permissive delete policies, so it
-- can only take access away.
CREATE POLICY product_images_delete_only_unreferenced ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (category_internal.storage_object_deletable(bucket_id, name));

COMMIT;

-- POST-CHECK (read-only):
--   SELECT policyname, permissive, cmd, qual FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY cmd;
