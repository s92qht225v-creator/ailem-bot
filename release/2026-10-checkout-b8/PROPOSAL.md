# B8 — checkout cannot create orders: repair proposal

25 October 2026 · status: **minimum fix implemented locally and verified** (see the last section). Not committed or deployed. Separate from the Categories release (frozen).

## Problem

Since the July PII fix (`fix-users-orders-rls.sql`) anon has no SELECT on `public.orders`. Checkout still creates the order as anon with `insert([dbOrder]).select().single()`. The `.select()` asks PostgREST for the inserted row back (`Prefer: return=representation`), which needs SELECT, so the whole insert fails with 42501. No order is written, `PaymentPage` shows an error, and Payme is never opened.

Evidence, kept apart:
- **Local reproduction** (production permissions, synthetic data): `return=representation` → 401 42501, no row; same insert with `return=minimal` → 201, row created.
- **Production, read-only:** anon SELECT on `orders` is refused (401 42501); no order of any kind since 2026-04-08. Production was not written to, so checkout failure there is inferred, not observed.

## Affected code

| Location | Role |
|---|---|
| `src/services/api.js` → `ordersAPI.create` | the failing `insert(...).select().single()`; maps the returned row with `_mapOrderFromDB` |
| `src/context/AdminContext.jsx` → `addOrder` | calls `create`, prepends the result to the local `orders` state |
| `src/components/pages/PaymentPage.jsx` → `handlePaymePayment` | only caller on the customer path; ignores the return value (it already holds `orderId` / `paymeOrderId`) |
| `src/components/cashier/CashierMode.jsx` | second caller; **not mounted** in the Next.js app |

Not affected (already use SECURITY DEFINER RPCs): status polling (`getSelfByRef` → `get_order_by_ref`), order history (`get_user_orders`). Webhooks: fixed separately by P + image A.

## Minimum fix

One function, client only, no database change:

1. In `ordersAPI.create`, drop `.select().single()`: `const { error } = await supabase.from('orders').insert([dbOrder]);` (supabase-js v2 then sends `return=minimal`).
2. Return `this._mapOrderFromDB({ ...dbOrder, created_at: new Date().toISOString() })`. The client already generates every key (`id` uuid, `order_number`, `payme_order_id`), so nothing from the server response is needed.

No other file changes. `AdminContext.addOrder` and `PaymentPage` keep their behaviour.

**Ship with image A, not after it.** Put this change in PR A, or in its own PR merged before PR A, so the rollback target has a working checkout as well as working webhooks. A checkout fix that exists only in the release would disappear on rollback.

## Security requirements

Must hold for the fix:

1. **No anonymous SELECT on `orders`**, and no new grants or policies. The fix uses only the existing anon INSERT path that the July migration kept deliberately ("checkout must still work as anon → 201").
2. **No read-back of order rows by anon**: the response carries no row; the client builds its copy from what it sent.
3. **No new RPC, schema or exposed function.**
4. **Payment integrity stays on the server side of P:** `payme_create_transaction` / `click_complete_payment` still check amount, status and binding under the order lock; the client-supplied status remains irrelevant to fulfilment (P only fulfils `pending` orders once).

Existing exposures, **not changed and not worsened** by the minimum fix (owner decision, separate work):
- Anon INSERT policy is `WITH CHECK (true)`: anyone can insert orders with any `status`, `total` or provider fields. Hardening option: a SECURITY DEFINER `create_checkout_order` RPC that forces `status='pending'`, drops server-owned fields (`payme_transaction_id`, `payme_state`, `click_trans_id`, `fulfilled_*`, cashier fields), then revoke anon INSERT on `orders`.
- **Client-computed totals:** `total` and item prices come from the browser, and Payme is charged that amount. A server-side price check (products, variants, volume pricing, delivery fee) is the real fix for underpayment fraud.
- Anon UPDATE grant on `orders` (no WHERE-column SELECT, but unfiltered updates are possible).
- `get_order_by_ref` returns a full order (name, phone, address) to anyone holding an order number; numbers are `ORD-<milliseconds>-<0..999>`.

## Local verification plan

On local staging (`local-staging/`, production permissions, synthetic data). Nothing touches production.

1. **Unit (vitest):** `ordersAPI.create` sends an insert without `.select()` and returns the mapped order built from the payload; an insert error is still thrown. Mutation: restoring `.select()` must fail the test.
2. **API (`api-checks.sh`, new cases):**
   - anon `POST orders` with `return=minimal` → 201;
   - with `return=representation` → 401 (unchanged);
   - anon `GET orders` → 401 (unchanged);
   - `has_table_privilege('anon','public.orders','SELECT')` = false.
3. **Browser (`run-app.sh`, outbound guard on):** cart → checkout → PaymentPage. The order is created `pending` (checked via `q.sh`), the Payme link is generated with the right amount, and `/payment/status` polls through `get_order_by_ref`.
4. **End to end with P:** the same order is completed through the real Payme webhook (`webhook-check.sh` pattern); the status page shows success, the cart is cleared, and stock and bonus change once.
5. **Image A build:** apply the change to the image A tree and repeat steps 3–4 at RUNBOOK stages P and P + 1–5 + 7.
6. **Regression:** `npm test`, `npm run test:db`, `api-checks.sh`, `webhook-check.sh` 30/30, `npm run build`, `git diff --check`.

**Production verification** after deploy needs one real test order (a write), so it requires explicit authorisation.

## Implementation and results (local, 2026-10-25)

**Change.** `ordersAPI.create` in `src/services/api.js` now calls `insert([dbOrder])` without `.select()`. On success it returns `_mapOrderFromDB({ ...dbOrder, created_at })`; on error it throws the same error. It returns only after the insert resolved. Client-generated keys (`id`, `order_number`, `payme_order_id`) and all mapped fields are kept. No grant, policy, pricing, status-polling or other checkout change. The identical change is in image A (`rollback-compat-webhooks.patch`, which now also touches `src/services/api.js`; it applies cleanly to `13d61f7`).

**Results**

| Check | Result |
|---|---|
| Unit `src/tests/ordersCreate.test.js` | 4/4 on the release code and on image A's `api.js`: no read-back, keys and fields returned, resolves only after the insert, failure propagated. Mutation (`.select()` restored) fails it |
| API checks (anon, local staging) | insert without read-back → 201, order stored; insert asking for the row → 401 42501, nothing stored; anon GET orders → 401 (SELECT still revoked). Suite 93/93 |
| Browser checkout → Payme → status page | release code (stage P + 1–5 + 7) and image A (stages P and P + 1–5 + 7): order stored `pending` with the right total and buyer; Payme link built with the right amount and order id (navigation to Payme intercepted, nothing left the machine); Check/Create/Perform through the real webhook → approved, stock −1, bonus +3000, replay without effect; status page detected approval, cart and pending payment cleared |
| Failure path in the browser | insert failure (local schema drift on the release; injected trigger on image A): alert shown, no redirect, no pending payment, cart kept, no order row |
| Regressions | client 189/189, `test:db` all pass, webhook checks 30/30, image A stage checks 30/30 webhooks + 6/6 admin at stages P, P + 1–5, P + 1–5 + 7, `verify-after-migration.sql` 0 FAIL, build, `git diff --check` |

**Local staging drift found and fixed (local only).** Production `orders` has `walk_in_customer_id` (uuid), `walk_in_customer_name`, `walk_in_customer_phone` (read from production API metadata; all 25 columns checkout sends exist there), but no repo migration creates them. `local-staging/sql/25-compat-orders-walk-in-columns.sql` adds them to the local base schema. Nothing in production changed.

**Still open:** production confirmation needs one real checkout after image A (a production write; needs authorisation). The security risks listed above remain tracked separately and unchanged.
