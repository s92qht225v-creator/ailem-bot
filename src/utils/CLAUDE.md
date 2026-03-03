# Utility Modules

## helpers.js

- `formatPrice(amount)` — `150 000 so'm` format (spaces, Uzbek style)
- `formatDate(date)` — DD.MM.YYYY
- `generateOrderNumber()` — `ORD-{timestamp}-{random}`
- `saveToLocalStorage(key, value)` / `loadFromLocalStorage(key)` / `removeFromLocalStorage(key)`
  - Detects Telegram Desktop (where localStorage throws), uses in-memory fallback

## translation-fallback.js

i18n system with Uzbek (Cyrillic) translations.

```javascript
import { t } from './translation-fallback';
t('cart.title')                              // simple
t('shop.productsFound', { count: 5 })        // with params
```

Keys use dot notation: `'cart.title'`, `'payment.payme'`, `'shop.all'` = `'Hammasi'`.
Add missing keys here when UI shows raw key strings.

## volumePricing.js

Tier-based bulk discount system. See root CLAUDE.md for full business logic.

Key functions:
- `getTierThreshold(volumePricing)` — min_qty of first tier (used for grouping)
- `getVolumePricedUnit(qty, volumePricing)` — effective price per unit at given quantity
- `groupItemsByTier(cartItems)` — groups cart items by matching tier thresholds
- `getTierGroupQuantity(group)` — combined quantity across grouped products
- `calculateItemTotalWithTierGrouping(item, allCartItems)` — final price with cross-product grouping
- `getTierGroupInfo(item, allCartItems)` — UI data: progress, remaining, qualifies, savings

**Per-variant pricing**: cart/checkout must resolve live `volume_pricing` from AdminContext products, not stale cart snapshots.

```javascript
// Products WITHOUT variants
product.volume_pricing = [{ min_qty: 1, max_qty: 9, price: 100000 }, ...]

// Products WITH variants — stored inside variant JSONB
variant.volume_pricing = [{ min_qty: 5, max_qty: null, price: 50000 }]
```

## variants.js

- `generateVariants(colors, sizes)` — cartesian product of color × size combinations
- `findVariant(variants, color, size)` — exact match lookup
- `updateVariant(variants, color, size, updates)` — immutable update

## validation.js

Input validation for products, categories, orders. Returns `{ valid, errors }`.

## csvExport.js

Export functions for all entity types:
- `exportProducts(products)`, `exportOrders(orders)`, `exportReviews(reviews)`
- `exportUsers(users)`, `exportWalkInCustomers(customers)`

## analytics.js

Revenue calculations and trend analysis for AnalyticsSection:
- Total/monthly/weekly revenue, average order value
- Month-over-month growth, 7-day chart data
- Order breakdown by status

## recommendations.js

Product recommendation engine. All 6 functions filter `product.visible !== false`:
- `getRelatedProducts(product, allProducts)`
- `getSameCategoryProducts(product, allProducts)`
- `getSimilarTagProducts(product, allProducts)`
- `getSimilarPriceProducts(product, allProducts)`
- `getBestSellerProducts(allProducts)`
- `getFrequentlyBoughtTogether(product, orders, allProducts)`

## shippingLabel.js / packingSlip.js

Browser print API for single and batch label/slip printing.

## locationTranslations.js

Uzbek location names for shipping dropdowns (regions, cities).

## telegram-fix.js

Workarounds for Telegram Desktop limitations (localStorage, WebView quirks).

## checkUploadPermissions.js

Diagnostic tool for Supabase Storage upload issues (RLS policy checker).

## Image Protection Pattern

Telegram WebView intercepts long-press on `<img>` elements (shows native save dialog).

**Solution**: Use CSS `background-image` on `<div>` instead of `<img>`:
```javascript
// ❌ Telegram can intercept
<img src={url} />

// ✅ Protected
<div style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover' }} />
```

Use `IntersectionObserver` for lazy loading (replaces `loading="lazy"` which only works on `<img>`):
```javascript
// 200px rootMargin for early loading of off-screen images
const observer = new IntersectionObserver(callback, { rootMargin: '200px' });
```
