-- ============================================================================
-- Backup supplement 2/2 — storage.objects policies (READ-ONLY)
-- Output: one text value = the file storage-policies.sql for the backup folder.
--
-- Why: `supabase db dump` excludes the storage schema, so the product-images
-- policies are not in schema.sql; a restore without this file has none.
-- Tested 2026-11-04 (RUNBOOK 1.4).
--
-- Run: psql "<session-pooler URL>" -X -At -f export-storage-policies.sql > "$B/storage-policies.sql"
--  or: SQL Editor → run → copy the single result cell into that file.
-- ============================================================================
SELECT concat_ws(E'\n',
  '-- storage.objects policies of production (exported ' || to_char(now(), 'YYYY-MM-DD HH24:MI TZ') || ').',
  '-- Apply after data.sql, as a superuser (RUNBOOK 1.4). Contains no data.',
  'BEGIN;',
  (SELECT string_agg(
     format('DROP POLICY IF EXISTS %I ON storage.objects;', policyname) || E'\n' ||
     format('CREATE POLICY %I ON storage.objects AS %s FOR %s TO %s', policyname, permissive, cmd,
            (SELECT string_agg(CASE WHEN rl = 'public' THEN 'public' ELSE quote_ident(rl) END, ', ') FROM unnest(roles) rl))
     || CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END
     || CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';',
     E'\n' ORDER BY policyname)
   FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'),
  'COMMIT;') AS sql;
