-- ============================================================
-- Fix PII exposure on public.users and public.orders (RLS)
-- Run this in the Supabase SQL Editor (project jbdzhwenzedlwbdpguyt).
-- ============================================================
--
-- PROBLEM
--   The old SELECT policies on `users` and `orders` were `USING (true)`, so the
--   `anon` role (every website visitor — the browser only ever holds the public
--   anon key) could `SELECT *` and download all user rows (telegram_id, name,
--   phone, referral_code, cart) and all orders. This is a live PII breach.
--
-- WHY WE CAN'T USE `auth.uid() = id`
--   Customers do NOT have a Supabase Auth session. They log in via the Telegram
--   Login Widget (server-side /api/auth/telegram-login) and then talk to Supabase
--   with the anon key only — so `auth.uid()` is NULL for every customer and a
--   self-scoped RLS policy would return zero rows for them. Only ADMINS have a
--   real Supabase Auth session (AdminAuth `signInWithPassword`), i.e. the
--   `authenticated` role.
--
-- APPROACH
--   1. Restrict SELECT on users/orders to admins only (authenticated + in
--      admin_users). The service_role used by API routes bypasses RLS. `anon`
--      gets NO select policy => denied (can no longer dump these tables).
--   2. Give customers narrow, own-data-only reads through SECURITY DEFINER RPCs
--      keyed by an id the caller already possesses (their own user UUID, their
--      own order ref). These cannot enumerate or bulk-read.
--
-- SCOPE (per decision)
--   This pass fixes the reported SELECT/PII breach only. The INSERT/UPDATE
--   policies on users/orders are still `WITH CHECK (true)` / `USING (true)` and
--   are intentionally left unchanged, because customer cart/bonus/favorites/order
--   writes currently go through the anon key. Tightening writes needs the same
--   server-side-identity work and would break those flows — tracked as follow-up.
--
-- RESIDUAL RISK (documented)
--   The get_user_self RPC returns a full user row to anyone who presents that
--   user's UUID (a capability model). Because the earlier breach may have already
--   leaked existing UUIDs, an attacker holding a leaked UUID could still re-fetch
--   that one row. New users (post-fix) are safe, and enumeration/bulk-dump is
--   fully closed. The complete fix is server-side Telegram-verified read routes
--   (deferred follow-up).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. Admin check helper. auth.uid() reflects the CALLER's JWT even inside a
--    SECURITY DEFINER function, so this correctly answers "is the caller an admin".
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ------------------------------------------------------------
-- 1. USERS — drop permissive SELECT, add admin-only SELECT.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users; -- defensive (name may differ across envs)

CREATE POLICY "Users selectable by admins only" ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 2. ORDERS — drop permissive SELECT, add admin-only SELECT.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON public.orders;

CREATE POLICY "Orders selectable by admins only" ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 3. Customer own-data RPCs (SECURITY DEFINER — run as owner, bypass RLS, but
--    each returns only the caller's own row(s), keyed by an id they already hold).
-- ------------------------------------------------------------

-- 3a. A customer's own user row (session restore: cart, bonus, favorites, role, referral).
CREATE OR REPLACE FUNCTION public.get_user_self(p_user_id uuid)
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.users WHERE id = p_user_id;
$$;

-- 3b. A logged-in customer's own orders (order history page).
-- NOTE: orders.user_id is TEXT (holds users.id UUIDs for logged-in users and
-- "guest-..." strings for guests), so this param is text, not uuid.
CREATE OR REPLACE FUNCTION public.get_user_orders(p_user_id text)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.orders
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
$$;

-- 3c. A single order by human ref (order_number) or UUID — payment-status polling.
--     Works for guest checkouts too (caller holds their own order ref).
CREATE OR REPLACE FUNCTION public.get_order_by_ref(p_ref text)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.orders
  WHERE order_number = p_ref
     OR id::text = p_ref
  LIMIT 1;
$$;

-- 3d. A cashier's own POS orders (CashierMode "today's sales" filters client-side).
CREATE OR REPLACE FUNCTION public.get_cashier_orders(p_cashier_id uuid)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.orders
  WHERE cashier_id = p_cashier_id
  ORDER BY created_at DESC;
$$;

-- Lock the RPCs down to the client roles that need them.
REVOKE ALL ON FUNCTION public.get_user_self(uuid)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_orders(text)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_by_ref(text)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_cashier_orders(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_self(uuid)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_orders(text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_ref(text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cashier_orders(uuid) TO anon, authenticated;

COMMIT;

-- ============================================================
-- VERIFICATION (run individually after COMMIT)
-- ============================================================
-- Policies now present:
--   SELECT policyname, cmd, roles FROM pg_policies
--   WHERE schemaname='public' AND tablename IN ('users','orders') ORDER BY tablename, cmd;
--
-- As the anon role, these must return 0 rows / permission denied (NOT all rows):
--   SET ROLE anon;
--   SELECT count(*) FROM public.users;   -- expect 0 rows visible
--   SELECT count(*) FROM public.orders;  -- expect 0 rows visible
--   RESET ROLE;
--
-- The own-data RPCs still work (replace the UUID with a real one):
--   SELECT id, name, phone FROM public.get_user_self('00000000-0000-0000-0000-000000000000');
--   SELECT count(*) FROM public.get_user_orders('00000000-0000-0000-0000-000000000000');
