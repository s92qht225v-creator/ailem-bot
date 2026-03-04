# Utility Modules

## helpers.js

Core utilities used throughout the app.

- `formatPrice(amount)` → `"150 000 so'm"` (Uzbek number format with spaces)
- `formatDate(dateString)` → `"DD.MM.YYYY"` (Uzbek locale)
- `generateOrderNumber()` → `"ORD-{timestamp}-{random}"`
- `generateReferralCode(userName)` → short unique code
- `calculateTimeRemaining(endDate)` → `{ days, hours, minutes, seconds, expired }`
- `calculateBonusPoints(amount)` — percentage of order subtotal
- `calculateMaxBonusUsage(orderTotal)` — max 20% of order total
- `bonusPointsToDollars(points)` — 1 point = 1 UZS (configurable)
- `getStatusColor(status)` → Tailwind CSS class
- `getColorHex(colorName)` → hex string (Uzbek color names)
- `debounce(fn, delay)`, `copyToClipboard(text)`, `truncateText(text, maxLength)`
- `validateEmail(email)`, `validatePhone(phone)`

### localStorage wrapper (Telegram Desktop safe)
```javascript
saveToLocalStorage(key, value)    // Falls back to in-memory on Telegram Desktop
loadFromLocalStorage(key, default) // Returns default if missing
removeFromLocalStorage(key)
```
Telegram Desktop throws when accessing `window.localStorage` — the wrapper catches this and uses an in-memory Map as fallback.

## translation-fallback.js

i18n system with Uzbek (Cyrillic) translations. Source of truth: `src/locales/uz.js`.

```javascript
import { t } from './translation-fallback';
t('cart.title')                              // simple key
t('shop.productsFound', { count: 5 })        // with interpolation
```

Keys use dot notation: `'cart.title'`, `'payment.payme'`, `'nav.home'`.
If a key is missing, the raw key string is displayed — add it to `src/locales/uz.js`.

All customer-facing UI must use Uzbek strings. No English in displayed text.

## volumePricing.js

Tier-based bulk discount system.

```javascript
// Structure
[{ min_qty: 1, max_qty: 9, price: 100000 }, { min_qty: 10, max_qty: null, price: 90000 }]

// Product-level (no variants)
product.volume_pricing = [...]

// Variant-level (stored inside variants JSONB)
variant.volume_pricing = [...]
```

Key functions:
- `getTierThreshold(volumePricing)` — min_qty of first tier (used for grouping)
- `getVolumePricedUnit(qty, volumePricing)` — effective price per unit at given quantity
- `groupItemsByTier(cartItems)` — groups cart items sharing same threshold for cross-product discounts
- `calculateItemTotalWithTierGrouping(item, allCartItems)` — final price with cross-product grouping
- `getTierGroupInfo(item, allCartItems)` — UI data: progress bar, remaining to tier, savings

**Critical**: Cart/checkout must resolve live `volume_pricing` from AdminContext products — never use stale cart snapshots.

## variants.js

Variant management for color × size combinations.

- `generateVariants(colors, sizes)` — cartesian product
- `findVariant(variants, color, size)` — exact match lookup
- `updateVariant(variants, color, size, updates)` — immutable update, returns new array
- `getTotalVariantStock(variants)` — sum of all variant stocks
- `decreaseVariantStock(variants, color, size, qty)` — returns updated variants array
- `updateVariantStock(variants, color, size, stock)` — set absolute stock value

## validation.js

Input validation for all entity types. Returns `{ valid: boolean, errors: object }`.

- `validateProduct(data)` — name, price, category required; price must be positive number
- `validateCategory(data)` — name required
- `validateOrder(data)` — items, total, delivery info required
- `validateReview(data)` — rating 1–5, comment min 10 chars
- `validateUser(data)` — name required
- `validateUUID(value)` — UUID format check

## analytics.js

Revenue metrics for AnalyticsSection admin panel.

- `getTotalRevenue(orders)`, `getMonthlyRevenue(orders)`, `getWeeklyRevenue(orders)`
- `getAverageOrderValue(orders)`
- `getMonthOverMonthGrowth(orders)` → percentage change
- `get7DayChartData(orders)` → array of `{ date, revenue }` for last 7 days
- `getOrdersByStatus(orders)` → count per status

## csvExport.js

Browser-side CSV export (creates download link).

- `exportProducts(products)`, `exportOrders(orders)`, `exportReviews(reviews)`
- `exportUsers(users)`, `exportWalkInCustomers(customers)`

## recommendations.js

Product recommendation engine for RelatedProducts component.
All functions filter `product.visible !== false` (hidden products excluded).

- `getRelatedProducts(product, allProducts)` — combined score: category + tags + price
- `getSameCategoryProducts(product, allProducts)` — same category_id
- `getSimilarTagProducts(product, allProducts)` — tag overlap
- `getSimilarPriceProducts(product, allProducts)` — within ±30% price range
- `getBestSellerProducts(allProducts)` — highest stock turnover (approximated)
- `getFrequentlyBoughtTogether(product, orders, allProducts)` — co-occurrence in orders

## shippingLabel.js / packingSlip.js

Browser print API for physical documents.

- `printShippingLabel(order)` — single label
- `printBatchShippingLabels(orders)` — batch print
- `printPackingSlip(order)` — packing slip

## locationTranslations.js

Uzbek region and city names for shipping dropdowns.
`UZBEKISTAN_REGIONS` and `UZBEKISTAN_CITIES` maps.

## navigation.js

Maps page names to URL paths for `useAppNavigate` hook.

```javascript
getHref('product', { id: '123' })   // → '/product/123'
getHref('orders', { id: '456' })    // → '/orders/456'
getHref('payment/status', { order: 'x', method: 'payme' })  // → '/payment/status?order=x&method=payme'
```

## checkUploadPermissions.js

Diagnostic tool for Supabase Storage upload issues.
Run `checkUploadPermissions()` in browser console to test bucket RLS policies.
If uploads return 403: run `fix-storage-rls.sql` in Supabase SQL Editor.

## Image Protection Pattern

Telegram WebView intercepts long-press on `<img>` elements (shows native "Save Image" dialog).

```javascript
// ❌ Telegram can intercept
<img src={url} />

// ✅ Protected — use CSS background-image
<div
  style={{
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }}
/>
```

Also disable context menu via `GlobalEffects.jsx`:
```javascript
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});
```

### Lazy Loading with IntersectionObserver

`loading="lazy"` only works on `<img>`. For background-image divs:

```javascript
const observer = new IntersectionObserver(
  ([entry]) => { if (entry.isIntersecting) setVisible(true); },
  { rootMargin: '200px' }  // pre-load 200px before entering viewport
);
observer.observe(ref.current);
return () => observer.disconnect();
```

## Boolean Visibility Filter

```javascript
// ✅ Handles undefined/null gracefully (new products without explicit visible=true still show)
items.filter(i => i.visible !== false)

// ❌ Excludes items where visible is undefined (breaks for products without the field)
items.filter(i => i.visible === true)
```
