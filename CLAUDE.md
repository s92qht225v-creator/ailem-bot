# CLAUDE.md - Ailem Bot Project Guide

## Project Overview

**Ailem** — Telegram Mini App e-commerce platform for home textiles (Uzbekistan).
- **Version**: 1.0.26 | **Language**: Uzbek (Cyrillic) | **Currency**: UZS | **Domain**: www.ailem.uz
- **Platform**: Telegram Mini App | **Hosting**: Vercel | **DB**: Supabase (Mumbai, ap-south-1)

## Sub-Guides (read these when working in each area)

- [src/components/pages/CLAUDE.md](src/components/pages/CLAUDE.md) — 17 customer pages, checkout/payment flow, delivery types
- [src/components/admin/CLAUDE.md](src/components/admin/CLAUDE.md) — 12 admin sections, auth, audit logging
- [src/context/CLAUDE.md](src/context/CLAUDE.md) — 7 contexts, loading phases, hooks
- [src/services/CLAUDE.md](src/services/CLAUDE.md) — API modules, Payme/Click, Telegram, webhooks
- [src/utils/CLAUDE.md](src/utils/CLAUDE.md) — utilities, volume pricing, image protection

## Tech Stack

- **Frontend**: React 18.3.1 + Vite 5.4.20 (vanilla JS, no TypeScript)
- **Styling**: Tailwind CSS 3.4.3 + custom colors (see Design System below)
- **Icons**: Lucide React 0.344.0
- **State**: React Context API (7 contexts)
- **Backend**: Supabase PostgreSQL + Storage + Realtime
- **Payments**: Payme (active), Click.uz (disabled)
- **Other**: React Quill (rich text), html5-qrcode (barcode scanning), Vitest (tests)

## Quick Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:coverage
```

## Project Structure

```
src/
├── components/
│   ├── admin/sections/    # 12 admin sections + CLAUDE.md
│   ├── admin/shared/      # APlusEditor, ErrorBoundary
│   ├── cashier/           # POS system
│   ├── pages/             # 17 customer pages + CLAUDE.md
│   ├── product/           # ProductCard, ProductDetails, APlusContent
│   ├── common/            # Carousel, CustomDropdown, CategoryFilter, etc.
│   └── layout/            # Header, BottomNav
├── context/               # 7 contexts + CLAUDE.md
├── hooks/                 # 6 custom hooks
├── services/              # API, payments, Telegram + CLAUDE.md
├── utils/                 # 15+ utilities + CLAUDE.md
├── locales/               # i18n (Uzbek)
├── lib/                   # Supabase client
└── data/                  # Static constants
```

## Database Schema (key tables)

**users**: `id, telegram_id, name, phone, bonus_points, referral_code, referred_by, role, favorites[]`
**products**: `id, name, price, category_id, image, images[], stock, weight, variants JSONB, volume_pricing JSONB, a_plus_content JSONB, visible, barcode`
**orders**: `id, order_number, user_id, status, subtotal, delivery_fee, bonus_discount, bonus_points_used, total, items JSONB, delivery_info JSONB, payment_method`
**reviews**: `id, product_id, user_id, rating, comment, images[], approved, verified`
**categories**: `id, name, image, visible`
**settings**: `key, value JSONB` — banners, bonus config, inventory threshold
**audit_logs**: `id, action, entity_type, entity_id, admin_id, admin_email, old_data, new_data`
**walk_in_customers, pickup_points, shipping_rates, stock_notifications**: supporting tables

Order status flow: `pending → approved → shipped → delivered` (or `rejected`)

## Design System

**Font**: Plus Jakarta Sans (Google Fonts, 400–700 weights)
**Max width**: 448px (Telegram Mini App WebView)

```javascript
// tailwind.config.js custom colors
primary: '#111827'   // dark gray — main text
accent:  '#ed2224'   // Ailem Red — buttons, highlights
success: '#10B981'   // green
warning: '#F59E0B'   // yellow
error:   '#EF4444'   // red
```

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

API layer auto-transforms between DB snake_case and app camelCase.

## Environment Variables

```bash
VITE_SUPABASE_URL=https://jbdzhwenzedlwbdpguyt.supabase.co  # Mumbai ap-south-1
VITE_SUPABASE_ANON_KEY=...
VITE_TELEGRAM_BOT_TOKEN=...
VITE_PAYME_MERCHANT_ID=...
VITE_PAYME_TEST_MODE=true
VITE_CLICK_MERCHANT_ID=...
VITE_CLICK_SERVICE_ID=...
VITE_APP_URL=https://www.ailem.uz
```

## Performance

1. **Code splitting**: 14 pages lazy-loaded via `lazyWithRetry()` — bundle 426 KB (was 1,420 KB)
2. **Two-phase loading**: products/categories/reviews first → orders/users deferred
3. **Single RPC**: `get_essential_data(lightweight)` — 1 DB call for 3 tables
4. **Debounced cart sync**: 500ms debounce to Supabase
5. **Background-image lazy loading**: IntersectionObserver, 200px rootMargin
6. **Console stripping**: all `console.*` removed from prod via esbuild
7. **React.memo**: ProductCard, CategoryFilter, Carousel

## Security

- Admin auth: Supabase Auth + `admin_users` table (JWT, not hardcoded)
- XSS: DOMPurify on product descriptions
- RLS: Row-level security on all Supabase tables
- Audit logging: all admin actions logged
- Image protection: `background-image` div instead of `<img>` (Telegram long-press)

## Infrastructure

- **Supabase**: Mumbai (ap-south-1), project `jbdzhwenzedlwbdpguyt`
- **Vercel**: `vercel.json` rewrite `/((?!assets|api).*)` → `/index.html` (SPA + excludes assets)
- **Migrations**: `supabase-migrations/` — run in Supabase SQL Editor

## Known Limitations

- Click payment: UI disabled (PaymentPage.jsx lines 372-432 commented)
- Address management, Settings page, Help section: placeholders
- Telegram Desktop: localStorage disabled (in-memory fallback)
- Payment webhooks: server-side only (not in frontend)

## Common Issues

- **DB 400 column not found**: run migration SQL in Supabase SQL Editor
- **Storage upload 403**: run `fix-storage-rls.sql`
- **Banners missing after migration**: also rewrite `app_settings.banners` JSONB URLs
- **Chunk load failure**: `lazyWithRetry()` handles it; Vercel rewrite excludes `/assets/`
- **Vercel rewrite regex**: use `((?!pattern).*)` not `(?!pattern)(.*)`
- **Stale cart pricing**: resolve live `volume_pricing` from AdminContext, not cart snapshot
- **Payment pre-deduction**: never deduct cart/bonus before payment confirmed — do in PaymentStatusPage

## Deployment Checklist

1. Bump version in `package.json`
2. Test payment flows (Payme/manual)
3. Verify Supabase migrations applied
4. Check env vars in Vercel
5. Test in Telegram Mobile App

---

**Last Updated**: 2026-03-04
**Maintained By**: Ailem Development Team
