-- ============================================================================
-- Category release — PRODUCTION PRE-CHECK (read-only)
-- Project: jbdzhwenzedlwbdpguyt (ailem-production)
--
-- Paste into Supabase Dashboard → SQL Editor and run, or run with psql against
-- a linked project. Everything runs inside a READ ONLY transaction that is
-- rolled back: it cannot change data or schema. No e-mail addresses, keys or
-- personal data are selected (admin accounts are reported as counts only).
--
-- Each check returns one result set with a "check" column; paste all results
-- (or export as CSV) into release/2026-10-categories/precheck-results/.
-- ============================================================================
BEGIN TRANSACTION READ ONLY;

-- 1. Versions --------------------------------------------------------------
SELECT '1 versions' AS check, current_setting('server_version') AS server_version,
       (SELECT string_agg(extname || ' ' || extversion, ', ' ORDER BY extname)
        FROM pg_extension WHERE extname IN ('pg_graphql', 'pgcrypto', 'uuid-ossp', 'pg_net', 'pg_cron')) AS extensions;

-- 2. Migration state (must be NOT applied yet) -----------------------------
SELECT '2 migration state' AS check,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'sort_order') AS has_sort_order,
  to_regnamespace('category_internal') IS NOT NULL AS has_category_internal,
  to_regclass('public.category_write_ops') IS NOT NULL AS has_write_ops,
  to_regprocedure('public.admin_save_category(uuid,uuid,text,text,text)') IS NOT NULL AS has_admin_save_category,
  to_regprocedure('public.is_admin()') IS NOT NULL AS has_is_admin,
  to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS has_cli_migration_table;

SELECT '2b cli migration history' AS check,
  CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
       THEN query_to_xml('SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 20', false, true, '')::text
       ELSE 'no supabase_migrations.schema_migrations table (migrations run manually)' END AS history;

-- 3. Schema compatibility --------------------------------------------------
SELECT '3 columns' AS check, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'categories')
    OR (table_name = 'products' AND column_name IN ('id', 'category_id', 'category_name', 'image', 'images', 'variants', 'a_plus_content', 'visible'))
    OR (table_name = 'orders' AND column_name IN ('id', 'user_id', 'items'))
    OR (table_name IN ('reviews', 'app_settings', 'users', 'admin_users', 'audit_logs') AND column_name IN ('id', 'user_id', 'images', 'banners', 'cart', 'role')))
ORDER BY table_name, ordinal_position;

SELECT '3b required tables' AS check, t AS table_name, to_regclass('public.' || t) IS NOT NULL AS present
FROM unnest(ARRAY['categories', 'products', 'reviews', 'app_settings', 'orders', 'users', 'admin_users', 'audit_logs']) AS t;

SELECT '3c constraints/indexes on categories' AS check, conname AS name, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'public.categories'::regclass
UNION ALL
SELECT '3c constraints/indexes on categories', indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'categories';

SELECT '3e audit_logs columns (secure-audit-logs.sql needs admin_id, admin_email, created_at)' AS check, column_name, data_type, column_default
FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' ORDER BY ordinal_position;

SELECT '3d products → categories FK' AS check, conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND contype = 'f';

-- 4. RLS state and policies ------------------------------------------------
SELECT '4 rls enabled' AS check, n.nspname || '.' || c.relname AS table_name, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname, c.relname) IN (('public', 'categories'), ('public', 'products'), ('public', 'audit_logs'), ('public', 'admin_users'), ('storage', 'objects'), ('storage', 'buckets'));

SELECT '4b policies' AS check, schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('categories', 'products', 'audit_logs', 'admin_users'))
   OR (schemaname = 'storage' AND tablename IN ('objects', 'buckets'))
ORDER BY schemaname, tablename, cmd, policyname;

-- 5. Grants ----------------------------------------------------------------
SELECT '5 table grants' AS check, table_schema, table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
  AND ((table_schema = 'public' AND table_name IN ('categories', 'products', 'audit_logs', 'admin_users', 'orders', 'users'))
    OR (table_schema = 'storage' AND table_name = 'objects'))
GROUP BY 1, 2, 3, 4 ORDER BY 2, 3, 4;

-- 6. Storage: bucket and, specifically, anonymous deletes -------------------
SELECT '6 bucket' AS check, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'product-images';

SELECT '6b product-images objects' AS check, count(*) AS objects, pg_size_pretty(sum(COALESCE((metadata->>'size')::bigint, 0))) AS total_size
FROM storage.objects WHERE bucket_id = 'product-images';

-- Permissive DELETE/ALL policies that apply to anon (roles {public} or {anon}).
-- Any row here means anonymous callers can delete objects the policy matches.
SELECT '6c anon-applicable storage DELETE policies' AS check, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND cmd IN ('DELETE', 'ALL')
  AND permissive = 'PERMISSIVE'
  AND (roles && ARRAY['public', 'anon']::name[]);

SELECT '6e anon-applicable storage UPDATE policies (overwrite)' AS check, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND cmd IN ('UPDATE', 'ALL') AND permissive = 'PERMISSIVE'
  AND (roles && ARRAY['public', 'anon']::name[]);

SELECT '6d anon storage privileges' AS check,
  has_table_privilege('anon', 'storage.objects', 'DELETE') AS anon_has_delete_grant,
  has_table_privilege('authenticated', 'storage.objects', 'DELETE') AS authenticated_has_delete_grant;

-- 7. Admin membership (counts only) -----------------------------------------
SELECT '7 admins' AS check,
  (SELECT count(*) FROM public.admin_users) AS admin_rows,
  (SELECT count(*) FROM public.admin_users au JOIN auth.users u ON u.id = au.user_id) AS admin_rows_with_auth_user,
  (SELECT count(*) FROM public.admin_users au JOIN auth.users u ON u.id = au.user_id WHERE u.last_sign_in_at > now() - interval '30 days') AS admins_signed_in_30d,
  (SELECT count(*) FROM auth.users) AS auth_users_total;

-- 8. Functions and triggers --------------------------------------------------
SELECT '8 relevant functions' AS check, n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'category_internal')
  AND (p.proname LIKE 'categor%' OR p.proname LIKE 'storage_%' OR p.proname IN
       ('is_admin', 'get_essential_data', 'admin_save_category', 'reorder_categories', 'resolve_category_write', 'update_updated_at_column'))
ORDER BY 2, 3;

SELECT '8b get_essential_data reads categories via row_to_json' AS check,
  p.oid::regprocedure AS function, p.prosrc ~ 'row_to_json\(c\)' AS categories_row_to_json,
  p.prosrc ~ 'uzum_url' AS has_uzum_url
FROM pg_proc p WHERE p.proname = 'get_essential_data';

SELECT '8c is_admin definition' AS check, pg_get_functiondef(to_regprocedure('public.is_admin()')) AS definition;

SELECT '8e SECURITY DEFINER functions that write admin_users (must be none)' AS check, p.oid::regprocedure AS function
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'extensions',
                        'graphql', 'graphql_public', 'realtime', 'vault', 'pgsodium', 'net', 'cron', 'supabase_functions')
  AND p.prosrc ~* '(insert\s+into|update|delete\s+from|truncate)\s+(public\.)?admin_users';

SELECT '8d triggers' AS check, event_object_table AS table_name, trigger_name, action_timing, string_agg(event_manipulation, ',') AS events
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table IN ('categories', 'products')
GROUP BY 2, 3, 4 ORDER BY 2, 3;

-- 9. Data API exposure --------------------------------------------------------
SELECT '9 authenticator settings (exposed schemas)' AS check, rolname, rolconfig
FROM pg_roles WHERE rolname = 'authenticator';

-- 10. Data preconditions -----------------------------------------------------
SELECT '10 duplicate names after normalisation' AS check, lower(btrim(name)) AS normalized, array_agg(name) AS names
FROM public.categories GROUP BY 2 HAVING count(*) > 1;

SELECT '10b names/images violating the new rules' AS check, id, name,
  name <> btrim(name) AS untrimmed, char_length(btrim(name)) NOT BETWEEN 1 AND 100 AS bad_length, btrim(COALESCE(image, '')) = '' AS blank_image
FROM public.categories
WHERE name <> btrim(name) OR char_length(btrim(name)) NOT BETWEEN 1 AND 100 OR btrim(COALESCE(image, '')) = '';

SELECT '10c orphan products' AS check, p.id, p.name, p.category_name, p.visible
FROM public.products p LEFT JOIN public.categories c ON c.name = p.category_name WHERE c.id IS NULL;

SELECT '10d products already linked by category_id' AS check, count(*) FILTER (WHERE category_id IS NOT NULL) AS linked, count(*) AS total
FROM public.products;

-- 11. Reference-scan cost (rows per public table) -----------------------------
SELECT '11 public table sizes' AS check, c.relname, c.reltuples::bigint AS approx_rows, pg_size_pretty(pg_total_relation_size(c.oid)) AS size
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY pg_total_relation_size(c.oid) DESC;

-- 12. Current activity (is anyone writing right now?) -----------------------
SELECT '12 activity' AS check, usename, application_name, state, count(*)
FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()
GROUP BY 2, 3, 4 ORDER BY 5 DESC;

-- 13. Payment readiness (add-payment-fulfillment.sql, image A) --------------
-- Columns the payment functions need (the migration stops if one is missing)
SELECT '13a payment columns' AS check, t.tbl || '.' || t.col AS column_name,
  EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.tbl AND c.column_name = t.col) AS present
FROM (VALUES ('orders','status'), ('orders','items'), ('orders','total'), ('orders','subtotal'), ('orders','user_id'),
             ('orders','payme_order_id'), ('orders','payme_transaction_id'), ('orders','payme_state'), ('orders','payme_create_time'),
             ('orders','payme_perform_time'), ('orders','payme_cancel_time'), ('orders','payme_cancel_reason'),
             ('orders','click_order_id'), ('orders','click_trans_id'), ('orders','click_complete_time'), ('orders','click_error'),
             ('products','stock'), ('products','variants'), ('users','bonus_points'), ('users','total_orders'),
             ('users','referred_by'), ('users','referral_code'), ('users','referrals'), ('app_settings','bonus_config')) AS t(tbl, col)
ORDER BY present, 2;

-- Must be 0 / 0, otherwise the unique indexes cannot be created
SELECT '13b duplicate transaction ids' AS check,
  (SELECT count(*) FROM (SELECT payme_transaction_id FROM public.orders WHERE payme_transaction_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d) AS payme_duplicates,
  (SELECT count(*) FROM (SELECT click_trans_id FROM public.orders WHERE click_trans_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d) AS click_duplicates,
  (SELECT count(*) FROM (SELECT payme_order_id FROM public.orders WHERE payme_order_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d) AS payme_order_id_duplicates;

-- The deployed 13d61f7 webhooks use the ANON key: without anon SELECT/UPDATE
-- on orders they cannot find or update orders at all (reproduced locally
-- after fix-users-orders-rls.sql). Counts only, no customer data.
SELECT '13c anon access to orders (deployed webhooks)' AS check,
  has_table_privilege('anon', 'public.orders', 'SELECT') AS anon_select,
  has_table_privilege('anon', 'public.orders', 'UPDATE') AS anon_update;
SELECT '13d recent online-payment orders' AS check, payment_method, status, payme_state, count(*) AS orders, max(created_at)::date AS latest
FROM public.orders
WHERE created_at > now() - interval '90 days' AND (payme_order_id IS NOT NULL OR click_order_id IS NOT NULL)
GROUP BY 2, 3, 4 ORDER BY 2, 3, 4;

ROLLBACK;
