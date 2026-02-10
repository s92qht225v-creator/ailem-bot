# CLAUDE.md - Ailem Bot Complete Project Guide

## Project Overview

**Ailem** is a full-featured Telegram Mini App e-commerce platform for selling home textiles (bedsheets, pillows, curtains, towels) in Uzbekistan. It features comprehensive customer shopping, admin management, POS/cashier functionality, and advanced engagement features.

- **Version**: 1.0.22
- **Primary Language**: Uzbek (Cyrillic)
- **Platform**: Telegram Mini App
- **Target Market**: Uzbekistan (UZS currency)
- **Domain**: www.ailem.uz

## Tech Stack

- **Frontend**: React 18.3.1 with Vite 5.4.20 (vanilla JavaScript, no TypeScript)
- **Styling**: Tailwind CSS 3.4.3 with custom brand colors
- **Icons**: Lucide React 0.344.0
- **State Management**: React Context API (7 contexts)
- **Backend**: Supabase (PostgreSQL + Storage + Realtime)
- **Payment Gateways**: Payme (active), Click.uz (ready but disabled)
- **Platform SDK**: Telegram Mini Apps SDK
- **Deployment**: Vercel
- **Text Editor**: React Quill 2.0.0
- **Barcode Scanning**: html5-qrcode 2.3.8
- **Testing**: Vitest with @testing-library/react

## Quick Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests with Vitest
npm run test:coverage # Test coverage report
```

## Project Structure

```
src/
├── components/
│   ├── admin/
│   │   ├── sections/      # 12 admin panel sections
│   │   └── shared/        # Shared admin components (ErrorBoundary, APlusEditor)
│   ├── cashier/           # POS system with barcode scanning
│   ├── layout/            # Header, BottomNav
│   ├── pages/             # 17 customer-facing pages
│   ├── product/           # ProductCard, ProductDetails, APlusContent
│   └── common/            # Carousel, ImageModal, CategoryFilter, etc.
├── context/               # 7 React Contexts for state management
├── hooks/                 # 6 custom hooks
├── services/              # API modules + Telegram + Payment gateways
├── utils/                 # 15+ utility modules
├── locales/               # i18n translations (Uzbek)
├── lib/                   # Supabase client configuration
└── data/                  # Static data and constants
```

## Customer-Facing Pages (17 pages)

### Shopping Experience
1. **HomePage** - Hero banners, countdown timer, category grid, featured products
2. **ShopPage** - Full product catalog with search, filters (category/material/color/size), sorting
3. **ProductPage** - Product details, variants, reviews, related products, A+ content
4. **CartPage** - Shopping cart with volume pricing indicators, quantity management
5. **FavoritesPage** - Saved products with quick add-to-cart

### Checkout Flow
6. **CheckoutPage** - Customer info, delivery method selection (Yandex/couriers), bonus points application
7. **PaymentPage** - Payment method selection (Payme primary), order creation
8. **PaymentStatusPage** - Payment verification with polling, success/failure handling

### Account Management
9. **AccountPage** / **ProfilePage** - User profile, bonus points, menu navigation
10. **OrderHistoryPage** - All user orders with status tracking
11. **OrderDetailsPage** - Complete order information and tracking
12. **ReferralsPage** - Referral link sharing, commission tracking, statistics

### Reviews
13. **MyReviewsPage** - Pending and approved reviews (tabs)
14. **WriteReviewPage** - Star rating, comment, image upload (up to 5)

### Other
15. **HomePage-test** - Testing variant

## Admin Panel Sections (12 sections)

Desktop-only admin interface with comprehensive management tools:

1. **DashboardSection** - Quick stats, revenue, pending orders, recent activity
2. **ProductsSection** - Full CRUD, variants, volume pricing, A+ content, barcode, CSV export
3. **OrdersSection** - Order approval, status updates, bulk operations, label/slip printing, CSV export
4. **ReviewsSection** - Approve/delete reviews, filter by status, CSV export
5. **UsersSection** - User search, role management (customer/cashier), audit logging
6. **WalkInCustomersSection** - POS customer records, search, SMS campaign export
7. **AnalyticsSection** - Revenue metrics, charts, order breakdown, growth trends
8. **StockRequestsSection** - Track back-in-stock requests, notify users
9. **BonusSettingsSection** - Configure referral commission % and purchase bonus %
10. **InventorySettingsSection** - Low stock threshold, inventory alerts
11. **AuditLogsSection** - Complete action audit trail with filtering and pagination
12. **SettingsSection** - General settings (placeholder)

Plus inline sections in DesktopAdminPanel:
- **Categories Management** - CRUD, reorder, visibility toggle, image upload
- **Promotions** - Banner management, countdown timer configuration
- **Pickup Points** - Delivery locations and courier management
- **Shipping Rates** - Courier pricing by region and weight

## 7 React Contexts

### Core Contexts
1. **UserContext** (`UserContext.jsx`)
   - User profile data (name, phone, avatar, role)
   - Favorites management (add/remove, persistent)
   - Bonus points tracking
   - Referral code and referral count
   - Cart integration
   - Local storage caching

2. **CartContext** (`CartContext.jsx`)
   - Shopping cart with variant support (color + size)
   - Quantity management with stock validation
   - Volume pricing calculations
   - Persistent storage (localStorage)
   - Clear cart, remove items
   - Cart total calculations

3. **AdminContext** (`AdminContext.jsx`)
   - Products, categories, orders, users, reviews state
   - CRUD operations for all entities
   - Category reordering with localStorage persistence
   - Category visibility toggle
   - Order approval/rejection with inventory management
   - Review approval workflow
   - Bonus points and referral commission handling

### UI Contexts
4. **ToastContext** (`ToastContext.jsx`)
   - Toast notifications (success, error, warning, info)
   - Auto-dismiss with configurable duration
   - Queue management

5. **ConfirmContext** (`ConfirmContext.jsx`)
   - Confirmation dialogs with custom titles/messages
   - Promise-based API for async confirmation
   - Customizable button labels
   - Danger mode for destructive actions

### Configuration Contexts
6. **PickupPointsContext** (`PickupPointsContext.jsx`)
   - Delivery locations (pickup points)
   - Courier information
   - CRUD operations for pickup points
   - Filtering by active status

7. **ShippingRatesContext** (`ShippingRatesContext.jsx`)
   - Shipping cost calculations by courier, region, weight
   - CRUD operations for shipping rates
   - Price lookup by parameters

## 6 Custom Hooks

1. **useProducts** - Product filtering, sorting, search, featured products
2. **useCart** - Cart operations (add, remove, update quantity)
3. **useOrders** - User order retrieval and filtering by status
4. **useAdminMode** - Admin permission checks and role validation
5. **useBackButton** - Telegram back button integration and handlers
6. **useMainButton** - Telegram main button (payment/checkout button)

## Database Schema

### Core Tables

**users**
```sql
id UUID PRIMARY KEY
telegram_id BIGINT UNIQUE
name TEXT NOT NULL
phone TEXT
email TEXT
username TEXT
photo_url TEXT
bonus_points INTEGER DEFAULT 0
referral_code TEXT UNIQUE NOT NULL
referred_by TEXT
referrals INTEGER DEFAULT 0
favorites TEXT[] DEFAULT '{}'
total_orders INTEGER DEFAULT 0
role TEXT DEFAULT 'customer'  -- 'customer' or 'cashier'
created_at TIMESTAMP
updated_at TIMESTAMP
```

**products**
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT
price NUMERIC(10,2) NOT NULL
original_price NUMERIC(10,2)  -- For sale pricing
category_id UUID REFERENCES categories(id)
category_name TEXT NOT NULL
image TEXT NOT NULL  -- Main image URL
images TEXT[] DEFAULT '{}'  -- Additional images
stock INTEGER DEFAULT 0
weight NUMERIC(10,2)  -- For shipping calculations
badge TEXT  -- 'NEW', 'SALE', 'LIMITED', etc.
material TEXT
colors TEXT[] DEFAULT '{}'
sizes TEXT[] DEFAULT '{}'
tags TEXT[] DEFAULT '{}'  -- For search
barcode TEXT  -- For POS scanning
variants JSONB DEFAULT '[]'  -- [{color, size, stock, price, image, sku, barcode}]
volume_pricing JSONB  -- [{min_qty, max_qty, price}]
a_plus_content JSONB  -- Rich content modules
rating NUMERIC(3,2) DEFAULT 0
review_count INTEGER DEFAULT 0
created_at TIMESTAMP
updated_at TIMESTAMP
```

**orders**
```sql
id UUID PRIMARY KEY
order_number TEXT UNIQUE  -- Human-readable order ID
user_id UUID REFERENCES users(id)
user_telegram_id TEXT
user_name TEXT NOT NULL
user_phone TEXT NOT NULL
delivery_info JSONB NOT NULL  -- {address, method, courier, notes}
courier TEXT
status TEXT DEFAULT 'pending'  -- pending, approved, shipped, delivered, rejected
subtotal NUMERIC(10,2) NOT NULL
delivery_fee NUMERIC(10,2) NOT NULL
bonus_discount NUMERIC(10,2) DEFAULT 0
bonus_points_used INTEGER DEFAULT 0
total NUMERIC(10,2) NOT NULL
payment_screenshot TEXT  -- For manual verification
payment_method TEXT  -- 'payme', 'click', 'cash'
items JSONB NOT NULL  -- [{id, name, price, quantity, selectedColor, selectedSize, image}]
date TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

**reviews**
```sql
id UUID PRIMARY KEY
product_id UUID REFERENCES products(id) ON DELETE CASCADE
order_id UUID REFERENCES orders(id)
user_id UUID REFERENCES users(id)
user_name TEXT NOT NULL
rating INTEGER CHECK (rating >= 1 AND rating <= 5)
comment TEXT
images TEXT[] DEFAULT '{}'  -- Review images
verified BOOLEAN DEFAULT false  -- Verified purchase
approved BOOLEAN DEFAULT false  -- Admin approval
created_at TIMESTAMP
updated_at TIMESTAMP
```

**categories**
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
image TEXT NOT NULL
visible BOOLEAN DEFAULT true  -- Show/hide from customers
created_at TIMESTAMP
```

**stock_notifications** (for back-in-stock alerts)
```sql
id UUID PRIMARY KEY
product_id UUID REFERENCES products(id)
user_id UUID REFERENCES users(id)
user_telegram_id TEXT
variant_color TEXT
variant_size TEXT
notified BOOLEAN DEFAULT false
created_at TIMESTAMP
```

**walk_in_customers** (for POS system)
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
phone TEXT UNIQUE
notes TEXT
total_orders INTEGER DEFAULT 0
total_spent NUMERIC(10,2) DEFAULT 0
created_at TIMESTAMP
updated_at TIMESTAMP
```

**pickup_points**
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
address TEXT NOT NULL
phone TEXT
working_hours TEXT
latitude NUMERIC(10,8)
longitude NUMERIC(11,8)
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP
updated_at TIMESTAMP
```

**shipping_rates**
```sql
id UUID PRIMARY KEY
courier TEXT NOT NULL
region TEXT NOT NULL
min_weight NUMERIC(10,2)
max_weight NUMERIC(10,2)
price NUMERIC(10,2) NOT NULL
created_at TIMESTAMP
```

**audit_logs**
```sql
id UUID PRIMARY KEY
action TEXT NOT NULL  -- 'create', 'update', 'delete', 'approve', etc.
entity_type TEXT NOT NULL  -- 'product', 'order', 'user', etc.
entity_id TEXT
admin_id TEXT NOT NULL
admin_email TEXT
old_data JSONB
new_data JSONB
metadata JSONB
created_at TIMESTAMP
```

**settings** (key-value configuration)
```sql
key TEXT PRIMARY KEY
value JSONB NOT NULL
updated_at TIMESTAMP
```

## API Modules (src/services/api.js)

### categoriesAPI
- `getAll()` - Fetch all categories
- `create(category)` - Create new category
- `update(id, updates)` - Update category
- `delete(id)` - Delete category
- `toggleVisibility(id, visible)` - Show/hide category from customers

### productsAPI
- `getAll()` - Fetch all products with reviews
- `getById(id)` - Get single product details
- `create(product)` - Create new product
- `update(id, updates)` - Update product
- `delete(id)` - Delete product
- `findByBarcode(barcode)` - POS barcode lookup (supports variant barcodes)

### ordersAPI
- `getAll()` - Fetch all orders
- `getById(id)` - Get single order
- `getByUser(userId)` - Get user's order history
- `create(order)` - Create new order
- `updateStatus(id, status)` - Update order status
- `delete(id)` - Delete order

### reviewsAPI
- `getAll()` - Fetch all reviews
- `getByProduct(productId)` - Get product reviews
- `create(review)` - Submit new review
- `approve(id)` - Approve review (admin)
- `delete(id)` - Delete review

### usersAPI
- `getAll()` - Fetch all users (admin)
- `getByTelegramId(telegramId)` - Get user by Telegram ID
- `create(user)` - Create new user
- `update(id, updates)` - Update user profile
- `updateBonusPoints(id, points)` - Add/subtract bonus points
- `updateRole(id, role, adminEmail)` - Change user role (logs audit trail)

### settingsAPI
- `getSettings()` - Fetch all settings (banners, timers, bonus config)
- `updateSettings(settings)` - Update settings
- `getBonusSettings()` - Get referral & purchase bonus percentages
- `updateBonusSettings(settings)` - Update bonus configuration
- `getInventorySettings()` - Get low stock threshold
- `updateInventorySettings(settings)` - Update inventory alerts

### storageAPI
- `uploadProductImage(file)` - Upload to Supabase Storage
- `deleteFile(path)` - Delete file from storage

### walkInCustomersAPI
- `getAll()` - Fetch all POS customers
- `create(customer)` - Create walk-in customer
- `update(id, updates)` - Update customer
- `delete(id)` - Delete customer

### pickupPointsAPI
- `getAll()` - Fetch all pickup points
- `create(point)` - Create pickup point
- `update(id, updates)` - Update point
- `delete(id)` - Delete point

### shippingRatesAPI
- `getAll()` - Fetch all shipping rates
- `create(rate)` - Create shipping rate
- `update(id, updates)` - Update rate
- `delete(id)` - Delete rate
- `getRate(courier, region, weight)` - Calculate shipping cost

### auditLogsAPI
- `getAll(filters)` - Fetch audit logs with pagination
- `create(log)` - Create audit log entry

### stockNotificationsAPI
- `create(notification)` - Register back-in-stock request
- `getByProduct(productId)` - Get all requests for a product
- `markNotified(ids)` - Mark notifications as sent

## Key Features

### 1. Product Management
- **Variants System**: Color + Size combinations with independent stock/price/images
- **Volume Pricing**: Tier-based bulk discounts with intelligent multi-product grouping
- **A+ Content**: 9 rich content module types for enhanced product descriptions
- **Barcodes**: Product and variant barcode support for POS
- **Stock Tracking**: Real-time inventory with low-stock alerts
- **Tags**: Searchable keywords for product discovery
- **Images**: Multi-image support with main image designation

#### Volume Pricing System (Bulk Ordering)

**Overview**: Tier-based discount system that rewards bulk purchases with lower per-unit prices.

**How It Works**:
1. **Tier Structure**: Products can have multiple price tiers defined by quantity ranges
   - Each tier has: `min_qty` (minimum), `max_qty` (maximum or null for unlimited), `price` (per unit)
   - Example: 1-9 units = 100,000 so'm, 10-49 units = 90,000 so'm, 50+ units = 80,000 so'm

2. **Tier Grouping** (Advanced Feature):
   - Products with the **same tier threshold** are grouped together
   - Combined quantities from multiple products count toward the discount
   - Example: Product A (2 units) + Product B (8 units) = 10 combined → both get 10+ tier discount

3. **Automatic Calculation**:
   - Cart automatically applies the best price based on total quantity
   - Works across multiple products with matching tier thresholds
   - Real-time updates as quantities change

**Admin Configuration**:
- Set up in ProductsSection → Volume Pricing editor
- Add multiple tiers with min/max quantities and prices
- Visual preview shows pricing structure
- Sorted by min_qty for proper tier hierarchy

**Customer Experience**:
- **Progress Indicator**: Shows how many more items needed for next discount tier
  - "10+ chegirma uchun: 8/10 dona" (8 of 10 needed for discount)
  - "Yana 2 dona qo'shing" (Add 2 more items)
- **Group Info**: When multiple products combine: "(3 xil mahsulot birlashtirilgan)"
- **Savings Display**: Green badge shows discount amount per item and total savings
- **Badge on Product**: Shows "2+", "3+", "5+" etc. badges on product cards

**Implementation** (`src/utils/volumePricing.js`):
- `getTierThreshold()` - Get threshold for grouping products
- `getVolumePricedUnit()` - Calculate effective price per unit
- `groupItemsByTier()` - Group cart items by matching thresholds
- `getTierGroupQuantity()` - Calculate combined quantity
- `calculateItemTotalWithTierGrouping()` - Final price with grouping
- `getTierGroupInfo()` - UI display information (progress, remaining, qualifies)

**Database Storage**:
```javascript
// products.volume_pricing (JSONB)
[
  { min_qty: 1, max_qty: 9, price: 100000 },
  { min_qty: 10, max_qty: 49, price: 90000 },
  { min_qty: 50, max_qty: null, price: 80000 }  // null = unlimited
]
```

**Business Logic**:
- Encourages bulk purchases without complex coupon codes
- Increases average order value
- Cross-product discounts incentivize buying variety
- Transparent pricing - customers see savings in real-time

### 2. Shopping Cart
- **Variant-Aware**: Supports color + size selections
- **Volume Discounts**: Shows progress toward tier discounts
- **Persistent**: LocalStorage with Telegram Desktop fallback
- **Stock Validation**: Prevents over-purchasing
- **Bonus Points**: Apply up to 20% of order value

### 3. Order Management
- **Order Flow**: pending → approved → shipped → delivered
- **Inventory Integration**: Auto-deduct on approval, restore on rejection
- **Bulk Operations**: Multi-order approval with progress tracking
- **Printing**: Shipping labels and packing slips (single/batch)
- **Notifications**: Telegram notifications for status changes
- **CSV Export**: Orders and line items for reporting

### 4. Payment Integration

#### Payme (Active - Primary)
- Integrated via Telegram Mini App payment button
- Amount conversion: UZS → tiyin (×100)
- Base64-encoded payment parameters
- Test mode support
- Automatic order approval via webhook
- Return URL with callback handling

#### Click.uz (Ready - Disabled)
- Payment link generation implemented
- Backend handlers complete
- UI commented out (lines 376-394, 418+ in PaymentPage.jsx)
- To enable: Uncomment payment button and info sections
- Amount in UZS (not tiyin)

#### Manual Payment Verification
- Customer uploads screenshot
- Admin reviews and approves
- Located in Orders section of admin panel

### 5. Bonus & Rewards System
- **Purchase Bonus**: Configurable percentage of order value
- **Referral Commission**: Configurable percentage when referee makes purchase
- **Redemption Limit**: Up to 20% of order total
- **Automatic Processing**: Points awarded on order approval
- **Referral Links**: Unique codes with deep linking
- **Telegram Sharing**: Built-in share functionality

### 6. Review System
- **Verified Purchase**: Only delivered orders can be reviewed
- **Star Ratings**: 1-5 stars with interactive selection
- **Images**: Up to 5 images per review
- **Admin Approval**: Reviews require approval before public display
- **Product Integration**: Reviews appear on product pages
- **Export**: CSV export for analysis

### 7. POS/Cashier Mode
- **Barcode Scanning**: Camera-based with html5-qrcode
- **Manual Entry**: Fallback for barcode input
- **Walk-In Customers**: Separate customer database
- **Cash Payments**: No gateway dependency
- **Daily Statistics**: Total orders and revenue per cashier
- **Receipt Printing**: Order receipt generation
- **Inventory Integration**: Stock deduction on sale

### 8. Category Management
- **Visibility Toggle**: Show/hide from customers while keeping products manageable
- **Reordering**: Drag-and-drop category sequence (admin)
- **Image Upload**: Category images to Supabase Storage
- **Filtering**: Customer views auto-filter hidden categories

### 9. Shipping Integration
- **Yandex Delivery**: Tashkent only (11 districts)
- **Multiple Couriers**: Configurable courier list
- **Regional Rates**: Courier pricing by region and weight
- **Pickup Points**: Self-pickup locations
- **Postpaid Option**: Pay on delivery support
- **Cost Calculation**: Automatic based on courier/region/weight

### 10. Analytics & Reporting
- **Revenue Metrics**: Total, monthly, weekly, average order value
- **Growth Tracking**: Month-over-month revenue comparison
- **Order Breakdown**: By status (pending, approved, shipped, delivered)
- **7-Day Chart**: Visual revenue trends
- **CSV Exports**: Products, orders, reviews, users, walk-in customers
- **Audit Trail**: Complete action logging with filtering

### 11. Telegram Integration
- **Mini App SDK**: Full Telegram WebApp API integration
- **MainButton**: Payment and checkout flows
- **BackButton**: Navigation handling
- **WebView**: Payment gateway integration
- **Share**: Referral link sharing
- **Notifications**: Order status updates via bot
- **Deep Linking**: Referral code support in URLs
- **User Context**: Auto-login from Telegram data

### 12. A+ Content System (Rich Product Descriptions)

#### 9 Module Types
1. **hero** - Full-width banner with overlay text
2. **image_text** - Image with side-by-side text
3. **features** - Grid of feature icons and descriptions
4. **gallery** - 2-column image grid
5. **image_sequence** - Seamless vertical infographics (for long product stories)
6. **video** - YouTube/Vimeo embed
7. **text** - Rich text/HTML block
8. **comparison** - Comparison table (vs competitors)
9. **accordion** - Collapsible FAQ sections

#### Usage
- Stored as JSONB in `a_plus_content` column
- Admin editor: `src/components/admin/shared/APlusEditor.jsx`
- Customer viewer: `src/components/product/APlusContent.jsx`
- Displayed below product details
- Image recommendations: 1000-1200px width, <500KB, JPG for photos, PNG for graphics

## Utility Modules (src/utils/)

1. **helpers.js** - Price formatting, date formatting, localStorage wrapper (Telegram Desktop compatible)
2. **translation-fallback.js** - i18n system with Uzbek translations
3. **validation.js** - Input validation for products, categories, orders
4. **csvExport.js** - Export functions for all data types
5. **shippingLabel.js** - Print shipping labels (single/batch)
6. **packingSlip.js** - Print packing slips
7. **variants.js** - Product variant management (generate, find, update)
8. **volumePricing.js** - Tier-based volume discount calculations
9. **analytics.js** - Revenue calculations and trend analysis
10. **telegram.js** - Telegram SDK wrapper and notifications
11. **telegram-fix.js** - Telegram Desktop workarounds
12. **apiCache.js** - API response caching with TTL
13. **recommendations.js** - Product recommendation engine
14. **locationTranslations.js** - Uzbek location names
15. **checkUploadPermissions.js** - Supabase upload diagnostics

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Pages | PascalCase + "Page" | `HomePage.jsx`, `CartPage.jsx` |
| Components | PascalCase | `ProductCard.jsx`, `CategoryFilter.jsx` |
| Contexts | PascalCase + "Context" | `UserContext.jsx`, `CartContext.jsx` |
| Hooks | camelCase with "use" prefix | `useProducts.js`, `useCart.js` |
| Utilities | camelCase | `helpers.js`, `variants.js` |
| API modules | camelCase + "API" suffix | `productsAPI`, `ordersAPI` |
| DB fields | snake_case | `user_id`, `created_at`, `original_price` |
| App fields | camelCase | `userId`, `createdAt`, `originalPrice` |
| Translation keys | dot.notation | `'cart.title'`, `'payment.payme'` |

**Important**: API layer automatically transforms between database snake_case and app camelCase.

## Design System

### Typography

**Font Family**: Plus Jakarta Sans (Google Fonts)
- **Weights**: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- **Source**: Google Fonts CDN (preconnected for performance)
- **Fallback**: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif
- **Configuration**: `tailwind.config.js` - fontFamily.sans
- **Import**: `index.html` - Google Fonts link with font-display: swap

### Custom Tailwind Colors

```javascript
colors: {
  primary: '#111827',   // Dark gray - main text
  accent: '#ed2224',    // Ailem Red - brand color (buttons, highlights)
  success: '#10B981',   // Green - success states
  warning: '#F59E0B',   // Yellow - warnings
  error: '#EF4444',     // Red - errors
}
```

### Layout Constraints
- **Max Width**: 448px (mobile viewport for Telegram Mini App)
- **Mobile-First**: All designs optimized for mobile screens

## Common Code Patterns

### Page Component Template
```javascript
import { useContext } from 'react';
import { t } from '../../utils/translation-fallback';
import { UserContext } from '../../context/UserContext';

const MyPage = ({ onNavigate }) => {
  const { user } = useContext(UserContext);

  return (
    <div className="pb-20 pt-16 bg-gray-50 min-h-screen">
      <h1>{t('page.title')}</h1>
      {/* Content */}
    </div>
  );
};

export default MyPage;
```

### API Usage
```javascript
import { productsAPI, ordersAPI } from '../services/api';

// Get all
const products = await productsAPI.getAll();

// Create
const newProduct = await productsAPI.create({ name, price, category, ... });

// Update
await productsAPI.update(productId, { name: 'Updated Name' });

// Delete
await productsAPI.delete(productId);
```

### Toast Notifications
```javascript
import { useToast } from '../../context/ToastContext';

const toast = useToast();
toast.success('Order created successfully!');
toast.error('Failed to save changes');
toast.warning('Low stock warning');
toast.info('Product will be available soon');
```

### Confirmation Dialogs
```javascript
import { useConfirm } from '../../context/ConfirmContext';

const confirm = useConfirm();
const confirmed = await confirm({
  title: 'Delete Product?',
  message: 'This action cannot be undone.',
  type: 'danger',
  confirmText: 'Delete',
  cancelText: 'Cancel'
});

if (confirmed) {
  // Proceed with deletion
}
```

### Translation Usage
```javascript
import { t } from '../../utils/translation-fallback';

// Simple translation
<h1>{t('cart.title')}</h1>

// With parameters
<p>{t('shop.productsFound', { count: filteredProducts.length })}</p>

// Conditional text
{isLoading ? t('common.loading') : t('common.save')}
```

### Safe localStorage
```javascript
import { loadFromLocalStorage, saveToLocalStorage, removeFromLocalStorage } from '../utils/helpers';

// Save
saveToLocalStorage('cartData', cartItems);

// Load
const cart = loadFromLocalStorage('cartData') || [];

// Remove
removeFromLocalStorage('cartData');
```

## Console Logging Style

Use emoji prefixes for visual clarity:
- `🔍` - Searching/loading data
- `✅` - Success operations
- `❌` - Errors
- `⚠️` - Warnings
- `🔄` - Refreshing/updating
- `💾` - Saving data
- `📥` - Receiving data
- `💳` - Payment operations
- `📦` - Order processing

Example:
```javascript
console.log('✅ Product created successfully:', newProduct);
console.error('❌ Failed to update order:', error);
console.log('💳 Processing Payme payment...', { orderId, amount });
```

## Environment Variables

```bash
# Supabase Backend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Telegram Bot (for notifications)
VITE_TELEGRAM_BOT_TOKEN=bot-token-from-botfather

# Payme Payment Gateway
VITE_PAYME_MERCHANT_ID=merchant-id
VITE_PAYME_TEST_MODE=true  # or false for production

# Click Payment Gateway
VITE_CLICK_MERCHANT_ID=merchant-id
VITE_CLICK_SERVICE_ID=service-id
VITE_CLICK_TEST_MODE=true  # or false for production

# Deployment
VITE_APP_URL=https://www.ailem.uz
```

## Testing

```bash
npm run test           # Run all tests with Vitest
npm run test:coverage  # Generate coverage report
npm run test:ui        # Open Vitest UI
```

Tests use:
- **Vitest** for test runner
- **@testing-library/react** for component testing
- **@testing-library/user-event** for interaction simulation
- **@testing-library/jest-dom** for custom matchers

## Deployment

### Build Process
```bash
npm run build    # Creates production build in dist/
npm run preview  # Preview production build locally
```

### Platform
- **Hosting**: Vercel
- **Domain**: www.ailem.uz
- **Region**: Optimized for Uzbekistan
- **Protocol**: HTTPS required for Telegram Mini Apps

### Pre-Deployment Checklist
1. Update version in `package.json`
2. Test all payment flows (Payme/manual)
3. Verify Supabase migrations are applied
4. Check environment variables in Vercel
5. Test Telegram Mini App integration
6. Verify barcode scanner on mobile devices
7. Test admin panel access controls
8. Review audit logs for security

## Performance Optimizations

1. **API Caching**: Response caching with TTL in `apiCache.js`
2. **Lazy Loading**: Code splitting for routes
3. **Image Optimization**: `OptimizedImage` component with lazy loading
4. **Debounced Search**: 300ms debounce in ShopPage search
5. **Memoization**: `useMemo` for expensive calculations (filtering, sorting)
6. **Pagination**: Audit logs use 25-item pages
7. **Timeout Protection**: 10-second max wait on all API calls
8. **localStorage Caching**: Settings and categories cached locally

## Security Considerations

1. **localStorage Wrapper**: Detects Telegram Desktop, uses in-memory fallback
2. **Admin Authentication**: `AdminAuth` component protects admin routes
3. **Audit Logging**: All admin actions logged with email/timestamp
4. **Payment Verification**: Status polling before order confirmation
5. **Data Validation**: Server-side validation for all inputs
6. **RLS Policies**: Row-level security in Supabase
7. **API Field Mapping**: Prevents direct database pattern exposure
8. **Role-Based Access**: Customer vs Cashier vs Admin roles

## Known Issues & Limitations

1. **Click Payment**: UI disabled (commented out in PaymentPage.jsx lines 376-394, 418+)
2. **Address Management**: Placeholder in profile (coming soon)
3. **Settings Page**: Placeholder (coming soon)
4. **Help Section**: Placeholder (coming soon)
5. **Edit Reviews**: Placeholder in MyReviewsPage (coming soon)
6. **Telegram Desktop**: localStorage disabled, uses in-memory fallback
7. **Barcode Scanner**: Camera permission required, may not work in all browsers
8. **Payment Webhooks**: Handled server-side (not shown in frontend)

## Migration Files

Location: `supabase-migrations/`

### add-categories-visible.sql
```sql
-- Add visible column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true;
UPDATE categories SET visible = true WHERE visible IS NULL;
```

**When to run**: Before deploying category visibility toggle feature

**How to run**: Copy SQL to Supabase SQL Editor and execute

## Project Statistics

- **Total Files**: 101 JavaScript/React files
- **Page Components**: 17 customer-facing pages
- **Admin Sections**: 12 modular sections
- **Contexts**: 7 for state management
- **Custom Hooks**: 6 specialized hooks
- **Utility Modules**: 15+ helper modules
- **Database Tables**: 12 main tables + 6 supporting tables
- **API Modules**: 11 API services
- **Dependencies**: 11 production, 20+ dev dependencies

## Support & Documentation

### Internal Documentation
- **CLAUDE.md**: This file - complete project guide
- **MEMORY.md**: Project memory for Claude AI assistant
- **README.md**: Public-facing project readme

### External Resources
- **Telegram Mini Apps**: https://core.telegram.org/bots/webapps
- **Supabase Docs**: https://supabase.com/docs
- **Payme Integration**: https://developer.help.paycom.uz/
- **Click.uz API**: https://docs.click.uz/

### Getting Help
- Review error logs in browser console (look for emoji prefixes)
- Check Supabase logs for backend errors
- Verify environment variables are set
- Test in Telegram Mobile App (not just desktop)
- Check audit logs for admin action issues

## Design & UI Notes

- **Mobile-First**: Design optimized for max-width 448px (Telegram WebView)
- **Font**: Plus Jakarta Sans (400-700 weights) from Google Fonts
- **Uzbek Localization**: All UI text in Uzbek (Cyrillic)
- **UZS Currency**: All prices in Uzbek Som (formatted with spaces: 150 000 so'm)
- **Date Format**: DD.MM.YYYY (Uzbek standard)
- **Images**: Stored in Supabase Storage with CDN delivery
- **Rich Text**: React Quill for product descriptions
- **Barcode**: 13-digit EAN/UPC support
- **QR Codes**: html5-qrcode for camera scanning
- **Printing**: Browser print API for labels/slips

---

**Last Updated**: 2026-02-10
**Version**: 1.0.22
**Maintained By**: Ailem Development Team
