# Customer-Facing Pages

17 pages, all receive `onNavigate` prop for routing. Pattern: `pb-20 pt-16 bg-gray-50 min-h-screen`.

## Shopping

### HomePage
- Hero banners (Carousel), countdown timer, category grid, featured products
- Background: `#f5f5f5`, cards use `rounded-2xl shadow-md`
- Banners: no text overlay (text baked into images), `shadow-md`
- Featured products: module-level cache in `useProducts.js` (not useRef — persists across re-mounts)

### ShopPage
- Full catalog: search (300ms debounce), filters (category/material/color/size), sorting
- Product grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (single column mobile)
- Smart filter cascade: materials filtered by category, colors by category+material, sizes by all three
- Filters only show options with available visible products
- Dropdown uses React Portal (`createPortal`) to escape `overflow-x-auto` parent — see `CustomDropdown.jsx`
- Focus ring fix on filter container: `pt-1 px-1 -ml-1`
- Hidden products excluded from filter options via `getFilteredProductsForOptions()`

### ProductPage
- Lightweight data shown instantly, full data (description/images/a_plus_content) fetched on-demand via `productsAPI.getById()`
- Main image: CSS `background-image` div (not `<img>`) — prevents Telegram long-press URL exposure
- Thumbnails: also `background-image`
- Pinch-to-zoom: CSS `transform` still works on divs
- Reviews, related products, A+ content below fold

### CartPage
- Cross-references cart items against live product visibility from AdminContext
- Hidden products excluded from display and total calculations
- Volume pricing: resolves **live** from AdminContext products (not stale cart snapshots)
- Bonus points: apply up to 20% of order value

### FavoritesPage
- Products WITH variants → navigate to ProductPage for variant selection
- Products WITHOUT variants → add directly to cart
- Hidden products filtered from favorites list

## Checkout Flow

### CheckoutPage
Delivery types (stored as `deliveryInfo.type`):

| Type | Value | Fee | Notes |
|------|-------|-----|-------|
| Self-pickup | `'self_pickup'` | 0 | Static store card shown, no cascading dropdowns |
| Yandex | `'home_delivery'` | calculated | Tashkent only, 11 districts |
| BTS | `'bts_delivery'` | 0 | Postpaid — paid on pickup, manual address textarea |
| Other couriers | `'pickup'` | calculated | Cascading state → city → pickup point |

**Self-pickup address** (SELF_PICKUP_ADDRESS constant):
- AILEM Do'koni, Yunusobod-19, 44 dom, Toshkent
- Hours: 09:00-18:00, Phone: +998 99 221 11 12

Self-pickup and BTS excluded from shipping rate lookup and cascading dropdowns (special-cased like Yandex).

Per-variant weight: `handleAddToCart` overrides `product.weight` with variant's weight before adding to cart.

### PaymentPage
- Creates order with status `'pending'`
- Stores `pendingPayment` in localStorage (orderId, method, timestamp)
- Opens Payme via `window.Telegram.WebApp.openLink(paymentUrl)`
- **Does NOT deduct bonus points or clear cart** — both happen in PaymentStatusPage after confirmation
- Click payment: disabled (commented out lines 372-432)

### PaymentStatusPage
- Polls order status every 3s, up to 6 times (18s total)
- On `'approved'`: clears cart + deducts bonus points (`orderData.bonusPointsUsed`)
- On `'rejected'`/`'failed'`: shows failure UI, cart stays intact
- On timeout: prompts user to check Telegram or retry
- Auto-redirects to OrderDetailsPage after 4s on success

**Critical lesson**: Never deduct user resources (cart, bonus points) before payment is confirmed.

## Account Management

### ProfilePage
- Bonus card: red gradient (`from-accent to-red-600`)
- Referral link sharing via Telegram

### OrderHistoryPage / OrderDetailsPage
- Order status flow: `pending → approved → shipped → delivered`
- Telegram notification sent on each status change

### MyReviewsPage
- Two tabs: pending reviews (delivered orders without reviews) + approved reviews
- All strings in Uzbek

### WriteReviewPage
- Star rating (1-5), comment, up to 5 images
- Only available for delivered orders

## Common Page Patterns

```javascript
// Template
const MyPage = ({ onNavigate }) => {
  const { user } = useContext(UserContext);
  return (
    <div className="pb-20 pt-16 bg-gray-50 min-h-screen">
      {/* content */}
    </div>
  );
};
```

```javascript
// Translation
import { t } from '../../utils/translation-fallback';
<h1>{t('page.title')}</h1>
<p>{t('shop.productsFound', { count: n })}</p>
```

## Lazy Loading
All pages except HomePage, ShopPage, CartPage are lazy-loaded via `lazyWithRetry()` in `App.jsx`.
`lazyWithRetry()` auto-reloads once on chunk load failure using `sessionStorage('chunk_reload')` flag.
