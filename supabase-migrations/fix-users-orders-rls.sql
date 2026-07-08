-- ============================================================
-- Fix PII exposure on public.users and public.orders
-- Applied to production (project jbdzhwenzedlwbdpguyt) on 2026-07-08.
-- Idempotent — safe to re-run in the Supabase SQL Editor.
-- ============================================================
--
-- REPORTED BREACH
--   A logged-out visitor could `GET /rest/v1/users?select=*` and
--   `GET /rest/v1/orders?select=*` with the public anon key and receive ALL
--   rows — every customer's telegram_id, name, phone, referral_code, cart, and
--   all orders.
--
-- ACTUAL ROOT CAUSE (differed from the original report)
--   RLS is DISABLED on public.users and public.orders (relrowsecurity = false),
--   and the `anon` role holds a direct table-level SELECT grant. So access is
--   governed purely by GRANTs, and RLS policies are inert. (The "permissive
--   USING(true) policies" in the report were a red herring — a `FOR ALL TO public`
--   policy existed, but with RLS off no policy is enforced at all.)
--
-- WHY NOT auth.uid() RLS
--   Customers have NO Supabase Auth session (Telegram login is server-side; the
--   browser holds only the anon key), so auth.uid() is NULL for them and a
--   self-scoped policy can't work. Only admins get the `authenticated` role.
--
-- THE FIX (two parts)
--   1. REVOKE SELECT on users/orders FROM anon  -> closes anon reads immediately
--      (works regardless of RLS state).
--   2. SECURITY DEFINER RPCs for the narrow own-data reads the customer app
--      needs (they run as owner, so they keep working after the revoke and can
--      only ever return the caller's own row(s), keyed by an id the caller holds).
--   Admins keep reading via the `authenticated` role's SELECT grant; the
--   service role bypasses everything.
--
-- DEPLOY ORDERING (important)
--   The client must call the RPCs BEFORE anon SELECT is revoked, or live customer
--   reads (cart, order history, payment-status polling) break. Sequence used:
--   deploy RPC-based client to Hetzner -> verify -> then run the REVOKE below.
--
-- SCOPE / FOLLOW-UPS (intentionally NOT done here)
--   * Writes stay open: anon still has INSERT/UPDATE grants (customer
--     cart/bonus/favorites/order-create rely on them). Tightening needs the same
--     server-side-identity work.
--   * Defense-in-depth: enabling RLS with a COMPLETE admin policy set (admins
--     write via the authenticated role, not the service role, so admin
--     UPDATE/DELETE on other users' rows needs policies) is the recommended next
--     step. The admin-only SELECT policies + is_admin() below are already in place
--     for that future switch, but are currently INERT because RLS is off.
--   * Residual: get_user_self returns a row to anyone presenting that user's UUID
--     (capability model); already-leaked UUIDs stay re-fetchable until the
--     server-side Telegram-verified read routes land.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- PART 1 — THE OPERATIVE FIX: revoke anon's direct read access.
-- ------------------------------------------------------------
REVOKE SELECT ON public.users  FROM anon;
REVOKE SELECT ON public.orders FROM anon;

-- ------------------------------------------------------------
-- PART 2 — Own-data RPCs (SECURITY DEFINER: run as owner, bypass grants/RLS, but
-- each returns only the caller's own row(s), keyed by an id the caller holds).
-- Column-type note: orders.user_id and orders.id are TEXT; orders.cashier_id and
-- users.id are UUID.
-- ------------------------------------------------------------

-- A customer's own user row (session restore: cart, bonus, favorites, role, referral).
CREATE OR REPLACE FUNCTION public.get_user_self(p_user_id uuid)
RETURNS SETOF public.users
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT * FROM public.users WHERE id = p_user_id; $$;

-- A logged-in customer's own orders (order history). orders.user_id is TEXT.
CREATE OR REPLACE FUNCTION public.get_user_orders(p_user_id text)
RETURNS SETOF public.orders
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT * FROM public.orders WHERE user_id = p_user_id ORDER BY created_at DESC; $$;

-- A single order by ref (order_number or id) — payment-status polling; works for guests.
CREATE OR REPLACE FUNCTION public.get_order_by_ref(p_ref text)
RETURNS SETOF public.orders
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT * FROM public.orders WHERE order_number = p_ref OR id::text = p_ref LIMIT 1; $$;

-- A cashier's own POS orders (CashierMode today's-sales filters client-side). cashier_id is UUID.
CREATE OR REPLACE FUNCTION public.get_cashier_orders(p_cashier_id uuid)
RETURNS SETOF public.orders
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT * FROM public.orders WHERE cashier_id = p_cashier_id ORDER BY created_at DESC; $$;

REVOKE ALL ON FUNCTION public.get_user_self(uuid)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_orders(text)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_by_ref(text)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_cashier_orders(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_self(uuid)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_orders(text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_ref(text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cashier_orders(uuid) TO anon, authenticated;

-- ------------------------------------------------------------
-- PART 3 — Future-proofing for when RLS is enabled (currently INERT: RLS is off).
-- is_admin() + admin-only SELECT policies. These do nothing until someone runs
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY (see follow-up note above).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

DROP POLICY IF EXISTS "Users selectable by admins only" ON public.users;
CREATE POLICY "Users selectable by admins only" ON public.users
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Orders selectable by admins only" ON public.orders;
CREATE POLICY "Orders selectable by admins only" ON public.orders
  FOR SELECT TO authenticated USING (public.is_admin());

COMMIT;

-- ============================================================
-- VERIFICATION (run after COMMIT)
-- ============================================================
-- As anon, direct reads must now be denied (this is the breach-closed proof):
--   curl "$URL/rest/v1/users?select=*"  -H "apikey: $ANON"  ->  401 permission denied
--   curl "$URL/rest/v1/orders?select=*" -H "apikey: $ANON"  ->  401 permission denied
-- The own-data RPCs must still work (200):
--   curl -X POST "$URL/rest/v1/rpc/get_user_self"  -d '{"p_user_id":"<uuid>"}'
--   curl -X POST "$URL/rest/v1/rpc/get_user_orders" -d '{"p_user_id":"<uuid>"}'
-- Order creation (checkout) must still work as anon:
--   curl -X POST "$URL/rest/v1/orders" -d '{...}'  ->  201
