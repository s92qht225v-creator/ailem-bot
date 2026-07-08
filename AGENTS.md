# AGENTS.md - Ailem Bot Project Guide

## Project Overview

**Ailem** — E-commerce platform for home textiles (Uzbekistan). Runs as a web app (desktop + mobile) and inside Telegram as a Mini App.
- **Version**: 2.0.0 | **Language**: Uzbek (Cyrillic) | **Currency**: UZS | **Domain**: www.ailem.uz
- **Platform**: Next.js 14 App Router (SSR-capable, currently force-dynamic) | **Hosting**: Hetzner (Docker, GitHub Actions CI/CD) | **DB**: Supabase (Mumbai, ap-south-1)
- **Telegram bot**: `@ailemuzbot`

## Sub-Guides (read these when working in each area)

- [src/components/pages/AGENTS.md](src/components/pages/AGENTS.md) — 17 customer pages, checkout/payment flow, delivery types
- [src/components/admin/AGENTS.md](src/components/admin/AGENTS.md) — 12 admin sections, auth, audit logging
- [src/context/AGENTS.md](src/context/AGENTS.md) — 7 contexts, loading phases, hooks
- [src/services/AGENTS.md](src/services/AGENTS.md) — API modules, Payme/Click, Telegram, webhooks
- [src/utils/AGENTS.md](src/utils/AGENTS.md) — utilities, volume pricing, image protection

## Tech Stack

- **Framework**: Next.js 14.2.35, React 18.3.1 (vanilla JS, no TypeScript)
- **Styling**: Tailwind CSS 3.4.3 + custom design tokens
- **Icons**: Lucide React 0.344.0
- **State**: React Context API (7 contexts — no Redux)
- **Backend**: Supabase PostgreSQL + Storage
- **Payments**: Payme (active), Click.uz (disabled in UI)
- **Other**: React Quill (rich text editor), html5-qrcode (barcode scanning), Vitest (tests)

## Quick Commands

```bash
npm run dev          # Start dev server (next dev)
npm run build        # Production build (next build)
npm run start        # Start production server
npm run test         # Run Vitest tests
npm run test:coverage
```

## Project Structure

```
app/                         # Next.js App Router
├── (shop)/                  # Customer-facing routes (grouped layout)
│   ├── layout.jsx           # Wraps with ClientShopLayout (header, nav, footer)
│   ├── page.jsx             # / → HomePage
│   ├── shop/page.jsx        # /shop → ShopPage
│   ├── product/[id]/page.jsx
│   ├── cart/page.jsx
│   ├── checkout/page.jsx
│   ├── payment/page.jsx
│   ├── payment/status/page.jsx
│   ├── account/page.jsx
│   ├── profile/page.jsx
│   ├── login/page.jsx
│   ├── orders/page.jsx
│   ├── orders/[id]/page.jsx
│   ├── reviews/page.jsx
│   ├── reviews/write/page.jsx
│   ├── favorites/page.jsx
│   └── referrals/page.jsx
├── admin/
│   ├── layout.jsx
│   └── page.jsx             # Admin panel (?admin=true redirects here via middleware.js)
├── api/                     # Next.js API Routes (serverless)
│   ├── auth/telegram-login/route.js
│   ├── admin/pickup-points/route.js
│   ├── admin/shipping-rates/route.js
│   ├── payme-webhook/route.js
│   ├── click-webhook/route.js
│   ├── payme-debug/route.js
│   ├── create-invoice/route.js
│   ├── test-stock-deduction/route.js
│   └── support/
│       ├── webhook/route.js   # Telegram webhook → saves admin replies to DB
│       ├── messages/route.js  # GET — poll messages for session
│       └── message/route.js   # POST — send user message + forward to admin Telegram
├── globals.css
├── layout.jsx               # Root layout: fonts, metadata, Providers wrapper
├── not-found.jsx
├── robots.js                # SEO: robots.txt
└── sitemap.js               # SEO: sitemap.xml

src/
├── components/
│   ├── admin/sections/      # 12 admin sections (AGENTS.md)
│   ├── admin/shared/        # APlusEditor, ErrorBoundary, StatCard
│   ├── cashier/             # CashierMode.jsx (POS)
│   ├── pages/               # 17 customer pages (AGENTS.md)
│   ├── product/             # ProductCard, ProductDetails, APlusContent, ReviewSection, RelatedProducts
│   ├── common/              # Carousel, CustomDropdown, CategoryFilter, TelegramChatButton, SkeletonCard, etc.
│   ├── layout/              # Header, BottomNav, Footer, CategoryNavBar, ClientShopLayout
│   ├── AdminAuth.jsx        # Admin login screen
│   ├── ErrorBoundary.jsx
│   ├── GlobalEffects.jsx    # Referral codes, pending payment recovery, image protection
│   └── Providers.jsx        # Wraps all 7 context providers + GlobalEffects
├── context/                 # 7 contexts (AGENTS.md)
├── hooks/                   # 7 custom hooks
├── services/                # api.js, payme.js, click.js, telegram.js, etc. (AGENTS.md)
├── utils/                   # helpers.js, volumePricing.js, variants.js, etc. (AGENTS.md)
├── lib/
│   ├── supabase.js          # Client-side Supabase (lazy-loaded, noop proxy at build time)
│   ├── supabase-server.js   # Server-side Supabase (service role key, bypasses RLS)
│   └── data.js              # Server-side data fetching helpers
├── locales/uz.js            # Uzbek (Cyrillic) translations (200+ keys)
└── App.jsx                  # Legacy SPA router (not used in Next.js — kept for reference)

supabase-migrations/         # SQL migration files — run in Supabase SQL Editor
middleware.js                # Redirects ?admin=true → /admin
next.config.mjs              # Image domains, console removal in prod
tailwind.config.js           # Design tokens
Dockerfile                   # Production Next.js container image
docker-compose.yml           # App + Caddy on the Hetzner VM (/opt/ailem)
Caddyfile                    # Reverse proxy / TLS
.github/workflows/deploy.yml # CI/CD: build image → GHCR → SSH deploy to Hetzner
jsconfig.json                # Path alias @/* → ./
```

## Database Schema (key tables)

**users**: `id, telegram_id, name, phone, bonus_points, referral_code, referred_by, role, favorites[], cart JSONB`
**products**: `id, name, price, category_id, image, images[], stock, weight, variants JSONB, volume_pricing JSONB, a_plus_content JSONB, visible, barcode`
**orders**: `id, order_number, user_id, status, subtotal, delivery_fee, bonus_discount, bonus_points_used, total, items JSONB, delivery_info JSONB, payment_method`
**reviews**: `id, product_id, user_id, rating, comment, images[], approved, verified`
**categories**: `id, name, image, visible`
**settings**: `key, value JSONB` — banners, bonus config, inventory threshold
**audit_logs**: `id, action, entity_type, entity_id, admin_id, admin_email, old_data, new_data`
**support_messages**: `id, session_id, sender ('user'|'admin'), message, telegram_message_id, created_at`
**walk_in_customers, pickup_points, shipping_rates, stock_notifications**: supporting tables

Order status flow: `pending → approved → shipped → delivered` (or `rejected`)

## Design System

**Font**: Plus Jakarta Sans (Google Fonts, weights 400–700, loaded in `app/layout.jsx`)
**Max width**: 448px mobile (Telegram Mini App WebView), 1024px desktop

```javascript
// tailwind.config.js custom colors
primary: '#111827'   // dark gray — main text
accent:  '#ed2224'   // Ailem Red — buttons, highlights
success: '#10B981'   // green
warning: '#F59E0B'   // yellow
error:   '#EF4444'   // red
```

**Component patterns**:
- Page wrapper: `className="pb-20 pt-16 bg-gray-50 min-h-screen"`
- Cards: `rounded-xl shadow-sm bg-white`
- Primary button: `bg-accent text-white rounded-xl hover:bg-red-700`
- Disabled button: `disabled:bg-gray-300 disabled:cursor-not-allowed`

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Pages | PascalCase + "Page" | `HomePage.jsx` |
| Components | PascalCase | `ProductCard.jsx` |
| Contexts | PascalCase + "Context" | `UserContext.jsx` |
| Hooks | camelCase + "use" | `useProducts.js` |
| Utils | camelCase | `helpers.js` |
| API modules | camelCase + "API" | `productsAPI` |
| DB fields | snake_case | `user_id`, `created_at` |
| App fields | camelCase | `userId`, `createdAt` |

API layer (`src/services/api.js`) auto-transforms between DB snake_case ↔ app camelCase.

## Environment Variables

**Client-side** (prefixed `NEXT_PUBLIC_` in Next.js, `VITE_` in legacy files):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://jbdzhwenzedlwbdpguyt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_PAYME_MERCHANT_ID=...
NEXT_PUBLIC_PAYME_TEST_MODE=true
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=...   # ⚠ exposed in bundle — should move to server
NEXT_PUBLIC_APP_URL=https://www.ailem.uz
```

**Server-side** (API routes only — no prefix):
```bash
SUPABASE_SERVICE_ROLE_KEY=...        # Bypasses RLS
TELEGRAM_BOT_TOKEN=...               # For webhooks
```

Note: Legacy code uses `VITE_` prefix via `import.meta.env`. These still work in Next.js via the `VITE_` → `NEXT_PUBLIC_` aliasing in `src/lib/supabase.js`.

## Key Architectural Patterns

### Two-Phase Loading (AdminContext)
```
Phase 1: RPC get_essential_data(lightweight=true)
         → products + categories + reviews (1 DB call)
         → loading = false → customers can browse immediately
Phase 2: Parallel fetch of orders + users (background, ~1s later)
         → adminLoading = false → admin features available
```
`lightweight=true` omits `description`, `images`, `a_plus_content` — full data fetched on-demand via `productsAPI.getById()` when a ProductPage opens.

### Payment Flow (Critical — never deduct early)
```
PaymentPage:
  1. Create order (status: 'pending')
  2. Store pendingPayment in localStorage
  3. Open Payme URL
  ↓ user completes / cancels
PaymentStatusPage:
  4. Poll order status every 3s (up to 6 times)
  5. On 'approved': clearCart() + deductBonusPoints() + redirect
  6. On 'rejected': show failure, cart stays intact
```
**Rule**: Never call `clearCart()` or deduct bonus points in `PaymentPage`. Always do it in `PaymentStatusPage` after confirmation.

### Hidden Products Filter
```javascript
// ✅ Customer views — excludes hidden, handles undefined
products.filter(p => p.visible !== false)

// ✅ Admin views — show everything
products  // no filter
```

### Volume Pricing (Tier-Based Bulk Discounts)
```javascript
// Product-level (no variants)
product.volume_pricing = [{ min_qty: 1, max_qty: 9, price: 100000 }, { min_qty: 10, price: 90000 }]

// Variant-level (stored inside variants JSONB)
variant.volume_pricing = [{ min_qty: 5, price: 50000 }]
```
**Cart always resolves live `volume_pricing` from AdminContext** — never use stale cart snapshots for pricing.

### Toast Notifications
```javascript
import { useToast } from '../context/ToastContext';
const toast = useToast();
toast.success('Saqlandi!');
toast.error('Xatolik yuz berdi');
toast.warning('Diqqat!');
toast.info('Ma\'lumot');
```

### Confirmation Dialogs
```javascript
import { useConfirm } from '../context/ConfirmContext';
const confirm = useConfirm();
const ok = await confirm({ title: "O'chirish?", message: "...", type: 'danger', confirmText: "O'chirish" });
if (ok) { /* proceed */ }
```

### Audit Logging (all admin actions must be logged)
```javascript
import { logAuditAction, AUDIT_ACTIONS } from '../services/auditLog';
await logAuditAction(AUDIT_ACTIONS.UPDATE, 'product', productId, oldData, newData);
```

### Image Protection (Telegram WebView)
```javascript
// ❌ Telegram intercepts long-press on <img>
<img src={url} />

// ✅ Use CSS background-image — protected
<div style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
```

### Lazy Loading Images (IntersectionObserver)
```javascript
// 200px rootMargin pre-loads off-screen images
const observer = new IntersectionObserver(callback, { rootMargin: '200px' });
```

## Two-Way Support Chat

Users chat with admin via `TelegramChatButton.jsx`. Architecture:
```
User types → POST /api/support/message → saved to DB + forwarded to Telegram
Admin replies in Telegram → webhook /api/support/webhook → saved to DB
Website polls GET /api/support/messages?session_id=xxx every 3s
```
Session ID stored in `localStorage('support_session_id')`. Admin replies detected by unread badge (green dot) on chat button — `lastSeen` only updated when user closes chat (not on open).

**One-time setup**: After deploy, register Telegram webhook:
```
https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://www.ailem.uz/api/support/webhook
```

## Delivery Types (CheckoutPage)

| Type | `deliveryInfo.type` | Fee | Notes |
|------|---------------------|-----|-------|
| Self-pickup | `'self_pickup'` | 0 | Static store card (Yunusobod-19, 44 dom) |
| Yandex | `'home_delivery'` | calculated | Tashkent only, 11 districts |
| BTS | `'bts_delivery'` | 0 | Postpaid — paid on pickup |
| Other couriers | `'pickup'` | calculated | Cascading: state → city → pickup point |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/telegram-login` | GET | Telegram Login Widget callback |
| `/api/payme-webhook` | POST | Payme payment confirmation (updates order + inventory + bonus) |
| `/api/click-webhook` | POST | Click payment callback |
| `/api/payme-debug` | GET | Debug Payme integration |
| `/api/create-invoice` | POST | Invoice generation |
| `/api/admin/pickup-points` | GET/POST | Admin CRUD for pickup points |
| `/api/admin/shipping-rates` | GET/POST | Admin CRUD for shipping rates |
| `/api/support/message` | POST | Send user message + forward to Telegram |
| `/api/support/messages` | GET | Poll messages by session_id |
| `/api/support/webhook` | POST | Receive Telegram replies from admin |

## Performance Optimizations

1. **Code splitting**: All pages except HomePage/ShopPage/CartPage are lazy-loaded — bundle 426 KB (was 1,420 KB)
2. **Two-phase loading**: Essential data (products/categories/reviews) first → deferred (orders/users) background
3. **Single RPC**: `get_essential_data()` — 1 DB call for 3 tables
4. **Debounced cart sync**: 500ms debounce to Supabase
5. **Background-image lazy loading**: IntersectionObserver, 200px rootMargin
6. **Console stripping**: all `console.*` removed from prod via `next.config.mjs` `compiler.removeConsole`
7. **React.memo**: ProductCard, CategoryFilter, Carousel
8. **Featured products cache**: Module-level variable (not `useRef`) — persists across all hook instances and re-mounts

## Security

- Admin auth: Supabase Auth + `admin_users` table check (two-factor gate) — JWT sessions
- XSS: DOMPurify on product descriptions
- RLS: Row-level security on all Supabase tables
- Audit logging: all admin CRUD actions logged to `audit_logs` table
- Image protection: CSS `background-image` div instead of `<img>` (Telegram long-press)
- `SUPABASE_SERVICE_ROLE_KEY` and `TELEGRAM_BOT_TOKEN` are server-only (no `NEXT_PUBLIC_` prefix)

## Infrastructure

- **Supabase**: Mumbai (ap-south-1), project `jbdzhwenzedlwbdpguyt`
- **Hetzner**: single VM; the app runs in Docker (`docker-compose.yml`) behind Caddy. **Deploy = push to `main`** → GitHub Actions (`.github/workflows/deploy.yml`) builds the image, pushes to GHCR, then SSHes to the box (`/opt/ailem`) and runs `docker compose pull && up -d`. Full runbook: `deploy/README.md`. **Verify a deploy:** `gh run list --workflow=deploy.yml` (not Vercel — Vercel was abandoned ~2026-03).
- **Migrations**: `supabase-migrations/` — run SQL files manually in Supabase SQL Editor
- **Middleware**: `middleware.js` redirects `?admin=true` → `/admin`

## Known Limitations

- Click payment: UI disabled (PaymentPage.jsx lines 372-432 commented out)
- Address management, Settings page, Help section: placeholder UI only
- Telegram Desktop: localStorage throws — in-memory fallback in `helpers.js`
- `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` is exposed in bundle (should use server-side env var)
- `export const dynamic = 'force-dynamic'` in root layout disables static generation

## Common Issues

- **DB 400 column not found**: Run migration SQL in Supabase SQL Editor
- **Storage upload 403**: Run `fix-storage-rls.sql`
- **Banners missing after migration**: Rewrite URLs inside `app_settings.banners` JSONB (old project URLs)
- **"Bot token not configured"**: Add `TELEGRAM_BOT_TOKEN` (no prefix) to `/opt/ailem/.env` on the server → re-deploy
- **"Invalid API key" on login**: Add `SUPABASE_SERVICE_ROLE_KEY` to `/opt/ailem/.env` on the server → re-deploy
- **Env vars not taking effect**: runtime vars live in `/opt/ailem/.env` (restart the container); build-time `NEXT_PUBLIC_*` are GitHub Actions **secrets** baked into the image at build — update the secret and re-run the deploy workflow
- **Telegram Login Widget domain error**: Register domain in BotFather → `/mybots` → Bot Settings → Domain → `ailem.uz`
- **Stale cart pricing**: Always resolve live `volume_pricing` from AdminContext, not cart snapshot
- **Payment pre-deduction**: Never deduct cart/bonus before payment confirmed — always in PaymentStatusPage

## Deployment Checklist

1. Bump version in `package.json`
2. Run any new SQL migrations in Supabase SQL Editor
3. Add/update env vars: `/opt/ailem/.env` (runtime) and/or GitHub Actions secrets (build-time `NEXT_PUBLIC_*`)
4. Push to `main` → GitHub Actions builds the Docker image and SSH-deploys to Hetzner
5. Verify the deploy: `gh run list --workflow=deploy.yml` shows the run `success`
6. Test payment flows (Payme + manual)
7. Test in Telegram Mobile App

## SEO Status

- `favicon.svg`, `sitemap.js`, `robots.js`, canonical tag, OG metadata — done (in `app/layout.jsx`)
- Dynamic page titles — done (`app/(shop)/product/[id]/page.jsx`)
- Nav links as `<a href>` — done (Header, BottomNav)
- `export const dynamic = 'force-dynamic'` — pages render server-side on each request (no static HTML shell)

---

**Last Updated**: 2026-07-08
**Version**: 2.0.0
**Maintained By**: Ailem Development Team
