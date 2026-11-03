-- ============================================================================
-- Category release — VERIFY AFTER MIGRATION (production-safe)
--
-- Run in Supabase SQL Editor (as postgres) AFTER the migrations.
-- Simulates anon / non-admin / admin requests with SET LOCAL ROLE + JWT
-- claims, exactly like PostgREST/Storage do, inside ONE transaction that is
-- ALWAYS ROLLED BACK. Writes are no-ops (name = name) or storage-metadata
-- deletes that the rollback undoes; files in storage are never touched (SQL
-- cannot delete them). Results are collected in transaction-local settings
-- and returned as one table at the end. Every row should read PASS.
-- ============================================================================
BEGIN;
SET LOCAL statement_timeout = '120s';

-- Inputs chosen as postgres --------------------------------------------------
SELECT set_config('verify.category_id', (SELECT id::text FROM public.categories ORDER BY sort_order LIMIT 1), true);
SELECT set_config('verify.admin_uid', COALESCE((SELECT user_id::text FROM public.admin_users LIMIT 1), ''), true);
-- a real signed-up user that is NOT an admin (no details read); random id if none
SELECT set_config('verify.nonadmin_uid', COALESCE((SELECT u.id::text FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = u.id) LIMIT 1), gen_random_uuid()::text), true);
-- an image object referenced by a category
SELECT set_config('verify.ref_path',
  COALESCE((SELECT split_part(split_part(image, '/product-images/', 2), '?', 1) FROM public.categories
            WHERE image LIKE '%/product-images/%' LIMIT 1), ''), true);
-- an UNreferenced object among the 30 newest (empty if none)
SELECT set_config('verify.unref_path',
  COALESCE((SELECT o.name FROM (SELECT name FROM storage.objects WHERE bucket_id = 'product-images'
                                ORDER BY created_at DESC LIMIT 30) o
            WHERE category_internal.storage_path_reference_status(o.name) = 'unreferenced' LIMIT 1), ''), true);
SELECT set_config('storage.allow_delete_query', 'true', true);  -- what the Storage API sets
-- Each simulated storage delete runs in its own sub-block that is undone
-- immediately (RAISE 'VR001' carrying the row count), so one role's delete
-- cannot hide the object from the next role's attempt.

-- Anonymous ------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    UPDATE public.categories SET name = name WHERE id = current_setting('verify.category_id')::uuid;
    PERFORM set_config('verify.r_anon_update', 'FAIL: anon UPDATE allowed', true);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM set_config('verify.r_anon_update', 'PASS: anon UPDATE denied', true);
  END;
  BEGIN
    PERFORM public.admin_save_category(gen_random_uuid(), NULL, 'verify', 'x');
    PERFORM set_config('verify.r_anon_rpc', 'FAIL: anon admin_save_category allowed', true);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM set_config('verify.r_anon_rpc', 'PASS: anon admin_save_category denied', true);
  END;
END $$;
DO $$ DECLARE n int; BEGIN
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = current_setting('verify.ref_path');
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = n::text;
  EXCEPTION WHEN SQLSTATE 'VR001' THEN n := SQLERRM::int;
            WHEN insufficient_privilege THEN n := 0;
  END;
  PERFORM set_config('verify.r_anon_del_ref', CASE WHEN n = 0 THEN 'PASS: anon cannot delete a referenced image' ELSE 'FAIL: anon deleted a referenced image' END, true);
  IF current_setting('verify.unref_path') = '' THEN
    PERFORM set_config('verify.r_anon_del_unref', 'SKIP: no unreferenced object found to test', true);
    RETURN;
  END IF;
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = current_setting('verify.unref_path');
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = n::text;
  EXCEPTION WHEN SQLSTATE 'VR001' THEN n := SQLERRM::int;
            WHEN insufficient_privilege THEN n := 0;
  END;
  PERFORM set_config('verify.r_anon_del_unref', CASE WHEN n = 0 THEN 'PASS: anon cannot delete an unreferenced image'
    ELSE 'WARN: anon CAN delete unreferenced images (apply restrict-storage-deletes-to-admins.sql)' END, true);
END $$;
RESET ROLE;

-- Signed-in non-admin ----------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('verify.nonadmin_uid'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  UPDATE public.categories SET name = name WHERE id = current_setting('verify.category_id')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('verify.r_user_update', CASE WHEN n = 0 THEN 'PASS: non-admin UPDATE filtered (0 rows)' ELSE 'FAIL: non-admin UPDATE applied' END, true);
  BEGIN
    PERFORM public.admin_save_category(gen_random_uuid(), NULL, 'verify', 'x');
    PERFORM set_config('verify.r_user_rpc', 'FAIL: non-admin admin_save_category allowed', true);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM set_config('verify.r_user_rpc', 'PASS: non-admin admin_save_category denied', true);
  END;
  BEGIN
    PERFORM category_internal.category_finish_write(gen_random_uuid(), current_setting('verify.category_id')::uuid);
    PERFORM set_config('verify.r_user_finish', 'FAIL: non-admin category_finish_write allowed', true);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM set_config('verify.r_user_finish', 'PASS: non-admin category_finish_write denied', true);
  END;
  IF current_setting('verify.unref_path') <> '' THEN
    BEGIN
      DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = current_setting('verify.unref_path');
      GET DIAGNOSTICS n = ROW_COUNT;
      RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = n::text;
    EXCEPTION WHEN SQLSTATE 'VR001' THEN n := SQLERRM::int;
              WHEN insufficient_privilege THEN n := 0;
    END;
    PERFORM set_config('verify.r_user_del_unref', CASE WHEN n = 0 THEN 'PASS: non-admin cannot delete an unreferenced image'
      ELSE 'WARN: non-admin CAN delete unreferenced images (apply restrict-storage-deletes-to-admins.sql)' END, true);
  ELSE
    PERFORM set_config('verify.r_user_del_unref', 'SKIP: no unreferenced object found to test', true);
  END IF;
END $$;
RESET ROLE;

-- Admin (first admin_users row; no account details are read) -----------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('verify.admin_uid'), 'role', 'authenticated')::text, true)
WHERE current_setting('verify.admin_uid') <> '';
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  IF current_setting('verify.admin_uid') = '' THEN
    PERFORM set_config('verify.r_admin', 'FAIL: admin_users is empty — nobody can edit categories', true);
    RETURN;
  END IF;
  UPDATE public.categories SET name = name WHERE id = current_setting('verify.category_id')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('verify.r_admin', CASE WHEN n = 1 THEN 'PASS: admin UPDATE allowed' ELSE 'FAIL: admin UPDATE filtered' END, true);
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = current_setting('verify.ref_path');
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = n::text;
  EXCEPTION WHEN SQLSTATE 'VR001' THEN n := SQLERRM::int;
  END;
  PERFORM set_config('verify.r_admin_del_ref', CASE WHEN n = 0 THEN 'PASS: admin cannot delete a referenced image' ELSE 'FAIL: admin deleted a referenced image' END, true);
  IF current_setting('verify.unref_path') <> '' THEN
    BEGIN
      DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = current_setting('verify.unref_path');
      GET DIAGNOSTICS n = ROW_COUNT;
      RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = n::text;
    EXCEPTION WHEN SQLSTATE 'VR001' THEN n := SQLERRM::int;
    END;
    PERFORM set_config('verify.r_admin_del_unref', CASE WHEN n = 1 THEN 'PASS: admin can delete an unreferenced image' ELSE 'FAIL: admin cannot delete an unreferenced image' END, true);
  END IF;
END $$;
RESET ROLE;

-- Membership, products, audit logs, storage overwrite (security migrations) --
-- Undo helper pattern as above: each write is measured and immediately undone.
SELECT set_config('verify.product_id', (SELECT id::text FROM public.products ORDER BY created_at LIMIT 1), true);
SELECT set_config('verify.products_secured', (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.products'::regclass), true);

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('verify.nonadmin_uid'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; outcome text; BEGIN
  -- (results are recorded AFTER each undone sub-block: settings made inside it are rolled back too)
  BEGIN
    INSERT INTO public.admin_users (user_id) VALUES (auth.uid());
    RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = 'inserted';
  EXCEPTION WHEN SQLSTATE 'VR001' THEN outcome := 'inserted';
            WHEN insufficient_privilege THEN outcome := 'denied';
            WHEN foreign_key_violation THEN outcome := 'fk';
  END;
  PERFORM set_config('verify.s_user_promote', CASE outcome
    WHEN 'denied' THEN 'PASS: non-admin cannot self-promote'
    WHEN 'inserted' THEN 'FAIL: non-admin inserted its own admin_users row (self-promotion)'
    ELSE 'FAIL: admin_users INSERT permitted for a non-admin (only the FK stopped this test row)' END, true);
  BEGIN
    INSERT INTO public.audit_logs (action) VALUES ('verify-forged');
    RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = 'inserted';
  EXCEPTION WHEN SQLSTATE 'VR001' THEN outcome := 'inserted';
            WHEN insufficient_privilege THEN outcome := 'denied';
  END;
  PERFORM set_config('verify.s_user_audit', CASE outcome WHEN 'denied' THEN 'PASS: non-admin cannot write audit logs'
    ELSE 'FAIL: non-admin wrote an audit entry' END, true);
  BEGIN
    UPDATE storage.objects SET metadata = metadata WHERE bucket_id = 'product-images' AND name = current_setting('verify.ref_path');
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = n::text;
  EXCEPTION WHEN SQLSTATE 'VR001' THEN n := SQLERRM::int;
            WHEN insufficient_privilege THEN n := 0;
  END;
  PERFORM set_config('verify.s_user_overwrite', CASE WHEN n = 0 THEN 'PASS: non-admin cannot overwrite (UPDATE) an image' ELSE 'FAIL: non-admin can overwrite images' END, true);
  IF current_setting('verify.products_secured') = 'true' THEN
    BEGIN
      UPDATE public.products SET price = price WHERE id = current_setting('verify.product_id')::uuid;
      GET DIAGNOSTICS n = ROW_COUNT;
      RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = n::text;
    EXCEPTION WHEN SQLSTATE 'VR001' THEN n := SQLERRM::int;
              WHEN insufficient_privilege THEN n := 0;
    END;
    PERFORM set_config('verify.s_user_product', CASE WHEN n = 0 THEN 'PASS: non-admin product write filtered' ELSE 'FAIL: non-admin can write products' END, true);
  ELSE
    PERFORM set_config('verify.s_user_product', 'PENDING: secure-products.sql not applied yet (runs after the deploy)', true);
  END IF;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
DO $$ DECLARE n int; BEGIN
  BEGIN
    PERFORM 1 FROM public.admin_users LIMIT 1;
    n := 1;
  EXCEPTION WHEN insufficient_privilege THEN n := 0;
  END;
  PERFORM set_config('verify.s_anon_members', CASE WHEN n = 0 THEN 'PASS: anon cannot read admin_users' ELSE 'FAIL: anon can read admin_users' END, true);
  BEGIN
    UPDATE storage.objects SET metadata = metadata WHERE bucket_id = 'product-images' AND name = current_setting('verify.ref_path');
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = n::text;
  EXCEPTION WHEN SQLSTATE 'VR001' THEN n := SQLERRM::int;
            WHEN insufficient_privilege THEN n := 0;
  END;
  PERFORM set_config('verify.s_anon_overwrite', CASE WHEN n = 0 THEN 'PASS: anon cannot overwrite (UPDATE) an image' ELSE 'FAIL: anon can overwrite images' END, true);
  IF current_setting('verify.products_secured') = 'true' THEN
    BEGIN
      UPDATE public.products SET price = price WHERE id = current_setting('verify.product_id')::uuid;
      RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = 'updated';
    EXCEPTION WHEN SQLSTATE 'VR001' THEN n := 1;
              WHEN insufficient_privilege THEN n := 0;
    END;
    PERFORM set_config('verify.s_anon_product', CASE WHEN n = 0 THEN 'PASS: anon cannot write products' ELSE 'FAIL: anon can write products' END, true);
  ELSE
    PERFORM set_config('verify.s_anon_product', 'PENDING: secure-products.sql not applied yet (runs after the deploy)', true);
  END IF;
  PERFORM set_config('verify.s_anon_read_products', CASE WHEN (SELECT count(*) FROM public.products) > 0 THEN 'PASS: anon can read products' ELSE 'FAIL: anon cannot read products' END, true);
END $$;
RESET ROLE;

-- Expected stamp: the admin's id and its auth.users e-mail (read here, as
-- postgres); the JWT claim 'verify@invalid' and the submitted value must lose.
SELECT set_config('verify.admin_stamp', current_setting('verify.admin_uid') || '|' ||
       COALESCE((SELECT NULLIF(btrim(u.email), '') FROM auth.users u WHERE u.id::text = current_setting('verify.admin_uid')), '<null>'), true)
WHERE current_setting('verify.admin_uid') <> '';
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('verify.admin_uid'), 'role', 'authenticated', 'email', 'verify@invalid')::text, true)
WHERE current_setting('verify.admin_uid') <> '';
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; v_actor text; BEGIN
  IF current_setting('verify.admin_uid') = '' THEN RETURN; END IF;
  PERFORM set_config('verify.s_admin_login', CASE WHEN (SELECT count(*) FROM public.admin_users WHERE user_id = auth.uid()) = 1
    THEN 'PASS: admin can read its own membership (login)' ELSE 'FAIL: admin cannot read its own membership — admin login will fail' END, true);
  BEGIN
    INSERT INTO public.audit_logs (action, admin_id, admin_email) VALUES ('verify-audit', 'spoofed', 'spoofed@invalid')
    RETURNING admin_id::text || '|' || COALESCE(admin_email, '<null>') INTO v_actor;
    RAISE EXCEPTION USING ERRCODE = 'VR001', MESSAGE = COALESCE(v_actor, '');
  EXCEPTION WHEN SQLSTATE 'VR001' THEN v_actor := SQLERRM;
            WHEN insufficient_privilege THEN v_actor := 'denied';
  END;
  PERFORM set_config('verify.s_admin_audit', CASE WHEN v_actor = current_setting('verify.admin_stamp') THEN 'PASS: admin audit insert works; actor id and e-mail stamped by the database'
    WHEN v_actor = 'denied' THEN 'FAIL: admin cannot write audit logs' ELSE 'FAIL: audit actor not stamped (' || v_actor || ')' END, true);
END $$;
RESET ROLE;

-- Results (also structural checks) -------------------------------------------
SELECT k AS check, current_setting('verify.' || k, true) AS result
FROM unnest(ARRAY['r_anon_update', 'r_anon_rpc', 'r_anon_del_ref', 'r_anon_del_unref',
                  'r_user_update', 'r_user_rpc', 'r_user_finish', 'r_user_del_unref',
                  'r_admin', 'r_admin_del_ref', 'r_admin_del_unref',
                  's_user_promote', 's_user_audit', 's_user_overwrite', 's_user_product',
                  's_anon_members', 's_anon_overwrite', 's_anon_product', 's_anon_read_products',
                  's_admin_login', 's_admin_audit']) AS k
UNION ALL
SELECT 'categories policies', CASE WHEN (SELECT string_agg(cmd || ':' || array_to_string(roles, '+'), ' ' ORDER BY cmd) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories')
  = 'DELETE:authenticated INSERT:authenticated SELECT:public UPDATE:authenticated' THEN 'PASS: exactly the 4 new policies' ELSE 'FAIL: unexpected category policies' END
UNION ALL
SELECT 'internal helpers', CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('category_finish_write', 'category_claim_write', 'storage_path_reference_status', 'storage_object_deletable'))
  THEN 'PASS: none in public' ELSE 'FAIL: helper still in public' END
UNION ALL
SELECT 'sort_order', CASE WHEN NOT EXISTS (SELECT 1 FROM public.categories WHERE sort_order IS NULL) THEN 'PASS: every category ordered' ELSE 'FAIL: NULL sort_order' END
UNION ALL
SELECT 'product links', (SELECT count(*) FILTER (WHERE category_id IS NOT NULL) || '/' || count(*) || ' products linked by category_id (orphans stay unlinked)' FROM public.products)
UNION ALL
SELECT 'RLS enabled', (SELECT string_agg(c.relname || '=' || c.relrowsecurity, ' ' ORDER BY c.relname) FROM pg_class c
  WHERE c.oid IN ('public.admin_users'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.audit_logs'::regclass))
UNION ALL
SELECT 'admin_users grants', CASE WHEN NOT has_table_privilege('anon', 'public.admin_users', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.admin_users', 'INSERT') AND NOT has_table_privilege('authenticated', 'public.admin_users', 'TRUNCATE')
  THEN 'PASS: no anon access, authenticated SELECT only' ELSE 'FAIL: admin_users still writable/readable by API roles' END
UNION ALL
SELECT 'storage write policies', (SELECT string_agg(policyname || ' [' || cmd || ' ' || permissive || ']', ', ' ORDER BY cmd, policyname) FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd IN ('UPDATE', 'ALL'))
UNION ALL
SELECT 'storage delete policies', (SELECT string_agg(policyname || ' [' || permissive || ']', ', ') FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd IN ('DELETE', 'ALL'))
UNION ALL
-- add-payment-fulfillment.sql (applied before image A)
SELECT 'payment functions', CASE
  WHEN (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname IN ('payme_create_transaction', 'payme_perform_transaction', 'click_complete_payment')
          AND NOT p.prosecdef
          AND NOT has_function_privilege('anon', p.oid, 'EXECUTE') AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
          AND has_function_privilege('service_role', p.oid, 'EXECUTE')) = 3
  THEN 'PASS: 3 functions, SECURITY INVOKER, service_role only'
  ELSE 'FAIL: payment functions missing or callable by anon/authenticated' END
UNION ALL
SELECT 'payment internals', CASE
  WHEN to_regnamespace('payment_internal') IS NOT NULL
   AND NOT has_schema_privilege('anon', 'payment_internal', 'USAGE') AND NOT has_schema_privilege('authenticated', 'payment_internal', 'USAGE')
   AND NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'fulfill_order')
  THEN 'PASS: helpers only in payment_internal, no API-role access' ELSE 'FAIL: payment_internal missing or reachable' END
UNION ALL
SELECT 'payment binding', CASE
  WHEN to_regclass('public.orders_payme_transaction_id_key') IS NOT NULL AND to_regclass('public.orders_click_trans_id_key') IS NOT NULL
   AND (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name IN ('fulfilled_at', 'fulfilled_by')) = 2
  THEN 'PASS: unique transaction ids, fulfilled marker present' ELSE 'FAIL: indexes or fulfilled columns missing' END;

ROLLBACK;
