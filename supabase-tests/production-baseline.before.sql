-- Runs on the PRODUCTION-EQUIVALENT baseline, BEFORE any release migration.
-- Proves the exposures found by the 2026-10-25 production pre-check exist
-- (so the after-tests are not vacuous). Every write is undone immediately
-- (raised out of a sub-block) — the baseline stays unchanged.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

\set admin    '00000000-0000-0000-0000-00000000a001'
\set customer '00000000-0000-0000-0000-00000000b002'
\set choy     '00000000-0000-0000-0000-000000000c01'

CREATE SCHEMA b;
GRANT USAGE ON SCHEMA b TO anon, authenticated, service_role;

-- Execute p_sql, report affected rows, undo it. Expect exactly n rows.
CREATE FUNCTION b.rows_undone(p_sql text, n integer, label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c integer;
BEGIN
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS c = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'BU001', MESSAGE = c::text;
  EXCEPTION WHEN SQLSTATE 'BU001' THEN c := SQLERRM::int;
  END;
  IF c <> n THEN RAISE EXCEPTION 'FAIL (baseline): % — expected % rows, got %', label, n, c; END IF;
  RAISE NOTICE 'PASS (baseline exposure confirmed): % (% rows)', label, c;
END $$;

-- The self-promotion path: insert own membership, then ask is_admin(). Undone.
CREATE FUNCTION b.self_promote() RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE promoted boolean;
BEGIN
  BEGIN
    INSERT INTO public.admin_users (user_id) VALUES (auth.uid());
    promoted := public.is_admin();
    RAISE EXCEPTION USING ERRCODE = 'BU001', MESSAGE = promoted::text;
  EXCEPTION WHEN SQLSTATE 'BU001' THEN promoted := SQLERRM::boolean;
  END;
  RETURN promoted;
END $$;
CREATE FUNCTION b.ok(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL (baseline): %', label; END IF;
  RAISE NOTICE 'PASS (baseline exposure confirmed): %', label;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA b TO anon, authenticated, service_role;

\echo '== BEFORE: production-equivalent baseline exposures'
SELECT b.ok((SELECT NOT relrowsecurity FROM pg_class WHERE oid = 'public.admin_users'::regclass), 'admin_users RLS disabled');
SELECT b.ok(has_table_privilege('anon', 'public.admin_users', 'INSERT,UPDATE,DELETE,TRUNCATE'), 'anon holds write + TRUNCATE on admin_users');

SELECT set_config('request.jwt.claims', json_build_object('sub', :'customer', 'role', 'authenticated')::text, false);
SET ROLE authenticated;
SELECT b.ok(NOT public.is_admin(), 'customer is not an admin');
SELECT b.ok(b.self_promote(), 'customer can insert own admin_users row and is_admin() becomes true (self-promotion)');
SELECT b.ok(NOT public.is_admin(), 'self-promotion was undone');
SELECT b.rows_undone(format('UPDATE public.products SET price = 1 WHERE category_name = %L', 'Choyshab'), 2, 'customer can change product prices');
SELECT b.rows_undone('DELETE FROM public.audit_logs', 1, 'customer can delete audit log entries');
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
SET ROLE anon;
SELECT b.rows_undone(format('INSERT INTO public.admin_users (user_id) VALUES (%L)', :'customer'), 1, 'anon can insert admin_users rows');
SELECT b.rows_undone(format('UPDATE public.admin_users SET user_id = %L', :'customer'), 1, 'anon can rewrite the real admin membership');
SELECT b.rows_undone(format('UPDATE public.categories SET name = %L WHERE id = %L', 'Anon', :'choy'), 1, 'anon can rename categories');
SELECT b.rows_undone('UPDATE public.products SET stock = 0', 4, 'anon can zero product stock');
SELECT b.rows_undone(format('INSERT INTO public.audit_logs (action, admin_email) VALUES (%L, %L)', 'forged', 'admin@test'), 1, 'anon can forge audit entries');
SELECT b.rows_undone('UPDATE public.audit_logs SET action = ''edited''', 1, 'anon can edit audit entries');
SELECT b.rows_undone('DELETE FROM storage.objects WHERE bucket_id = ''product-images'' AND name = ''categories/choyshab.svg''', 1, 'anon can delete an image in use');
SELECT b.rows_undone('UPDATE storage.objects SET metadata = ''{"overwritten":true}'' WHERE bucket_id = ''product-images'' AND name = ''categories/choyshab.svg''', 1, 'anon can overwrite (UPDATE) an image');
RESET ROLE;

SELECT b.ok((SELECT count(*) = 1 FROM public.admin_users) AND (SELECT user_id = :'admin'::uuid FROM public.admin_users), 'baseline unchanged after the demonstrations');
DROP SCHEMA b CASCADE;
\echo 'BASELINE EXPOSURES CONFIRMED'
