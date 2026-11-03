-- Database tests for supabase-migrations/add-payment-fulfillment.sql
-- (payment-claim review R6-01 / R6-02). Run by run-db-tests.sh after the
-- release migrations; any failed assertion raises and psql stops non-zero.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
SET client_min_messages = notice;

CREATE SCHEMA pt;
GRANT USAGE ON SCHEMA pt TO anon, authenticated, service_role;

CREATE FUNCTION pt.ok(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END $$;

-- Statement must fail with the given SQLSTATE
CREATE FUNCTION pt.fails(p_sql text, p_state text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = p_state THEN
      RAISE NOTICE 'PASS: % (%)', label, SQLSTATE;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL: % — expected SQLSTATE %, got % (%)', label, p_state, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL: % — statement succeeded', label;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pt TO anon, authenticated, service_role;

CREATE FUNCTION pt.stock(p_id uuid) RETURNS integer LANGUAGE sql AS $$ SELECT stock FROM public.products WHERE id = p_id $$;
CREATE FUNCTION pt.bonus(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT bonus_points || '/' || total_orders || '/' || referrals FROM public.users WHERE id = p_id $$;
CREATE FUNCTION pt.variant_stock(p_id uuid, p_color text, p_size text) RETURNS integer LANGUAGE sql AS $$
  SELECT (v ->> 'stock')::int FROM public.products, jsonb_array_elements(variants) v
  WHERE id = p_id AND v ->> 'color' = p_color AND v ->> 'size' = p_size $$;

\set prod   '00000000-0000-0000-0000-0000000f0001'
\set vprod  '00000000-0000-0000-0000-0000000f0002'
\set buyer  '00000000-0000-0000-0000-0000000f00b1'
\set refr   '00000000-0000-0000-0000-0000000f00b2'

INSERT INTO public.products (id, name, stock, category_name, variants) VALUES
  (:'prod', 'Pay product', 10, 'Choyshab', '[]'),
  (:'vprod', 'Variant product', 99, 'Choyshab',
   '[{"color":"Oq","size":"2x","stock":5},{"color":"Qora","size":"2x","stock":5},{"color":"Oq","size":"1x","stock":"7"}]');
INSERT INTO public.users (id, referral_code, referred_by, bonus_points, total_orders, referrals) VALUES
  (:'buyer', 'BUYER1', 'REF1', 0, 0, 0),
  (:'refr', 'REF1', NULL, 0, 0, 0);
UPDATE public.app_settings SET bonus_config = '{"purchaseBonus": 3, "referralCommission": 10}' WHERE id = 1;

-- Orders: 100 000 UZS, 2 × product (subtotal 90 000 for the Payme base)
CREATE FUNCTION pt.new_order(p_id text, p_items jsonb, p_user text DEFAULT '00000000-0000-0000-0000-0000000f00b1')
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.orders (id, items, status, total, subtotal, user_id, payme_order_id, click_order_id)
  VALUES (p_id, p_items, 'pending', 100000, 90000, p_user, 'pm-' || p_id, 'ck-' || p_id)
$$;
CREATE FUNCTION pt.two_of(p_prod uuid) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_array(jsonb_build_object('id', p_prod, 'quantity', 2, 'price', 45000)) $$;

\o
\echo '== access: only service_role may call the payment functions'
\o /dev/null
SET ROLE anon;
SELECT pt.fails($$SELECT public.payme_perform_transaction('x', 1)$$, '42501', 'anon cannot call payme_perform_transaction');
SELECT pt.fails($$SELECT public.payme_create_transaction('x', 'y', 1, 1)$$, '42501', 'anon cannot call payme_create_transaction');
SELECT pt.fails($$SELECT public.click_complete_payment('x', '1', NULL, 1)$$, '42501', 'anon cannot call click_complete_payment');
SELECT pt.fails($$SELECT payment_internal.fulfill_order('x', 'y', true, true)$$, '42501', 'anon cannot reach payment_internal');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}', false);
SET ROLE authenticated;   -- an admin (admin_users row) is still refused
SELECT pt.fails($$SELECT public.payme_perform_transaction('x', 1)$$, '42501', 'signed-in admin cannot call payme_perform_transaction');
SELECT pt.fails($$SELECT public.click_complete_payment('x', '1', NULL, 1)$$, '42501', 'signed-in admin cannot call click_complete_payment');
SELECT pt.fails($$SELECT payment_internal.fulfill_order('x', 'y', true, true)$$, '42501', 'signed-in admin cannot reach payment_internal');
RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT pt.ok(NOT has_function_privilege('authenticated', 'public.payme_create_transaction(text,text,bigint,numeric)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.click_complete_payment(text,text,integer,bigint)', 'EXECUTE')
             AND has_function_privilege('service_role', 'public.payme_perform_transaction(text,bigint)', 'EXECUTE'),
             'EXECUTE granted to service_role only');
SELECT pt.ok(NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname IN ('payme_create_transaction', 'payme_perform_transaction', 'click_complete_payment') AND prosecdef),
             'payment functions are SECURITY INVOKER (RLS still applies to any other caller)');

\o
\echo '== Payme: create, perform, replay (one effect per order)'
\o /dev/null
SET ROLE service_role;
SELECT pt.new_order('p1', pt.two_of(:'prod'));
SELECT pt.ok((public.payme_create_transaction('pm-p1', 'tx-a', 1000, 9999) ->> 'result') = 'wrong_amount', 'wrong amount refused in CreateTransaction');
SELECT pt.ok((SELECT payme_transaction_id IS NULL FROM orders WHERE id = 'p1'), 'nothing bound after the wrong amount');
SELECT pt.ok((public.payme_create_transaction('pm-p1', 'tx-a', 1000, 10000000) ->> 'result') = 'created', 'CreateTransaction(A) binds');
SELECT pt.ok((public.payme_create_transaction('pm-p1', 'tx-a', 2000, 10000000) ->> 'create_time') = '1000', 'CreateTransaction(A) replay returns the stored transaction');
SELECT pt.ok((public.payme_create_transaction('pm-p1', 'tx-b', 2000, 10000000) ->> 'result') = 'order_unavailable', 'CreateTransaction(B) refused while A is active');
SELECT pt.ok((SELECT payme_transaction_id FROM orders WHERE id = 'p1') = 'tx-a', 'A stays bound');
SELECT pt.ok((public.payme_perform_transaction('tx-a', 3000) ->> 'result') = 'performed', 'PerformTransaction(A) performs');
SELECT pt.ok(pt.stock(:'prod') = 8, 'stock 10 → 8 in the same transaction');
SELECT pt.ok(pt.bonus(:'buyer') = '2700/1/0', 'buyer +2700 (3% of subtotal 90 000), total_orders +1');
SELECT pt.ok(pt.bonus(:'refr') = '9000/0/1', 'referrer +9000 (10% of 90 000), referrals +1');
SELECT pt.ok((SELECT status = 'approved' AND payme_state = 2 AND fulfilled_by = 'payme:tx-a' AND fulfilled_at IS NOT NULL FROM orders WHERE id = 'p1'),
             'order approved, state 2, fulfilled marker set');
SELECT pt.ok((public.payme_perform_transaction('tx-a', 4000) ->> 'perform_time') = '3000', 'PerformTransaction(A) replay returns the stored perform time');
SELECT pt.ok(pt.stock(:'prod') = 8 AND pt.bonus(:'buyer') = '2700/1/0', 'replay: no new effects');

\o
\echo '== R6-02: another transaction cannot reopen a fulfilled order'
\o /dev/null
SELECT pt.ok((public.payme_create_transaction('pm-p1', 'tx-b', 5000, 10000000) ->> 'result') = 'order_unavailable', 'CreateTransaction(B) on the performed order refused');
SELECT pt.ok((SELECT payme_transaction_id = 'tx-a' AND payme_state = 2 FROM orders WHERE id = 'p1'), 'A and state 2 kept (not overwritten)');
SELECT pt.ok((public.payme_perform_transaction('tx-b', 6000) ->> 'result') = 'transaction_not_found', 'PerformTransaction(B) finds nothing');
SELECT pt.ok((public.click_complete_payment('ck-p1', '777', NULL, 7000) ->> 'result') = 'already_paid', 'Click on the Payme-paid order: already paid');
SELECT pt.ok(pt.stock(:'prod') = 8 AND pt.bonus(:'buyer') = '2700/1/0', 'still one set of effects');
SELECT pt.ok((public.payme_create_transaction('pm-p1', 'tx-a', 8000, 10000000) ->> 'result') = 'existing', 'CreateTransaction(A) replay after perform: existing');

-- The same transaction id cannot be bound to a second order
SELECT pt.new_order('p2', pt.two_of(:'prod'));
SELECT pt.ok((public.payme_create_transaction('pm-p2', 'tx-a', 1, 10000000) ->> 'result') = 'order_unavailable', 'transaction A cannot be bound to another order');

\o
\echo '== R6-01: a failing effect rolls back everything; the retry applies it once'
\o /dev/null
RESET ROLE;
CREATE FUNCTION pt.boom() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$;
CREATE TRIGGER pt_fail_bonus BEFORE UPDATE OF bonus_points ON public.users FOR EACH ROW EXECUTE FUNCTION pt.boom();
SET ROLE service_role;
SELECT pt.ok((public.payme_create_transaction('pm-p2', 'tx-c', 1, 10000000) ->> 'result') = 'created', 'p2: CreateTransaction(C)');
SELECT pt.fails($$SELECT public.payme_perform_transaction('tx-c', 9000)$$, 'P0001', 'perform fails when the bonus update fails (after the stock update)');
SELECT pt.ok(pt.stock(:'prod') = 8, 'partial progress rolled back: stock unchanged');
SELECT pt.ok((SELECT status = 'pending' AND payme_state = 1 AND fulfilled_at IS NULL FROM orders WHERE id = 'p2'), 'order still pending / state 1 (payable)');
RESET ROLE;
DROP TRIGGER pt_fail_bonus ON public.users;
SET ROLE service_role;
SELECT pt.ok((public.payme_perform_transaction('tx-c', 9100) ->> 'result') = 'performed', 'retry after recovery performs');
SELECT pt.ok(pt.stock(:'prod') = 6 AND pt.bonus(:'buyer') = '5400/2/0', 'effects applied exactly once (stock 8 → 6, bonus +2700)');
SELECT pt.ok(pt.bonus(:'refr') = '18000/0/2', 'referrer commission applied once for p2');

RESET ROLE;
CREATE TRIGGER pt_fail_stock BEFORE UPDATE OF stock ON public.products FOR EACH ROW EXECUTE FUNCTION pt.boom();
SET ROLE service_role;
SELECT pt.new_order('c1', pt.two_of(:'prod'));
SELECT pt.fails($$SELECT public.click_complete_payment('ck-c1', '5001', NULL, 1)$$, 'P0001', 'Click complete fails when the stock update fails');
SELECT pt.ok((SELECT status = 'pending' AND click_trans_id IS NULL FROM orders WHERE id = 'c1'), 'Click order still pending, transaction not recorded');
RESET ROLE;
DROP TRIGGER pt_fail_stock ON public.products;
SET ROLE service_role;
SELECT pt.ok((public.click_complete_payment('ck-c1', '5001', NULL, 2) ->> 'result') = 'completed', 'Click retry after recovery completes');
SELECT pt.ok(pt.stock(:'prod') = 4 AND pt.bonus(:'buyer') = '8400/3/0', 'Click effects once (stock 6 → 4, +3000 = 3% of total, no referral)');
SELECT pt.ok(pt.bonus(:'refr') = '18000/0/2', 'Click pays no referral commission (as before)');

\o
\echo '== Click: replays, other transactions, rejections'
\o /dev/null
SELECT pt.ok((public.click_complete_payment('ck-c1', '5001', NULL, 3) ->> 'result') = 'already_processed', 'same Click transaction: already processed');
SELECT pt.ok((public.click_complete_payment('ck-c1', '5002', NULL, 3) ->> 'result') = 'already_paid', 'other Click transaction: already paid');
SELECT pt.ok(pt.stock(:'prod') = 4 AND pt.bonus(:'buyer') = '8400/3/0', 'no new effects');
SELECT pt.new_order('c2', pt.two_of(:'prod'));
SELECT pt.ok((public.click_complete_payment('ck-c2', '6001', -5017, 1) ->> 'result') = 'rejected', 'Click error < 0 rejects');
SELECT pt.ok((SELECT status = 'rejected' AND fulfilled_at IS NULL FROM orders WHERE id = 'c2') AND pt.stock(:'prod') = 4, 'rejected: no effects');
SELECT pt.ok((public.click_complete_payment('ck-c2', '6002', NULL, 1) ->> 'result') = 'cancelled', 'later completion of a rejected order: cancelled');
SELECT pt.ok((public.click_complete_payment('ck-c2', 'x1', NULL, 1) ->> 'result') = 'order_not_found', 'non-canonical Click id refused');

-- Payme bound first, Click paid it: Payme perform must not fulfil again
SELECT pt.new_order('pc', pt.two_of(:'prod'));
SELECT pt.ok((public.payme_create_transaction('pm-pc', 'tx-pc', 1, 10000000) ->> 'result') = 'created', 'pc: Payme bound');
SELECT pt.ok((public.click_complete_payment('ck-pc', '7001', NULL, 1) ->> 'result') = 'completed', 'pc: Click completes it');
SELECT pt.ok((public.payme_perform_transaction('tx-pc', 1) ->> 'result') = 'order_unavailable', 'pc: Payme perform refused (paid via Click)');
SELECT pt.ok(pt.stock(:'prod') = 2, 'pc: stock deducted once (4 → 2)');

\o
\echo '== Fulfillment details (variants, bad items, admin-approved orders)'
\o /dev/null
SELECT pt.new_order('v1', '[{"id":"00000000-0000-0000-0000-0000000f0002","quantity":2,"selectedColor":"OQ","selectedSize":"2X"},
                           {"productId":"00000000-0000-0000-0000-0000000f0002","quantity":"9","color":"oq","size":"1x"},
                           {"id":"00000000-0000-0000-0000-00000000dead","quantity":1},
                           {"id":"not-a-uuid","quantity":1},
                           {"id":"00000000-0000-0000-0000-0000000f0001","quantity":"abc"},
                           {"id":"00000000-0000-0000-0000-0000000f0001","quantity":-3},
                           "garbage"]');
SELECT pt.ok((public.click_complete_payment('ck-v1', '8001', NULL, 1) ->> 'result') = 'completed', 'order with odd items completes');
SELECT pt.ok(pt.variant_stock(:'vprod', 'Oq', '2x') = 3, 'variant matched case-insensitively: 5 → 3');
SELECT pt.ok(pt.variant_stock(:'vprod', 'Qora', '2x') = 5, 'other variant untouched');
SELECT pt.ok(pt.variant_stock(:'vprod', 'Oq', '1x') = 0, 'string stock "7" − 9 floors at 0; quantity "9" accepted');
SELECT pt.ok(pt.stock(:'vprod') = 99, 'variant product: products.stock untouched');
SELECT pt.ok(pt.stock(:'prod') = 2, 'unknown product / bad id / bad quantity skipped');

RESET ROLE;
INSERT INTO public.orders (id, items, status, total, subtotal, user_id, payme_order_id)
VALUES ('adm', pt.two_of(:'prod'), 'approved', 100000, 90000, :'buyer', 'pm-adm');
SET ROLE service_role;
SELECT pt.ok((public.payme_create_transaction('pm-adm', 'tx-adm', 1, 10000000) ->> 'result') = 'order_unavailable', 'admin-approved order cannot get a Payme transaction');
RESET ROLE;

\o
\echo 'ALL PAYMENT TESTS PASSED'
