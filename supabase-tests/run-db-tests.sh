#!/usr/bin/env bash
# Database tests for the category migration, in a DISPOSABLE local Postgres.
# Creates a throwaway cluster in a temp dir, applies the Supabase shim and a
# representative pre-migration schema, applies the migration twice, runs the
# assertions, then stops the server and deletes the cluster.
# Never connects to Supabase or any remote database.
#
# Usage: npm run test:db      (or: bash supabase-tests/run-db-tests.sh)
# Env:   PG_BIN  directory with initdb/pg_ctl/psql (default: auto-detect PG 15)
#        PGPORT_TEST  port for the temporary server (default 54329)
set -euo pipefail
# Postgres on macOS refuses to start without a valid locale
export LC_ALL="${LC_ALL:-C}" LANG="${LANG:-C}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TESTS="$ROOT/supabase-tests"
# MIGRATION_DIR lets the suite run against a modified copy (mutation checks)
MIGRATIONS="${MIGRATION_DIR:-$ROOT/supabase-migrations}"

if [[ -z "${PG_BIN:-}" ]]; then
  for c in /opt/homebrew/opt/postgresql@15/bin /usr/local/opt/postgresql@15/bin /usr/lib/postgresql/15/bin; do
    [[ -x "$c/initdb" ]] && PG_BIN="$c" && break
  done
fi
[[ -x "${PG_BIN:-}/initdb" ]] || { echo "PostgreSQL binaries not found; set PG_BIN" >&2; exit 2; }

PORT="${PGPORT_TEST:-54329}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ailem-dbtest.XXXXXX")"
DATA="$WORK/data"

cleanup() {
  "$PG_BIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$DATA" -A trust -E UTF8 --no-locale >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/server.log" -w start >/dev/null

PSQL=("$PG_BIN/psql" -h "$WORK" -p "$PORT" -d postgres -X -q -v ON_ERROR_STOP=1)

echo "== Setting up shim + baseline schema (PostgreSQL $("$PG_BIN/postgres" --version | awk '{print $3}'))"
"${PSQL[@]}" -f "$TESTS/fixtures/00-supabase-shim.sql"
"${PSQL[@]}" -f "$TESTS/fixtures/10-baseline-schema.sql"

echo "== BEFORE: confirming the production-equivalent exposures"
"${PSQL[@]}" -f "$TESTS/production-baseline.before.sql" 2>&1 | sed -e 's/^psql:[^ ]* NOTICE:  //'

# Release order (RUNBOOK.md). secure-products.sql runs after the code deploy
# in production; here the code change is irrelevant, so it runs with the rest.
RELEASE_ORDER=(
  add-payment-fulfillment.sql
  secure-admin-users.sql
  add-category-integrity.sql
  protect-referenced-storage-objects.sql
  restrict-storage-writes-to-admins.sql
  secure-audit-logs.sql
  secure-products.sql
)
for pass in 1 2; do
  echo "== Applying release migrations (pass $pass$([[ $pass == 2 ]] && echo ', idempotency'))"
  for f in "${RELEASE_ORDER[@]}"; do "${PSQL[@]}" -f "$MIGRATIONS/$f" >/dev/null; done
done

echo "== Running assertions"
"${PSQL[@]}" -v migration_dir="$MIGRATIONS" -f "$TESTS/category-integrity.test.sql" 2>&1 \
  | sed -e 's/^psql:[^ ]* NOTICE:  //'
"${PSQL[@]}" -f "$TESTS/payment-fulfillment.test.sql" 2>&1 \
  | sed -e 's/^psql:[^ ]* NOTICE:  //'

# ---------------------------------------------------------------------------
# Concurrency (V2-01): a save still in flight in another connection.
# Connection A opens a transaction, saves a category through
# admin_save_category, sleeps, then commits or rolls back. Connection B shows
# that the reference check cannot see the pending reference, and that
# resolve_category_write WAITS for A and reports the real outcome.
# ---------------------------------------------------------------------------
ADMIN_CLAIMS='{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}'
AS_ADMIN="SELECT set_config('request.jwt.claims', '$ADMIN_CLAIMS', false); SET ROLE authenticated;"
OWN_URL='https://proj.supabase.co/storage/v1/object/public/product-images/'
q() { "${PSQL[@]}" -At -c "$AS_ADMIN" -c "$1" | tail -n 1; }
fail() { echo "FAIL: $1" >&2; exit 1; }
pass() { echo "PASS: $1"; }

pending_save() { # $1 op id, $2 name, $3 image path, $4 COMMIT|ROLLBACK
  "${PSQL[@]}" -At >/dev/null <<SQL
$AS_ADMIN
BEGIN;
SELECT id FROM admin_save_category('$1', NULL, '$2', '$OWN_URL$3');
SELECT pg_sleep(3);
$4;
SQL
}

echo "== Concurrency: pending save, then COMMIT"
OP1='00000000-0000-0000-0000-0000000b0001'
pending_save "$OP1" 'Pending commit' 'categories/pending-commit.svg' COMMIT &
A_PID=$!
sleep 1
status=$(q "SELECT storage_reference_status('${OWN_URL}categories/pending-commit.svg') ->> 'status'")
[[ "$status" == "unreferenced" ]] || fail "expected the pending reference to be invisible, got $status"
pass "reference check cannot see the in-flight save (why the client must hold the image)"
start=$(date +%s)
outcome=$(q "SELECT resolve_category_write('$OP1')")
waited=$(( $(date +%s) - start ))
wait "$A_PID"
[[ "$outcome" == "committed" ]] || fail "expected committed, got $outcome"
(( waited >= 1 )) || fail "resolve returned after ${waited}s; it should have waited for the open transaction"
pass "resolve_category_write waited ${waited}s for the open transaction and reported committed"
status=$(q "SELECT storage_reference_status('${OWN_URL}categories/pending-commit.svg') ->> 'status'")
[[ "$status" == "referenced" ]] || fail "expected referenced after commit, got $status"
pass "after commit the image is referenced"

echo "== Concurrency: pending save, then ROLLBACK"
OP2='00000000-0000-0000-0000-0000000b0002'
pending_save "$OP2" 'Pending rollback' 'categories/pending-rollback.svg' ROLLBACK &
A_PID=$!
sleep 1
start=$(date +%s)
outcome=$(q "SELECT resolve_category_write('$OP2')")
waited=$(( $(date +%s) - start ))
wait "$A_PID"
[[ "$outcome" == "aborted" ]] || fail "expected aborted, got $outcome"
(( waited >= 1 )) || fail "resolve returned after ${waited}s; it should have waited"
pass "resolve_category_write waited ${waited}s and reported aborted"
exists=$(q "SELECT count(*) FROM categories WHERE name = 'Pending rollback'")
[[ "$exists" == "0" ]] || fail "rolled-back category exists"
pass "rolled-back save left no category"

echo "ALL CONCURRENCY TESTS PASSED"

# ---------------------------------------------------------------------------
# Payment concurrency (R6): parallel sessions as service_role (the webhooks)
# ---------------------------------------------------------------------------
sv() { "${PSQL[@]}" -At -c "SET ROLE service_role" -c "$1" | tail -n 1; }
PROD='00000000-0000-0000-0000-0000000f0001'
BUYER='00000000-0000-0000-0000-0000000f00b1'
"${PSQL[@]}" -c "UPDATE products SET stock = 100 WHERE id = '$PROD'; UPDATE users SET bonus_points = 0, total_orders = 0 WHERE id = '$BUYER';"
mk() { sv "SELECT pt.new_order('$1', pt.two_of('$PROD'))" >/dev/null; }
OUT="$WORK/conc"; mkdir -p "$OUT"

echo "== Concurrency: 6 parallel PerformTransaction of one transaction"
mk cc1; sv "SELECT public.payme_create_transaction('pm-cc1', 'tx-cc1', 1, 10000000) ->> 'result'" >/dev/null
for i in 1 2 3 4 5 6; do sv "SELECT public.payme_perform_transaction('tx-cc1', $i) ->> 'result'" >"$OUT/p$i" & done; wait
n=$(cat "$OUT"/p* | grep -c '^performed$' || true)
[[ "$n" == "1" ]] || fail "expected exactly one 'performed', got: $(cat "$OUT"/p* | tr '\n' ' ')"
[[ "$(cat "$OUT"/p* | grep -c '^already_performed$')" == "5" ]] || fail "others should answer already_performed"
[[ "$(sv "SELECT stock FROM products WHERE id = '$PROD'")" == "98" ]] || fail "stock should be 98"
pass "one performs, five answer already_performed; stock 100 → 98 once"

echo "== Concurrency: 6 parallel CreateTransaction with different ids on one order"
mk cc2; rm -f "$OUT"/*
for i in 1 2 3 4 5 6; do sv "SELECT public.payme_create_transaction('pm-cc2', 'tx-cc2-$i', $i, 10000000) ->> 'result'" >"$OUT/c$i" & done; wait
[[ "$(cat "$OUT"/c* | grep -c '^created$')" == "1" ]] || fail "expected exactly one created, got: $(cat "$OUT"/c* | tr '\n' ' ')"
[[ "$(cat "$OUT"/c* | grep -c '^order_unavailable$')" == "5" ]] || fail "others should be refused"
bound=$(sv "SELECT payme_transaction_id FROM orders WHERE id = 'cc2'")
won=$(grep -l '^created$' "$OUT"/c* | sed 's/.*c//')
[[ "$bound" == "tx-cc2-$won" ]] || fail "bound $bound, winner tx-cc2-$won"
for i in 1 2 3 4 5 6; do sv "SELECT public.payme_perform_transaction('tx-cc2-$i', 1) ->> 'result'" >"$OUT/q$i" & done; wait
[[ "$(cat "$OUT"/q* | grep -c '^performed$')" == "1" ]] || fail "only the bound transaction may perform"
[[ "$(sv "SELECT stock FROM products WHERE id = '$PROD'")" == "96" ]] || fail "stock should be 96"
pass "one transaction binds; only it performs; stock 98 → 96 once"

echo "== Concurrency: 8 different orders (Payme + Click) on the same product and buyer"
rm -f "$OUT"/*
for i in 1 2 3 4; do mk "px$i"; sv "SELECT public.payme_create_transaction('pm-px$i', 'tx-px$i', 1, 10000000)" >/dev/null; mk "cx$i"; done
for i in 1 2 3 4; do
  sv "SELECT public.payme_perform_transaction('tx-px$i', 1) ->> 'result'" >"$OUT/x$i" &
  sv "SELECT public.click_complete_payment('ck-cx$i', '9900$i', NULL, 1) ->> 'result'" >"$OUT/y$i" &
done; wait
[[ "$(cat "$OUT"/x* | grep -c '^performed$')" == "4" && "$(cat "$OUT"/y* | grep -c '^completed$')" == "4" ]] \
  || fail "all 8 orders should complete: $(cat "$OUT"/* | tr '\n' ' ')"
[[ "$(sv "SELECT stock FROM products WHERE id = '$PROD'")" == "80" ]] || fail "stock should be 96 - 16 = 80, got $(sv "SELECT stock FROM products WHERE id = '$PROD'")"
got=$(sv "SELECT bonus_points || '/' || total_orders FROM users WHERE id = '$BUYER'")
# earlier: cc1 + cc2 = 2 × 2700; now 4 × 2700 (Payme, 3% of subtotal) + 4 × 3000 (Click, 3% of total)
[[ "$got" == "28200/10" ]] || fail "buyer should be 28200/10, got $got"
pass "no lost updates: stock 96 → 80 (8 × 2), buyer +22800 / +8 orders"

echo "ALL PAYMENT CONCURRENCY TESTS PASSED"
