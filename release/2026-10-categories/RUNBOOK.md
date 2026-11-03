# Category + security release — runbook

Project `jbdzhwenzedlwbdpguyt` · deploy = push to `main` (GitHub Actions → Hetzner).
Run steps **in order**; stop at the first FAIL and use section 7. Steps marked **you** need credentials only you should enter. Nothing here has been executed against production.

**Order (fixed):**
- P. `add-payment-fulfillment.sql` — transactional payment functions (additive: two `orders` columns, two unique indexes, service-role-only functions). The deployed `13d61f7` ignores them; image A and the release **require** them (without them every payment webhook answers an error and changes nothing — verified locally).
- A. *deploy the rollback-compatible image* — `13d61f7` + `rollback-compat-webhooks.patch` only (service-role webhooks calling the P functions, Click id normalisation; the patch also carries the P migration file). This is the **rollback target** from here on; `sha-13d61f7` is not (anon-key webhooks, non-atomic fulfillment, R6-02).
1. `secure-admin-users.sql` — membership must be trustworthy before anything uses `is_admin()`
2. `add-category-integrity.sql`
3. `protect-referenced-storage-objects.sql`
4. `restrict-storage-writes-to-admins.sql` (refuses to run if step 1 is missing)
5. `secure-audit-logs.sql`
6. *deploy the release code* (category UI; same webhooks as A)
7. `secure-products.sql` — only after A is live (A's or the release's webhooks), otherwise paid orders stop deducting stock

**Rollback principle:** there is no rollback that removes protection. Code goes back to image A; database problems are fixed forward (section 7).

**Image A tested locally at every stage** (`local-staging/bootstrap.sh stage N`, production permissions reproduced):

| Database state | Image A payment webhooks | Image A admin calls | Release webhooks |
|---|---|---|---|
| before P | fail closed: Create/Perform −31008, order and stock untouched | — | — |
| P (window not started) | 30/30 | 6/6 | — |
| P + 1–5 | 30/30 | 6/6 | 30/30 |
| P + 1–5 + 7 | 30/30 | 6/6 | 30/30 |

Webhook checks: replays, concurrent duplicates, injected DB failures (also after the stock update), lost commit responses, different Payme transaction ids (sequential and concurrent), 6 different orders at once on the same product and buyer. Admin calls: own-membership read (login), category rename/hide/show with products staying linked, product update. Results: `local-staging/results/webhook-check-imageA-stage-*.json`, `old-admin-smoke-*.json`. Storefront and `/admin` 200 at every stage.

## 0. Before the window

0.1 Re-run `production-precheck.sql` (SQL Editor; read-only, rolls back) and compare with the 2026-10-25 results:

| Check | Expected |
|---|---|
| 2 migration state | nothing of this release applied yet |
| 3e audit_logs columns | `admin_id`, `admin_email`, `created_at` present |
| 4 / 4b / 5 | same as 2026-10-25 (RLS off on the 4 tables; full grants) — anything different: stop and re-review |
| 6c / 6e | the known `product_images_delete` / `product_images_update` `{public}` policies |
| 7 admins | `admin_rows_with_auth_user = 1` (or more), all real admins listed by count |
| 8e | **no rows** (no SECURITY DEFINER function writes `admin_users`) |
| 10 / 10b / 10c | no duplicates or rule violations; only the known orphan |
| 13a / 13b | every payment column present; 0 duplicate transaction / order ids |
| 13c / 13d | record them. `anon_select = false` means the deployed anon-key webhooks cannot read orders (reproduced locally) — check 13d for paid orders stuck in `pending` and tell the owner before the release; image A fixes the path |

0.2 **Code**: two PRs, CI build green on both:
- **PR A** (rollback-compatible): branch from `13d61f7`, `git apply release/2026-10-categories/rollback-compat-webhooks.patch` (changes only `app/api/payme-webhook/route.js`, `app/api/click-webhook/route.js` and — B8 checkout repair — `ordersAPI.create` in `src/services/api.js`; adds `src/lib/paymentIds.js` and `supabase-migrations/add-payment-fulfillment.sql`; checked with `git apply --check` on `13d61f7`). Nothing else.
- **Release PR** with exactly the agreed scope (blocker B3), based on PR A; **do not merge yet**.

0.3 **you** — server: confirm the service-role key is present in the running app container without printing it (image A and the release both need it; without it every payment webhook fails):
```bash
docker compose -f /opt/ailem/docker-compose.yml exec app sh -c 'test -n "$SUPABASE_SERVICE_ROLE_KEY" && echo present || echo MISSING'
cat /opt/ailem/.deploy.env     # current IMAGE_TAG (expected sha-13d61f7)
```

0.4 **Backup before P** — sections 1.2–1.4 (private dump + bucket copy + tested restore). P only adds objects, but it is a production schema change.

0.5 **Apply P** (SQL Editor, as postgres): `supabase-migrations/add-payment-fulfillment.sql`; it must end without error (it stops on a missing column or duplicate transaction ids — then do not continue). Run its POST-CHECK: the three functions `anon false / authenticated false / service_role true`. Probe (public anon key; must be refused, changes nothing):
```bash
curl -s -o /dev/null -w "payme_perform_transaction %{http_code} (expect 401)\n" -X POST "$URL/rest/v1/rpc/payme_perform_transaction" "${H[@]}" -d '{"p_transaction_id":"x","p_time":1}'
curl -s -o /dev/null -w "click_complete_payment %{http_code} (expect 401)\n" -X POST "$URL/rest/v1/rpc/click_complete_payment" "${H[@]}" -d '{"p_click_order_id":"x","p_trans_id":"1","p_error":null,"p_time":1}'
```
(`URL`, `ANON`, `H` as in 3.2.) The storefront and the deployed site keep working (13d61f7 does not use P).

0.6 **Deploy image A** (right after 0.5; can be days before the window): merge PR A → `gh run watch <id> --exit-status` → `cat /opt/ailem/.deploy.env` and **write down `IMAGE_TAG=sha-<A>` — the rollback target**. Watch `docker compose logs app` through the next real Payme payment: order approved, stock deducted once, and in SQL `SELECT status, payme_state, fulfilled_by FROM orders WHERE payme_order_id = '<id>'` → `approved / 2 / payme:<transaction>`. Do not continue while a payment webhook error is unexplained (7.2). Image A also carries the B8 checkout repair, so this first payment can be a real checkout: the order must appear as `pending` before Payme opens (needs explicit authorisation — it is a production write).

## 1. Backups (must be verified) and admin pause

1.1 Announce the window; every admin **saves and closes all `/admin` tabs**; confirm each one.

1.2 **you** — the database password of `ailem-production` (Postgres password, not the Supabase login). Type it only at a hidden prompt (`read -s`) in your own terminal; never paste it into chat, a file or a command line. It cannot be viewed in the Dashboard (only reset — a production credential change; avoid during the release).

1.3 Private backup **outside the repo** (contains customer data — never commit, upload or share). Production is only read. Tested 2026-11-03 (`~/ailem-backups/20261103-2355-pre-release`, 102 MB):
```bash
umask 077
B=~/ailem-backups/$(date +%Y%m%d-%H%M)-pre-release
mkdir -p "$B/work" && chmod 700 ~/ailem-backups "$B" && cd "$B/work"   # link state stays outside the repo
IFS= read -rs SUPABASE_DB_PASSWORD && export SUPABASE_DB_PASSWORD     # hidden prompt
supabase link --project-ref jbdzhwenzedlwbdpguyt
supabase db dump --linked -f "$B/schema.sql"
supabase db dump --linked --role-only -f "$B/roles.sql"
supabase db dump --linked --data-only --use-copy -s public,auth,storage -f "$B/data.sql"
supabase storage cp -r ss:///product-images "$B/product-images" --experimental --linked
unset SUPABASE_DB_PASSWORD; supabase unlink; cd "$B" && rm -rf work
```
Then the **two required supplements** (the dump alone does not restore production's access rules). Both are read-only single SELECTs returning one text cell — run each in the SQL Editor and save the cell, or with `psql -X -At -f … >` using the session-pooler URL (password at the prompt):
- `release/2026-10-categories/export-access-privileges.sql` → `$B/access-privileges.sql` — exact grants of every public table, sequence and function. Without it a restore into a fresh project **grants anon SELECT on `orders` and `users`** (pg_dump emits no REVOKEs relative to Supabase's default privileges), undoing the July PII fix.
- `release/2026-10-categories/export-storage-policies.sql` → `$B/storage-policies.sql` — the `storage.objects` policies (`product_images_delete/insert/select/update`). `supabase db dump` excludes the storage schema, so they are not in `schema.sql`.

Finally `find . -type f ! -name MANIFEST.sha256 -print0 | sort -z | xargs -0 shasum -a 256 > MANIFEST.sha256` and `chmod -R go-rwx "$B"`.

1.4 **Verify the backup is restorable** — the tested procedure (2026-11-04). Do not continue until every check passes.

*Disposable environment* (never `local-staging/`, never the repo):
- A new folder outside the repo with `supabase init`; own `project_id` (e.g. `ailem-restore-test`) and own ports (e.g. 566xx); `studio`, `inbucket`, `analytics`, `edge_runtime`, `realtime` disabled.
- **Auth/Storage versions ≥ production**, pinned before `supabase start` in `supabase/.temp/gotrue-version` and `supabase/.temp/storage-version`. Tested: **auth `v2.197.0`, storage `v1.84.25`** (postgres image `17.6.1.075`). Read production's current versions first (read-only): `GET <project-url>/auth/v1/health` → `version`, `GET <project-url>/storage/v1/version`. With the CLI defaults (auth v2.186.0, storage v1.35.3) the restore fails (`auth.custom_oauth_providers` does not exist).

*Restore order* — as the **superuser `supabase_admin`** (the `postgres` role gets `permission denied for table buckets_vectors`); every step must end without error:
```bash
DB=postgresql://supabase_admin:postgres@127.0.0.1:<db-port>/postgres   # local disposable stack only
psql "$DB" --single-transaction -v ON_ERROR_STOP=1 -f "$B/roles.sql" -f "$B/schema.sql" -c 'SET session_replication_role = replica' -f "$B/data.sql"
psql "$DB" -v ON_ERROR_STOP=1 -f "$B/access-privileges.sql"   # REQUIRED
psql "$DB" -v ON_ERROR_STOP=1 -f "$B/storage-policies.sql"    # REQUIRED
```
`session_replication_role = replica` keeps triggers from firing while data loads. Send restore output to a private file and print only error headlines: COPY errors can quote row content.

*Checks* (counts and checksums only — never print records):
- Row counts per table: restored = rows in `data.sql` for **every** table, and = live production (count-only requests). Tested: 48/48 tables, 1,032 rows; production `categories` 10, `products` 37, `orders` 163, `users` 164, `admin_users` 1, `auth.users` 2, `storage.objects` 170.
- Access rules = production: run `production-precheck.sql` (combined form) against the restored database — sections 4b policies, 5 grants, 6c/6d/6e storage, 8 functions, 13c (`anon_select = false`) equal production. (A policy may print `uid()` instead of `auth.uid()` when `auth` is on the session's search path — same function.)
- Storage: `shasum -a 256 -c MANIFEST.sha256` all OK; every file's size and MD5 equal `storage.objects.metadata` (`size`, `eTag`) of the restored rows; no missing or extra files. Tested: 170/170.
- No outbound effects: no application connected; no public function calls `net.http`/`http_request`/`dblink`; no `cron` schema.

*Teardown*: `supabase stop --no-backup` (deletes the volumes holding restored customer data) and delete the folder and any logs.

1.5 Re-run pre-check sections 2 and 12 right before step 2.

## 2. Apply migrations 1–5 (SQL Editor, as postgres, one sitting)

Run each file completely, in this order, and check it ends without error:
1. `supabase-migrations/secure-admin-users.sql`
2. `supabase-migrations/add-category-integrity.sql` (NOTICEs "does not exist, skipping" are normal)
3. `supabase-migrations/protect-referenced-storage-objects.sql`
4. `supabase-migrations/restrict-storage-writes-to-admins.sql`
5. `supabase-migrations/secure-audit-logs.sql`

Then run the POST-CHECK blocks at the end of each file.

## 3. Verify authorization and storage protection

3.1 SQL Editor → `verify-after-migration.sql` (simulated anon / signed-in non-admin / admin requests; always rolled back; deletes no files). Expected: every row `PASS`, except `s_user_product` / `s_anon_product` = `PENDING` until step 5. Any `FAIL`/`WARN` → section 7.

3.2 Data API probes (public anon key; writes target a non-existent id, so nothing can change even if a check failed):
```bash
URL=https://jbdzhwenzedlwbdpguyt.supabase.co; ANON=<public anon key>
H=(-H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json")
curl -s -o /dev/null -w "categories PATCH %{http_code} (expect 401)\n" -X PATCH "$URL/rest/v1/categories?id=eq.00000000-0000-0000-0000-000000000000" "${H[@]}" -d '{"name":"x"}'
curl -s -o /dev/null -w "admin_users GET %{http_code} (expect 401)\n" "$URL/rest/v1/admin_users?select=user_id" "${H[@]}"
curl -s -o /dev/null -w "admin_users POST %{http_code} (expect 401)\n" -X POST "$URL/rest/v1/admin_users" "${H[@]}" -d '{"user_id":"00000000-0000-0000-0000-000000000000"}'
curl -s -o /dev/null -w "audit_logs GET %{http_code} (expect 401)\n" "$URL/rest/v1/audit_logs?select=id" "${H[@]}"
for f in category_finish_write category_claim_write storage_path_reference_status storage_object_deletable; do
  curl -s -X POST "$URL/rest/v1/rpc/$f" "${H[@]}" -d '{}' | grep -o '"code":"[^"]*"'   # expect PGRST202
done
curl -s "$URL/rest/v1/categories?select=id&limit=1" -H "apikey: $ANON" -H "Accept-Profile: category_internal" | grep -o '"code":"[^"]*"'   # expect PGRST106
```

3.3 Currently deployed site (image A) still works: storefront loads categories/products; an admin can still sign in (it reads its own `admin_users` row).

## 4. Deploy the tested code

4.1 Merge the release PR into `main`.
4.2 `gh run list --workflow=deploy.yml --limit 1` → `gh run watch <id> --exit-status`.
4.3 Server: `cat /opt/ailem/.deploy.env` shows the release sha; `docker compose ... ps` healthy.

## 5. Lock down products (after the deploy)

5.1 SQL Editor → `supabase-migrations/secure-products.sql`.
5.2 Re-run `verify-after-migration.sql`: now **every** row `PASS` (no `PENDING`).
5.3 Probe: `curl -s -o /dev/null -w "%{http_code}\n" -X PATCH "$URL/rest/v1/products?id=eq.00000000-0000-0000-0000-000000000000" "${H[@]}" -d '{"price":1}'` → 401. Storefront still lists products.

## 6. Reload admin tabs and smoke checks

6.1 Every admin opens `/admin` fresh (hard reload) and signs in.
6.2 Storefront (logged out): categories in stored order, hidden ones absent, products visible.
6.3 Admin → Kategoriyalar with a temporary `ZZ Release test` category: add with upload → rename → move up/down → hide/show → try deleting **Choyshab** (refused, 16 products) → delete the test category (its image disappears) → dirty-form navigation asks.
6.4 Admin → Mahsulotlar: edit a product's price and revert it; hide/show a product.
6.5 Admin → Audit logs shows the category entries with the correct admin e-mail and current times.
6.6 Payments: the next real Payme payment deducts stock (check the order's products). If unsure, watch `docker compose logs -f app` for webhook errors.
6.7 Tell admins they may resume.

## 7. Rollback and fix-forward

Code is rolled back; **database protections are never rolled back**. None of the following is a recovery step — each re-opens a confirmed production hole:
- disabling RLS on `admin_users`, `products`, `categories` or `audit_logs`, or granting anon/authenticated writes on them (admin self-promotion, price/stock tampering);
- dropping `product_images_update_admins_only` / `product_images_delete_admins_only` (anyone deletes or overwrites images);
- dropping the `audit_logs_stamp` trigger (forged or back-dated audit entries).

Image A works with every migration in this release (tested locally, see the top), so no database step is needed to roll the code back.

7.1 **Code** (UI or release problem): on the server, back to image A (never `sha-13d61f7`):
```bash
cd /opt/ailem && sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-<A from 0.4>/' .deploy.env
docker compose --env-file .deploy.env pull app && docker compose --env-file .deploy.env up -d
```
then revert the release merge on `main` (keep PR A's commit). Admins hard-reload `/admin`. With the category migrations applied, image A's old category UI still works (verified locally: sign-in and category rename; products keep their category).

7.2 **Payment webhooks answer errors** (Payme −31008 / Click −7 for every payment): the database transaction did nothing, so there is no half-done order to repair — the order stays payable and the provider retries or cancels. Check in this order: (a) 0.3 service-role key (if `MISSING`, add `SUPABASE_SERVICE_ROLE_KEY` to `/opt/ailem/.env` and `docker compose up -d app`); (b) `verify-after-migration.sql` rows `payment functions` / `payment internals` / `payment binding` (P applied?); (c) `docker compose logs app` for `payme_perform_transaction failed` / `click_complete_payment failed` and the Postgres error. Fix forward (`CREATE OR REPLACE` the function). Never go back to anon-key webhooks or re-open `products`/`orders` to anon. A payment refused with −31051 is by design (order already paid, not pending, or another Payme transaction active).

7.3 **Another product writer was missed** (an admin screen or a server job gets 401/403 on products): fix forward — an admin screen must run with the admin's session (`is_admin()` allows it); a server job must use `createServerSupabaseClient()` (service role). Until it ships, an admin does the change by hand in Mahsulotlar. Customers' storefront reads are unaffected (SELECT stays public).

7.4 **Audit logging fails or stamps wrong values**: keep the trigger; check the admin is in `admin_users` and that `audit_logs` still has `admin_id`, `admin_email`, `created_at`; correct the function with `CREATE OR REPLACE FUNCTION public.audit_logs_stamp()` (the stamped e-mail must come from `auth.users`, never from the request or JWT claims). A failed audit insert does not block the admin action it describes.

7.5 **An admin cannot delete/replace an image they should**: check that they have an `admin_users` row for their `auth.users` id (that is what `public.is_admin()` reads). Referenced images are refused by design (`storage_path_reference_status`); service_role (dashboard) can still remove a file in an emergency.

7.6a **Payment objects** (P): not part of a rollback — image A and the release both need them; dropping them stops every online payment. A wrong result is fixed with `CREATE OR REPLACE`. Notifications (Telegram) are sent only after the database commit; if a response was lost, the retry is answered from the stored state and the notification for that order may be missing — tell the admin, nothing in the database needs repair.

7.6 **Category objects**: not part of a rollback — image A and the release both work with them. The DROP lists in the headers of `add-category-integrity.sql` / `protect-referenced-storage-objects.sql` are an uninstall reference only, and the category policies are never restored to `USING (true)`.

7.7 **Admin login broken** after step 2.1: fix the SELECT policy, e.g. `CREATE POLICY admin_users_select_own ON public.admin_users FOR SELECT TO authenticated USING (auth.uid() = user_id);` — do not re-grant writes.

7.8 **Full restore** (last resort, loses later writes): from the step 1.3 backup, in the order proven in 1.4 — `roles.sql` → `schema.sql` → `SET session_replication_role = replica` → `data.sql` → **`access-privileges.sql`** → **`storage-policies.sql`** — into a fresh project whose auth/storage versions are ≥ the backup's (see 1.4), then re-upload `product-images/`. Skipping `access-privileges.sql` re-opens anon reads of `orders`/`users`; skipping `storage-policies.sql` leaves the bucket without policies. Only the local restore as `supabase_admin` is tested: a hosted project's `postgres` role cannot write the newer storage tables (`buckets_vectors`, `buckets_analytics`, `vector_indexes`, `s3_multipart_*` — all empty in the 2026-11-03 backup), so rehearse a hosted restore in a scratch project before relying on it. Restoring the pre-release dump also restores the pre-release permissions — re-apply P (if the dump predates it), migrations 1–5 and 7 immediately after, before re-opening the site.

### Limitations

- Old admin tabs cannot be forced to reload; they keep old code (bounded by the new server rules).
- Image files deleted by the new cleanup (only unreferenced, after the reference check) are recoverable only from the 1.3 copy.
- PITR is off: restores are only as recent as the 1.3 dump.
- Tables outside this release (users, orders, reviews, settings, support, …) keep their current permissions — see READINESS "Tracked existing exposures".
