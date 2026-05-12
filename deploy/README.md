# Hetzner Migration Runbook

Migrate Ailem from Vercel to a single Hetzner VM. Supabase (Mumbai) stays as the DB/storage.
All functionality preserved: Payme + Click webhooks, Telegram support webhook, Telegram login,
admin panel, two-phase loading, force-dynamic SSR.

## 1. Provision the server

- Hetzner Cloud Console → New Server
  - Image: **Ubuntu 24.04**
  - Type: **CPX21** (3 vCPU, 4 GB RAM, 80 GB disk) — start here, scale later
  - Location: **Falkenstein** (or Helsinki — both have similar latency to Supabase Mumbai)
  - SSH key: add yours
  - Backups: **enabled** (20% surcharge, worth it)
- Note the IPv4 address.

## 2. Initial server setup

SSH in as `root` and run the bootstrap:

```bash
scp deploy/setup-server.sh root@<IP>:/root/
ssh root@<IP> bash /root/setup-server.sh
```

This installs Docker, creates a `deploy` user, enables UFW (22/80/443), sets up 2 GB swap,
and turns on unattended security upgrades.

## 3. Copy compose files

From your laptop:

```bash
scp docker-compose.yml Caddyfile deploy@<IP>:/opt/ailem/
ssh deploy@<IP>
cd /opt/ailem
```

## 4. Create `/opt/ailem/.env` (production secrets)

Copy values from your current Vercel dashboard. Server-only secrets stay out of the bundle:

```dotenv
# Public (also baked into client bundle at build time via GH Actions)
NEXT_PUBLIC_SUPABASE_URL=https://jbdzhwenzedlwbdpguyt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_PAYME_MERCHANT_ID=...
NEXT_PUBLIC_PAYME_TEST_MODE=false
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=...
NEXT_PUBLIC_APP_URL=https://www.ailem.uz
NEXT_PUBLIC_CLICK_MERCHANT_ID=...
NEXT_PUBLIC_CLICK_SERVICE_ID=...
NEXT_PUBLIC_CLICK_TEST_MODE=false

# Legacy VITE_ aliases (src/lib/supabase.js still reads these)
VITE_SUPABASE_URL=https://jbdzhwenzedlwbdpguyt.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_TELEGRAM_BOT_TOKEN=...
VITE_PAYME_MERCHANT_ID=...
VITE_PAYME_TEST_MODE=false
VITE_CLICK_MERCHANT_ID=...
VITE_CLICK_SERVICE_ID=...
VITE_CLICK_TEST_MODE=false

# Server-only (never exposed to client)
SUPABASE_SERVICE_ROLE_KEY=...
TELEGRAM_BOT_TOKEN=...
PAYME_KEY=...
PAYME_TEST_KEY=...
PAYME_ADDITIONAL_KEYS=
CLICK_SERVICE_ID=...
CLICK_SECRET_KEY=...
```

```bash
chmod 600 /opt/ailem/.env
```

## 5. GitHub repository secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `SSH_HOST` | Hetzner VM IP |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | private SSH key (matching the public key on the server) |
| `SSH_PORT` | `22` (optional) |
| `NEXT_PUBLIC_SUPABASE_URL` | … |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | … |
| `NEXT_PUBLIC_PAYME_MERCHANT_ID` | … |
| `NEXT_PUBLIC_PAYME_TEST_MODE` | `false` |
| `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` | … |
| `NEXT_PUBLIC_APP_URL` | `https://www.ailem.uz` |
| `NEXT_PUBLIC_CLICK_MERCHANT_ID` | … |
| `NEXT_PUBLIC_CLICK_SERVICE_ID` | … |
| `NEXT_PUBLIC_CLICK_TEST_MODE` | … |

(`GITHUB_TOKEN` is provided automatically.)

## 6. First deploy

Push to `main` (or run the workflow manually). The pipeline:

1. Builds the multi-stage Docker image with public env vars baked in
2. Pushes to `ghcr.io/<owner>/ailem-bot:sha-<short>` + `:latest`
3. SSHes to the VM, pulls the new image, and runs `docker compose up -d`

Verify on the VM:

```bash
ssh deploy@<IP>
cd /opt/ailem
docker compose ps
docker compose logs -f app
```

## 7. Test on a staging hostname

Before flipping DNS, add a temp A record `staging.ailem.uz → <IP>` and add it to the Caddyfile.
Run the full QA checklist:

- [ ] Homepage loads, products render, images load from Supabase CDN
- [ ] Telegram Login Widget works (must register `staging.ailem.uz` in BotFather first, or skip and verify after cutover)
- [ ] Add to cart → checkout → Payme test payment → status page shows approved
- [ ] Cart cleared + bonus deducted **only after** approval
- [ ] BTS delivery, self-pickup, Yandex flows
- [ ] Manual payment screenshot upload
- [ ] Admin login → orders, products, audit log
- [ ] Two-way support chat (open chat, send message, reply from Telegram)
- [ ] `/api/payme-webhook` reachable: `curl -i https://staging.ailem.uz/api/payme-debug`

## 8. DNS cutover

1. **Lower TTL** on `ailem.uz` and `www.ailem.uz` A records to 60s. Wait for old TTL.
2. **Flip A records** to the Hetzner IP.
3. Caddy auto-issues TLS certs within ~30 s.
4. Confirm: `curl -I https://www.ailem.uz` → `200`, valid cert.

## 9. Re-register webhooks

The URLs don't change (same domain), but reconfirm:

```bash
# Telegram support webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://www.ailem.uz/api/support/webhook"

# Telegram bot main webhook (if used)
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Payme/Click merchant dashboards: confirm callback URLs still point to
`https://www.ailem.uz/api/payme-webhook` and `/api/click-webhook`.

BotFather → `/mybots` → Bot Settings → Domain: verify `ailem.uz` is listed (for Telegram Login Widget).

## 10. Tear down Vercel

Once 48 hours pass with no traffic issues:

- Pause the Vercel project (keeps it for rollback)
- After another week: delete it

## Rollback

If something breaks, switch DNS back to the Vercel IPs (Vercel keeps them stable while the
project is alive). With a 60 s TTL, recovery is fast.

## Operations cheat sheet

```bash
# Tail app logs
docker compose -f /opt/ailem/docker-compose.yml logs -f app

# Tail Caddy / TLS issuance
docker compose -f /opt/ailem/docker-compose.yml logs -f caddy

# Force redeploy current image
cd /opt/ailem && docker compose up -d --force-recreate app

# Disk / memory
df -h ; free -h ; docker system df

# Prune old images
docker image prune -a -f --filter "until=168h"
```

## Things that DON'T need to change

- Supabase project, RLS, storage, RPCs (`get_essential_data`)
- All API routes (`/api/payme-webhook`, `/api/click-webhook`, `/api/support/*`, etc.)
- `middleware.js` (`?admin=true` → `/admin`)
- `force-dynamic` rendering
- Image domain config (`next.config.mjs`)
- DB migrations in `supabase-migrations/`
