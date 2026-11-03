-- ============================================================================
-- Transactional payment fulfillment (payment-claim review R6-01 / R6-02,
-- 2026-10-25)
--
-- FINDINGS
--   R6-01 The webhooks marked an order paid in one request and changed stock
--         and bonuses in later requests whose errors were swallowed. A failure
--         left the order approved without its effects, and retries answered
--         "already done" without repairing them.
--   R6-02 Payme CreateTransaction(B) overwrote an already performed
--         transaction A on the same order and reset payme_state to 1, so
--         PerformTransaction(B) deducted stock and awarded bonuses again.
--
-- WHAT
--   * One database transaction per payment state change. Each function locks
--     the order row (FOR UPDATE), re-checks eligibility, changes the state and
--     applies stock and bonus effects — all commit together or not at all.
--     A failure leaves the order exactly as before (still payable), so the
--     provider's retry does the whole thing again. A lost commit response is
--     answered from the stored state on retry, without new effects.
--   * orders.fulfilled_at / fulfilled_by: order-level marker. Effects are
--     applied at most once per order, whichever provider or transaction asks.
--   * Payme binding is decided inside CreateTransaction under the order lock:
--     a different transaction is refused while the order is not pending, is
--     fulfilled, or has an active (state 1) or performed (state 2) one.
--   * Stock and bonus use in-place increments under row locks (products in id
--     order) — concurrent DIFFERENT orders no longer overwrite each other.
--   * Telegram notifications are NOT here: the webhooks send them only after
--     the transaction committed (at most once; a lost response skips them).
--   * Unique transaction ids per order (partial unique indexes).
--
-- ACCESS: the three API functions are SECURITY INVOKER and executable ONLY by
-- service_role (the webhooks' server-only client). anon/authenticated/PUBLIC
-- have no EXECUTE; RLS still applies to anyone else. Helpers live in schema
-- payment_internal, which must NOT be added to the API's exposed schemas.
--
-- ORDER: run BEFORE deploying image A / the release (their webhooks call these
-- functions and fail closed without them). The currently deployed 13d61f7
-- ignores the new columns/functions, so it keeps working after this file.
--
-- Idempotent. Behaviour kept from the old JS (webhooks' deductStock /
-- awardBonusPoints): product id = item.id | productId | product_id; variants
-- matched case-insensitively on color|color_ru and size|size_ru when the item
-- has both, else products.stock; stock floors at 0; bonus = round(base *
-- purchaseBonus%). Payme: base = subtotal (total when 0/NULL) and the
-- referrer (users.referral_code = buyer.referred_by, exactly one) gets
-- round(base * referralCommission%) and referrals + 1. Click (as its old
-- code): base = total, no referral commission. Config defaults 1 / 3 (0 also
-- falls back, as before). Items that cannot be used (unknown product,
-- quantity not a positive integer) are skipped, not fatal.
--
-- NO ROLLBACK that re-opens R6: the webhooks of image A and of the release
-- need these functions. Fix forward with CREATE OR REPLACE.
-- ============================================================================

BEGIN;

-- Required columns (production has them via add-payme-fields / add-click-fields)
DO $$
DECLARE
  c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['orders.status', 'orders.items', 'orders.total', 'orders.subtotal', 'orders.user_id',
                           'orders.payme_order_id', 'orders.payme_transaction_id', 'orders.payme_state',
                           'orders.payme_create_time', 'orders.payme_perform_time', 'orders.payme_cancel_time',
                           'orders.payme_cancel_reason', 'orders.click_order_id', 'orders.click_trans_id',
                           'orders.click_complete_time', 'orders.click_error',
                           'products.stock', 'products.variants',
                           'users.bonus_points', 'users.total_orders', 'users.referred_by', 'users.referral_code',
                           'users.referrals', 'app_settings.bonus_config'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = split_part(c, '.', 1)
                     AND column_name = split_part(c, '.', 2)) THEN
      RAISE EXCEPTION 'add-payment-fulfillment: column public.% is missing', c;
    END IF;
  END LOOP;

  -- A provider transaction must belong to one order
  IF EXISTS (SELECT 1 FROM public.orders WHERE payme_transaction_id IS NOT NULL
             GROUP BY payme_transaction_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'add-payment-fulfillment: duplicate orders.payme_transaction_id values — resolve them first';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE click_trans_id IS NOT NULL
             GROUP BY click_trans_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'add-payment-fulfillment: duplicate orders.click_trans_id values — resolve them first';
  END IF;
END $$;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfilled_by text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payme_transaction_id_key
  ON public.orders (payme_transaction_id) WHERE payme_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_click_trans_id_key
  ON public.orders (click_trans_id) WHERE click_trans_id IS NOT NULL;

CREATE SCHEMA IF NOT EXISTS payment_internal;
REVOKE ALL ON SCHEMA payment_internal FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA payment_internal TO service_role;

-- ---------------------------------------------------------------- helpers
-- Integer from a JSON number or digit string (JS-style coercion), else NULL
CREATE OR REPLACE FUNCTION payment_internal.json_int(p jsonb)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT CASE
    WHEN jsonb_typeof(p) = 'number' AND (p::text)::numeric = trunc((p::text)::numeric)
         AND abs((p::text)::numeric) < 1000000000 THEN (p::text)::numeric::integer
    WHEN jsonb_typeof(p) = 'string' AND (p #>> '{}') ~ '^\s*-?\d{1,9}\s*$' THEN btrim(p #>> '{}')::integer
  END
$$;

CREATE OR REPLACE FUNCTION payment_internal.json_num(p jsonb)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT CASE
    WHEN jsonb_typeof(p) = 'number' THEN (p::text)::numeric
    WHEN jsonb_typeof(p) = 'string' AND (p #>> '{}') ~ '^\s*-?\d{1,12}(\.\d{1,12})?\s*$' THEN btrim(p #>> '{}')::numeric
  END
$$;

-- item.id || item.productId || item.product_id, when it is a uuid
CREATE OR REPLACE FUNCTION payment_internal.item_product_id(p_item jsonb)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT CASE WHEN v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN v::uuid END
  FROM (SELECT COALESCE(NULLIF(p_item ->> 'id', ''), NULLIF(p_item ->> 'productId', ''),
                        NULLIF(p_item ->> 'product_id', '')) AS v) s
  WHERE jsonb_typeof(p_item) = 'object'
$$;

-- JS Math.round for the bonus amounts
CREATE OR REPLACE FUNCTION payment_internal.js_round(p numeric)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT floor(p + 0.5)::integer
$$;

-- Apply the order's stock and bonus effects once. Caller must hold the order
-- row lock and have already decided the order is paid. Returns false if the
-- order was fulfilled before (nothing done).
DROP FUNCTION IF EXISTS payment_internal.fulfill_order(text, text);
CREATE OR REPLACE FUNCTION payment_internal.fulfill_order(
  p_order_id text, p_source text, p_base_subtotal boolean, p_referral boolean)
RETURNS boolean
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  o public.orders%ROWTYPE;
  v_items jsonb;
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_color text;
  v_size text;
  v_cfg jsonb;
  v_purchase numeric;
  v_commission numeric;
  v_base numeric;
  v_buyer uuid;
  v_referred_by text;
  v_referrer uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fulfill_order: order % not found', p_order_id;
  END IF;
  IF o.fulfilled_at IS NOT NULL THEN
    RETURN false;
  END IF;

  v_items := CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END;

  -- Lock the products in id order, so concurrent orders cannot deadlock here
  PERFORM 1 FROM public.products p
  WHERE p.id IN (SELECT payment_internal.item_product_id(e) FROM jsonb_array_elements(v_items) e)
  ORDER BY p.id FOR UPDATE;

  FOR v_item IN SELECT e FROM jsonb_array_elements(v_items) e LOOP
    v_pid := payment_internal.item_product_id(v_item);
    v_qty := payment_internal.json_int(v_item -> 'quantity');
    CONTINUE WHEN v_pid IS NULL OR v_qty IS NULL OR v_qty <= 0;
    v_color := lower(COALESCE(NULLIF(v_item ->> 'color', ''), NULLIF(v_item ->> 'selectedColor', '')));
    v_size := lower(COALESCE(NULLIF(v_item ->> 'size', ''), NULLIF(v_item ->> 'selectedSize', '')));

    UPDATE public.products p
    SET variants = (
      SELECT jsonb_agg(
               CASE WHEN jsonb_typeof(v) = 'object'
                         AND (lower(v ->> 'color') = v_color OR lower(v ->> 'color_ru') = v_color)
                         AND (lower(v ->> 'size') = v_size OR lower(v ->> 'size_ru') = v_size)
                    THEN jsonb_set(v, '{stock}', to_jsonb(GREATEST(0, COALESCE(payment_internal.json_int(v -> 'stock'), 0) - v_qty)))
                    ELSE v END
               ORDER BY ord)
      FROM jsonb_array_elements(p.variants) WITH ORDINALITY AS t(v, ord))
    WHERE p.id = v_pid AND v_color IS NOT NULL AND v_size IS NOT NULL
      AND jsonb_typeof(p.variants) = 'array' AND jsonb_array_length(p.variants) > 0;

    IF NOT FOUND THEN
      UPDATE public.products SET stock = GREATEST(0, COALESCE(stock, 0) - v_qty) WHERE id = v_pid;
    END IF;
  END LOOP;

  -- Bonuses
  SELECT bonus_config INTO v_cfg FROM public.app_settings WHERE id = 1;
  v_purchase := COALESCE(NULLIF(payment_internal.json_num(v_cfg -> 'purchaseBonus'), 0), 1);
  v_commission := COALESCE(NULLIF(payment_internal.json_num(v_cfg -> 'referralCommission'), 0), 3);
  v_base := CASE WHEN p_base_subtotal THEN COALESCE(NULLIF(o.subtotal, 0), o.total, 0) ELSE COALESCE(o.total, 0) END;

  IF o.user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_buyer := o.user_id::uuid;
    SELECT referred_by INTO v_referred_by FROM public.users WHERE id = v_buyer;
    IF FOUND THEN
      IF p_referral AND v_referred_by IS NOT NULL THEN
        SELECT CASE WHEN count(*) = 1 THEN min(id::text)::uuid END INTO v_referrer
        FROM public.users WHERE referral_code = v_referred_by;
      END IF;
      -- Lock buyer and referrer in id order
      PERFORM 1 FROM public.users WHERE id IN (v_buyer, v_referrer) ORDER BY id FOR UPDATE;

      UPDATE public.users
      SET bonus_points = COALESCE(bonus_points, 0) + payment_internal.js_round(v_base * v_purchase / 100),
          total_orders = COALESCE(total_orders, 0) + 1
      WHERE id = v_buyer;

      IF v_referrer IS NOT NULL THEN
        UPDATE public.users
        SET bonus_points = COALESCE(bonus_points, 0) + payment_internal.js_round(v_base * v_commission / 100),
            referrals = COALESCE(referrals, 0) + 1
        WHERE id = v_referrer;
      END IF;
    END IF;
  END IF;

  UPDATE public.orders SET fulfilled_at = now(), fulfilled_by = p_source WHERE id = o.id;
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------- Payme
-- CreateTransaction: bind a Payme transaction to the order, atomically.
-- result: created | existing | order_not_found | wrong_amount | order_unavailable
CREATE OR REPLACE FUNCTION public.payme_create_transaction(
  p_payme_order_id text, p_transaction_id text, p_time bigint, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  o public.orders%ROWTYPE;
  n integer;
BEGIN
  IF p_transaction_id IS NULL OR btrim(p_transaction_id) = '' OR p_payme_order_id IS NULL THEN
    RETURN jsonb_build_object('result', 'order_not_found');
  END IF;

  -- The transaction already exists (on this or another order)
  SELECT * INTO o FROM public.orders WHERE payme_transaction_id = p_transaction_id FOR UPDATE;
  IF FOUND THEN
    IF o.payme_order_id IS DISTINCT FROM p_payme_order_id THEN
      RETURN jsonb_build_object('result', 'order_unavailable', 'reason', 'transaction belongs to another order');
    END IF;
    RETURN jsonb_build_object('result', 'existing', 'state', COALESCE(o.payme_state, 1),
                              'create_time', COALESCE(o.payme_create_time, p_time));
  END IF;

  SELECT count(*) INTO n FROM public.orders WHERE payme_order_id = p_payme_order_id;
  IF n <> 1 THEN
    RETURN jsonb_build_object('result', 'order_not_found');
  END IF;
  SELECT * INTO o FROM public.orders WHERE payme_order_id = p_payme_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'order_not_found');
  END IF;

  -- A concurrent duplicate of this same request bound it while we waited
  IF o.payme_transaction_id = p_transaction_id THEN
    RETURN jsonb_build_object('result', 'existing', 'state', COALESCE(o.payme_state, 1),
                              'create_time', COALESCE(o.payme_create_time, p_time));
  END IF;

  IF p_amount IS NULL OR round(o.total * 100) IS DISTINCT FROM p_amount THEN
    RETURN jsonb_build_object('result', 'wrong_amount', 'expected', round(o.total * 100));
  END IF;

  -- Eligibility is decided here, under the lock — not in a separate request
  IF o.status IS DISTINCT FROM 'pending' OR o.fulfilled_at IS NOT NULL THEN
    RETURN jsonb_build_object('result', 'order_unavailable', 'reason', 'order is not pending');
  END IF;
  IF o.payme_transaction_id IS NOT NULL AND COALESCE(o.payme_state, 0) >= 1 THEN
    RETURN jsonb_build_object('result', 'order_unavailable', 'reason', 'another transaction is active');
  END IF;

  UPDATE public.orders
  SET payme_transaction_id = p_transaction_id, payme_create_time = p_time, payme_state = 1,
      payme_perform_time = NULL, payme_cancel_time = NULL, payme_cancel_reason = NULL
  WHERE id = o.id;
  RETURN jsonb_build_object('result', 'created', 'state', 1, 'create_time', p_time);
END;
$$;

-- PerformTransaction: mark paid and fulfil in one transaction.
-- result: performed (+ order snapshot for notifications) | already_performed |
--         transaction_not_found | cannot_perform | order_unavailable
CREATE OR REPLACE FUNCTION public.payme_perform_transaction(p_transaction_id text, p_time bigint)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE payme_transaction_id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'transaction_not_found');
  END IF;
  IF o.payme_state = 2 THEN
    RETURN jsonb_build_object('result', 'already_performed', 'perform_time', COALESCE(o.payme_perform_time, p_time));
  END IF;
  IF o.payme_state IS DISTINCT FROM 1 THEN
    RETURN jsonb_build_object('result', 'cannot_perform', 'state', o.payme_state);
  END IF;
  -- Paid another way meanwhile (Click, admin): never fulfil twice
  IF o.status IS DISTINCT FROM 'pending' OR o.fulfilled_at IS NOT NULL THEN
    RETURN jsonb_build_object('result', 'order_unavailable', 'status', o.status);
  END IF;

  UPDATE public.orders SET status = 'approved', payme_state = 2, payme_perform_time = p_time WHERE id = o.id;
  PERFORM payment_internal.fulfill_order(o.id, 'payme:' || p_transaction_id, true, true);
  RETURN jsonb_build_object('result', 'performed', 'perform_time', p_time, 'order', to_jsonb(o));
END;
$$;

-- ---------------------------------------------------------------- Click
-- Complete: approve (and fulfil) or reject a pending order, atomically.
-- p_trans_id must be the canonical id (src/lib/paymentIds.js).
-- result: completed (+ order) | rejected | already_processed | already_paid |
--         cancelled | order_not_found | unavailable
CREATE OR REPLACE FUNCTION public.click_complete_payment(
  p_click_order_id text, p_trans_id text, p_error integer, p_time bigint)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
DECLARE
  o public.orders%ROWTYPE;
  n integer;
  v_ok boolean := p_error IS NULL OR p_error >= 0;
BEGIN
  IF p_trans_id IS NULL OR p_trans_id !~ '^\d{1,20}$' OR p_click_order_id IS NULL THEN
    RETURN jsonb_build_object('result', 'order_not_found');
  END IF;
  SELECT count(*) INTO n FROM public.orders WHERE click_order_id = p_click_order_id;
  IF n <> 1 THEN
    RETURN jsonb_build_object('result', 'order_not_found');
  END IF;
  SELECT * INTO o FROM public.orders WHERE click_order_id = p_click_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'order_not_found');
  END IF;

  IF o.status = 'pending' AND o.click_trans_id IS NULL AND o.fulfilled_at IS NULL THEN
    IF v_ok THEN
      UPDATE public.orders
      SET status = 'approved', click_trans_id = p_trans_id, click_complete_time = p_time, click_error = NULL
      WHERE id = o.id;
      PERFORM payment_internal.fulfill_order(o.id, 'click:' || p_trans_id, false, false);
      RETURN jsonb_build_object('result', 'completed', 'order', to_jsonb(o));
    END IF;
    UPDATE public.orders
    SET status = 'rejected', click_trans_id = p_trans_id, click_complete_time = p_time, click_error = p_error
    WHERE id = o.id;
    RETURN jsonb_build_object('result', 'rejected');
  END IF;

  IF v_ok AND o.click_trans_id = p_trans_id AND o.status IN ('approved', 'shipped', 'delivered') THEN
    RETURN jsonb_build_object('result', 'already_processed');
  END IF;
  IF o.status IN ('approved', 'shipped', 'delivered') OR o.fulfilled_at IS NOT NULL THEN
    RETURN jsonb_build_object('result', 'already_paid');
  END IF;
  IF o.status IN ('rejected', 'cancelled') THEN
    RETURN jsonb_build_object('result', 'cancelled');
  END IF;
  RETURN jsonb_build_object('result', 'unavailable', 'status', o.status);
END;
$$;

-- ---------------------------------------------------------------- access
REVOKE ALL ON FUNCTION public.payme_create_transaction(text, text, bigint, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payme_perform_transaction(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.click_complete_payment(text, text, integer, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payme_create_transaction(text, text, bigint, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.payme_perform_transaction(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.click_complete_payment(text, text, integer, bigint) TO service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA payment_internal FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA payment_internal TO service_role;

COMMIT;

-- POST-CHECK (read-only):
--   SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
--          has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role
--   FROM pg_proc p WHERE p.proname IN ('payme_create_transaction', 'payme_perform_transaction', 'click_complete_payment');
--   -- expected: anon false, authenticated false, service_role true
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name LIKE 'fulfilled%';
