# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Ailem is a full-featured e-commerce Telegram Mini App for selling home textile products (bedsheets, pillows, curtains, towels) with an integrated admin panel. Built with React 18, Vite, Tailwind CSS, and Supabase.

## Common Development Commands

### Development Workflow
```bash
# Install dependencies
npm install

# Start development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing
```bash
# Run all tests
npm test

# Watch mode (re-run on changes)
npm run test:watch

# Interactive UI
npm run test:ui

# Coverage report
npm run test:coverage
```

- **Framework**: Vitest + React Testing Library
- **Coverage**: Helper functions (~90%), Payment services (~85%)
- **Test Files**: `src/utils/helpers.test.js`, `src/services/payment.test.js`
- **Documentation**: See `TESTING.md` for complete guide
- Test payment flow using Payme test cards: 8600 0000 0000 0000 (exp: 03/99, SMS: 666666)

### Development Server Configuration
- Default port: 3000
- Ngrok integration configured for Telegram testing
- Host: `spongy-sledlike-narcisa.ngrok-free.dev` (configured in vite.config.js)
- Use ngrok URL when testing Telegram-specific features

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS with custom color scheme (no dark mode)
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Context API (5 nested providers)
- **Storage**: Supabase Storage for images (public/private buckets)
- **Platform**: Telegram Mini Apps (WebApp API)
- **Payment**: Payme Payment Gateway (Uzbekistan)
- **Deployment**: Vercel with serverless API routes

### Core Architecture Patterns

#### Context-Based State Management
The app uses React Context providers in a **strict nested hierarchy** (defined in `main.jsx`):
```
UserProvider (user data, auth, bonus points, referrals)
  └── AdminProvider (admin-only data, analytics)
      └── PickupPointsProvider (courier pickup locations)
          └── ShippingRatesProvider (delivery pricing)
              └── CartProvider (shopping cart with Supabase sync)
                  └── App
```
**Critical**: New state should be added to existing contexts, not new providers.

#### Route Management
- **Navigation**: Hash-based routing (`/#/page`) with custom `navigate()` function in `App.jsx`
- **No React Router**: Custom routing system to avoid Telegram Mini App compatibility issues
- **Page State**: Persisted through `localStorage` with safe wrapper for Telegram Desktop
- **Admin Access**: URL parameter (`?admin=true`) instead of hash for separate admin mode
- **Navigation Function**: `navigate(page, data)` - pass page name and optional data object

#### Data Layer: Supabase API Services
**Critical**: All Supabase operations go through `src/services/api.js` - never call Supabase directly from components.

API modules in `api.js`:
- `usersAPI` - User CRUD, Telegram ID lookup, bonus points, cart sync
- `productsAPI` - Product CRUD with automatic review aggregation
- `ordersAPI` - Order management with Payme transaction tracking
- `reviewsAPI` - Review moderation (admin approval required)
- `storageAPI` - Image uploads to Supabase Storage
- `pickupPointsAPI` - Courier pickup locations management
- `categoriesAPI` - Product category CRUD
- `bannersAPI` - Homepage banner/promotion management
- `settingsAPI` - App settings and configuration

**Field Mapping (DB snake_case ↔ App camelCase)**:
- Products: `category_name` ↔ `category`, `original_price` ↔ `originalPrice`, `review_count` ↔ `reviewCount`
- Orders: `user_id` ↔ `userId`, `bonus_discount` ↔ `bonusDiscount`, `payme_transaction_id` ↔ `paymeTransactionId`
- Users: `bonus_points` ↔ `bonusPoints`, `referral_code` ↔ `referralCode`, `telegram_id` ↔ `telegramId`

#### Storage Strategy
- **localStorage**: Safe wrapper (`loadFromLocalStorage`, `saveToLocalStorage` in `helpers.js`) handles Telegram Desktop restrictions
- **Supabase DB**: PostgreSQL with JSONB fields for variants, cart, and settings
- **Supabase Storage**: 
  - Public bucket: Product images, banners (`product-images/`, `banners/`)
  - Private bucket: Payment screenshots (`payment-screenshots/` with signed URLs)

### Key Components

#### Navigation & Layout
- `App.jsx`: Main application router and admin mode toggle
- `layout/Header.jsx`: Page headers with search functionality
- `layout/BottomNav.jsx`: Bottom navigation (hidden in admin mode)

#### E-commerce Features
- `pages/ShopPage.jsx`: Product browsing with filtering and search
- `pages/ProductPage.jsx`: Product details with variant selection
- `pages/CartPage.jsx`: Shopping cart management
- `pages/CheckoutPage.jsx`: Checkout flow with delivery options
- `pages/PaymentPage.jsx`: Payment screenshot upload

#### Admin System
- `pages/AdminPanel.jsx`: Centralized admin dashboard
- Admin mode toggle available via UI button (no authentication in dev)
- Real-time order management and review moderation

#### Telegram Integration
- `utils/telegram.js`: WebApp API integration and user detection
- Referral system through URL parameters
- Safe fallbacks for development outside Telegram

### Service Layer Architecture
**Location**: `src/services/`

The service layer provides abstraction between components and external services:

#### Core Services
- **`api.js`**: Supabase database operations (main data layer)
  - `categoriesAPI`: Category CRUD operations
  - `productsAPI`: Product CRUD with review aggregation
  - `usersAPI`: User management, bonus points, favorites, cart sync
  - `ordersAPI`: Order management with payment tracking
  - `reviewsAPI`: Review moderation (admin approval required)
  - `storageAPI`: Image uploads to Supabase Storage
  - `pickupPointsAPI`: Courier pickup location management
  - `bannersAPI`: Homepage banner/promotion management
  - `settingsAPI`: App settings and configuration

- **`payme.js`**: Payme payment gateway integration
  - `generatePaymeLink()`: Create payment URL with base64 params
  - `openPaymeInTelegram()`: Open payment in Telegram in-app browser
  - Amount handling: Converts UZS to tiyin (1 UZS = 100 tiyin)

- **`click.js`**: Click payment gateway integration
  - `generateClickLink()`: Create payment URL with query params
  - `openClickInTelegram()`: Open payment in Telegram in-app browser
  - Amount handling: Uses UZS directly (no conversion)
  - Error codes: Exports `CLICK_ERROR_CODES` constants

- **`telegram.js`**: Telegram WebApp API utilities (DEPRECATED - use `utils/telegram.js` instead)
- **`telegramPayments.js`**: Telegram native payments (DEPRECATED - Payme/Click preferred)

**Service Layer Patterns**:
1. **Field Mapping**: Services handle snake_case ↔ camelCase conversion
2. **Error Propagation**: Throw errors for components to handle
3. **Null Safety**: Use `.maybeSingle()` when record might not exist
4. **Helper Methods**: Prefix internal methods with `_` (e.g., `_mapUserFromDB()`)

## Development Guidelines

### Error Handling Patterns

#### ErrorBoundary Component
**Location**: `src/components/ErrorBoundary.jsx`

- Wraps entire app in `main.jsx` to catch React render errors
- Displays user-friendly error page with reload button
- Logs errors to console for debugging
- **Usage**: Already implemented at root level, no additional setup needed

#### API Error Handling
**Pattern used in `src/services/api.js`**:

```javascript
// Supabase errors are thrown, components catch them
const { data, error } = await supabase.from('table').select('*');
if (error) throw error; // Let component handle
return data;
```

**Special error codes**:
- `PGRST116`: Record not found (handle gracefully with null return)
- Example in `usersAPI.getById()`:
  ```javascript
  if (error.code === 'PGRST116') return null; // Not found
  throw error; // Other errors bubble up
  ```

#### Component-Level Error Handling
**Recommended pattern**:

```javascript
try {
  const data = await someAPI.getData();
  // Handle success
} catch (error) {
  console.error('Technical details:', error);
  // Show user-friendly message via Telegram or UI
  showTelegramAlert('Failed to load data. Please try again.');
}
```

**Common error handling locations**:
- Context providers: Handle errors, update error state
- Page components: Display error messages to users
- API services: Throw errors with context

### Critical Telegram Mini App Patterns

#### Native Telegram UI Hooks (ALWAYS use these)
- **BackButton**: Use `useBackButton(callback)` hook for navigation back
- **MainButton**: Use `useMainButton(text, callback, options)` for primary CTAs
- **Null Safety**: Always check `window.Telegram?.WebApp` before accessing any Telegram API
- **Environment Detection**: Use `isInTelegram()` from `utils/telegram.js`
- **Testing**: Use ngrok URL from `vite.config.js` when testing Telegram-specific features

#### localStorage Wrapper (Telegram Desktop Compatibility)
- **Never use `localStorage` directly** - use wrapper functions from `utils/helpers.js`:
  - `loadFromLocalStorage(key, defaultValue)` - Safe read with fallback
  - `saveToLocalStorage(key, value)` - Safe write that handles errors
  - `removeFromLocalStorage(key)` - Safe delete
- Telegram Desktop restricts `localStorage` - wrapper prevents crashes

### State Management Rules
- **Do not create new Context providers** - add to existing ones
- Persist critical state (cart, user) to both localStorage AND Supabase
- Always handle loading/error states in components
- Use `useContext` to access contexts, not prop drilling

### API Integration Rules
- **Never call Supabase directly from components** - use `api.js` services
- Field mapping (snake_case ↔ camelCase) handled in API layer only
- Error handling: Show user-friendly messages, log technical details
- Demo user fallback: Some operations work offline for testing

### Styling Conventions
- Tailwind utility classes (custom theme in `tailwind.config.js`)
- Mobile-first responsive design (Telegram is mobile-first)
- **No dark mode** - uses Telegram theme colors where applicable
- Custom CSS in `src/index.css` for global styles only

### Image Handling
- Upload via `storageAPI.uploadImage(file, path)` in `api.js`
- Product images: `product-images/` folder in public bucket
- Payment screenshots: `payment-screenshots/` in private bucket
- Get URLs via `storageAPI.getPublicUrl()` or `storageAPI.getSignedUrl()`
- **No CDN or optimization** - Supabase Storage serves directly

## Environment Configuration

### Required Environment Variables
**Location**: `.env` (local) or Vercel dashboard (production)

```bash
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Telegram Bot (Required for Telegram features)
VITE_TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Payme Payment Gateway (Required for payments)
VITE_PAYME_MERCHANT_ID=68ad7cf18f3347fe865948ca
VITE_PAYME_TEST_MODE=true  # false for production
PAYME_KEY=ojWN@Ua290xxu%u0cdGP5U9JA?rMr&2b#oN3  # Test key, change for production

# Click Payment Gateway (Optional alternative to Payme)
VITE_CLICK_MERCHANT_ID=your_click_merchant_id
VITE_CLICK_SERVICE_ID=your_click_service_id
VITE_CLICK_TEST_MODE=false
CLICK_SERVICE_ID=your_click_service_id  # Backend only (webhook validation)
CLICK_SECRET_KEY=your_click_secret_key  # Backend only (webhook validation)
```

**See `.env.example` for template**

### Local Development Mode
- **Demo User**: Auto-created when not in Telegram (ID: 999999)
- **Admin Toggle**: Button in top-right corner (dev only - no auth required)
- **localStorage**: Works normally in browser, uses safe wrapper
- **Telegram Features**: Test with ngrok URL or will gracefully fallback

## Critical Business Logic

### Payme Payment Gateway
**Implementation**: `src/services/payme.js` + `api/payme-webhook.js`

1. User completes checkout → order saved as `pending`
2. Payment link generated: `https://checkout.test.paycom.uz/[base64_params]` (test mode)
3. Link opens in Telegram in-app browser
4. User pays with card (test: 8600 0000 0000 0000, exp: 03/99, SMS: 666666)
5. Payme webhook called → `PerformTransaction` method auto-approves order
6. Order status: `pending` → `approved`, user gets bonus points

**Critical Configuration**:
- Webhook URL: `https://www.ailem.uz/api/payme-webhook` (must be set in Payme cabinet)
- Test mode: `VITE_PAYME_TEST_MODE=true` (uses test.paycom.uz)
- Merchant auth: Base64-encoded `Paycom:[PAYME_KEY]` in Authorization header

### Click Payment Gateway
**Implementation**: `src/services/click.js` + `api/click-webhook.js`

1. User completes checkout → order saved as `pending` with `click_order_id`
2. Payment link generated: `https://my.click.uz/services/pay?service_id=XXX&amount=YYY...`
3. Link opens in Telegram in-app browser
4. Click webhook receives PREPARE request → validates order exists and amount matches
5. User pays with card (test: 8600 1234 5678 9012, exp: 03/99, SMS: 666666)
6. Click webhook receives COMPLETE request → auto-approves order
7. Order status: `pending` → `approved`, user gets bonus points

**Critical Configuration**:
- Webhook URL: `https://www.ailem.uz/api/click-webhook` (must be set in Click merchant cabinet)
- Amount validation: Click sends amounts in UZS (not tiyin like Payme)
- Response requirement: COMPLETE response must include `click_paydoc_id` field
- Two-phase protocol: PREPARE validates, COMPLETE confirms

**Error Codes** (defined in `src/services/click.js`):
- `0`: Success
- `-1`: Signature verification failed
- `-2`: Invalid amount
- `-3`: Action not found
- `-4`: Already paid
- `-5`: Order/user not found
- `-9`: Internal error

### Bonus Points System
**Location**: `src/utils/helpers.js` - `calculateBonusPoints()`, `calculateMaxBonusUsage()`

- **Earning**: 10% of order total (configurable) - awarded on order approval
- **Value**: 1 point = 10 so'm (0.10 in calculations)
- **Usage**: Max 20% of order value can be paid with points
- **Referrals**: 100 points per successful referral + percentage of referred orders

### Referral System
**Implementation**: `src/utils/telegram.js` - `getReferralCode()` + UserContext

- Each user gets unique code (6 chars, format: `REF-XXXXXX`)
- Referral links: `https://t.me/ailemuz_bot?start=REF-XXXXXX`
- Referrer earns commission on ALL referee orders (percentage configurable)
- Processed on app init via URL param `tgWebAppStartParam`

## Deployment

### Production Deployment (Vercel)
**Live URL**: https://www.ailem.uz (auto-deploys from GitHub main branch)

**Configuration** (`vercel.json`):
- Build: `npm run build` → outputs to `dist/`
- API routes: `/api/*` maps to serverless functions in `/api` folder
- SPA routing: All other routes serve `index.html`

**Environment Variables**: Set in Vercel dashboard (see Environment Configuration section)

### Telegram Mini App Setup
1. Create bot via [@BotFather](https://t.me/botfather)
2. Set Mini App URL: `/newapp` or `/editapp` → enter production URL
3. Bot: [@ailemuz_bot](https://t.me/ailemuz_bot)

### Testing Telegram Features Locally
1. Start dev server: `npm run dev`
2. Expose via ngrok: URL already configured in `vite.config.js`
3. Set ngrok URL as Mini App URL in BotFather (temporarily)
4. Open bot in Telegram → launches your local dev server

## Important Implementation Details

### Database Schema
**Primary Schema**: `supabase-schema.sql` (run in Supabase SQL Editor)

#### Key Tables

**users**:
- `id` (UUID, PK) - Primary identifier
- `telegram_id` (BIGINT, UNIQUE) - Telegram user ID
- `bonus_points` (INTEGER) - Reward points balance
- `referral_code` (TEXT, UNIQUE, NOT NULL) - User's referral code
- `referred_by` (TEXT) - Referrer's code
- `favorites` (TEXT[]) - Array of product IDs
- `cart` (JSONB) - Shopping cart with cross-device sync

**products**:
- `id` (UUID, PK)
- `category_name` (TEXT, NOT NULL) - Denormalized category
- `price`, `original_price` (NUMERIC(10,2))
- `variants` (JSONB) - Product variations with nested images
- `images` (TEXT[]) - Product image URLs
- `rating` (NUMERIC(3,2)), `review_count` (INTEGER) - Auto-calculated
- `colors`, `sizes`, `tags` (TEXT[])

**orders**:
- `id` (UUID, PK) - Database UUID
- `order_number` (TEXT, UNIQUE) - Display ID (format: `ORD-{timestamp}-{random}`)
- `user_id` (UUID, FK → users)
- `user_telegram_id` (TEXT) - For Telegram notifications
- `delivery_info` (JSONB) - Address, phone, name, city
- `items` (JSONB) - Cart snapshot at checkout
- `status` (TEXT) - CHECK constraint: pending, approved, shipped, delivered, rejected
- `payme_transaction_id`, `payme_transaction_time` - Payme payment tracking
- `click_order_id`, `click_trans_id` - Click payment tracking

**reviews**:
- `id` (UUID, PK)
- `product_id` (UUID, FK → products, CASCADE)
- `rating` (INTEGER) - CHECK constraint: 1-5
- `approved` (BOOLEAN, DEFAULT false) - Admin moderation required
- `images` (TEXT[]) - Review photos

#### Database Features
- **Indexes**: GIN indexes on arrays (`tags`, `images`), B-tree on common queries
- **Triggers**: Auto-update `updated_at` timestamp on all tables
- **RLS**: Row Level Security enabled (service role has full access)
- **Field Types**:
  - JSONB: Complex nested data (variants, delivery_info, items, cart)
  - TEXT[]: Simple arrays (images, colors, sizes, tags, favorites)
  - NUMERIC(10,2): Currency values (precise decimal arithmetic)
  - BIGINT: Telegram IDs (can exceed JavaScript Number.MAX_SAFE_INTEGER)

#### Migration Files
Located in project root:
- `supabase-schema.sql` - Initial schema
- `add-cart-column.sql` - Cart cloud sync
- `add-payme-fields.sql` - Payme payment tracking
- `add-click-fields.sql` - Click payment tracking
- `add-review-images-column.sql` - Review photo uploads
- `add-favorites-column-migration.sql` - User favorites

### Common Gotchas
1. **localStorage in Telegram Desktop**: Always use wrapper functions from `helpers.js`, never direct access
2. **Telegram WebApp API**: Always null-check `window.Telegram?.WebApp` before use
3. **Field Mapping**: API layer handles snake_case ↔ camelCase, don't duplicate in components
4. **Admin Auth**: Currently just UI toggle - **no real authentication** (security risk in production)
5. **Order IDs**: Orders use UUID (`id`) and sequential number (`order_number`) - both are searchable
6. **Product Variants**: Stored as JSONB array with nested images per variant
7. **Cart Sync**: Cart saves to both localStorage AND `users.cart` column for cross-device access
8. **Payment Gateway Amounts**: Payme uses tiyin (1 UZS = 100 tiyin), Click uses UZS directly
9. **Payment Webhooks**: Both gateways require two-way communication - prepare/validate then complete/confirm

### Order Status Flow
```
pending (created) → approved (Payme webhook or admin) → shipped → delivered
                  → rejected (admin only)
```

### Key Custom Hooks
- `useBackButton(callback)` - Telegram native back button
- `useMainButton(text, callback, options)` - Telegram native main button
- `useCart()` - Cart operations (from CartContext)
- `useProducts()` - Product fetching with cache
- `useOrders()` - Order management

## Recent Implementations (2025-10-22)

### Telegram Native UI Integration
- **BackButton Hook**: `src/hooks/useBackButton.js` - Native back button with null safety
- **MainButton Hook**: `src/hooks/useMainButton.js` - Native main button for CTAs
- Used in: ProductPage, CheckoutPage, OrderDetailsPage, PaymentPage, WriteReviewPage
- Always check `window.Telegram?.WebApp` availability before accessing

### Cart Cloud Sync
- Cart now persists to `users.cart` column in Supabase (JSONB)
- Enables cross-device cart access
- Syncs on cart changes via `CartContext`

### Payme Payment Gateway
- **Service**: `src/services/payme.js` - Payment link generation
- **Webhook**: `api/payme-webhook.js` - Merchant API implementation
- **Flow**: 
  1. Generate checkout link with base64 encoded params
  2. Opens in Telegram's in-app browser (test.paycom.uz in test mode)
  3. Webhook receives PerformTransaction → auto-approves order
- **Test Cards**: 8600 0000 0000 0000, exp 03/99, SMS 666666
- **Database**: Added `payme_transaction_id`, `payme_transaction_time`, `payme_cancel_time` to orders table

### Click Payment Gateway
- **Service**: `src/services/click.js` - Payment link generation
- **Webhook**: `api/click-webhook.js` - Two-phase transaction handling (prepare + complete)
- **Flow**:
  1. Generate payment link with query parameters (no base64 encoding)
  2. Opens at `my.click.uz/services/pay` in Telegram in-app browser
  3. Webhook receives PREPARE request → validates order and amount
  4. User completes payment on Click
  5. Webhook receives COMPLETE request → auto-approves order
- **Test Cards**: 8600 1234 5678 9012, exp 03/99, SMS 666666
- **Database**: Added `click_order_id`, `click_trans_id`, `click_complete_time`, `click_error` to orders table
- **Key Difference from Payme**: Click uses two-phase commits (prepare/complete), Payme uses single PerformTransaction

### Known Configuration Needs

#### Payme
- ⚠️ **Webhook URL must be configured in Payme cabinet**: `https://www.ailem.uz/api/payme-webhook`
- Test mode active by default (`VITE_PAYME_TEST_MODE=true`)
- Switch to production: Set test mode to false and update `PAYME_KEY` to production password

#### Click (Optional)
- ⚠️ **Webhook URL must be configured in Click merchant cabinet**: `https://www.ailem.uz/api/click-webhook`
- Test mode: Set `VITE_CLICK_TEST_MODE=false` for production
- Backend-only variables: `CLICK_SERVICE_ID` and `CLICK_SECRET_KEY` (used for webhook validation)

### Current Status & Next Actions
- ✅ **All development complete** - Payment system, admin features, Telegram integration working
- ⚠️ **Pending**: Configure webhook URL in Payme test cabinet at `test.paycom.uz`
  - Webhook endpoint: `https://www.ailem.uz/api/payme-webhook`
  - Required for automatic order approval after payment
- 📋 **Next**: Test complete payment flow end-to-end with test card
- 🚀 **Before Production**: Switch `VITE_PAYME_TEST_MODE` to false and update `PAYME_KEY`
- See `PROJECT_STATUS.md` for detailed testing instructions and configuration

## Complete Change Log (Recent Session)

### Payment System Overhaul
- Replaced manual payment screenshot upload with Payme gateway
- Attempted Telegram Payments with Paycom (deprecated due to PAYMENT_PROVIDER_INVALID errors)
- Implemented Payme Merchant API webhook for automatic order approval
- Created serverless function `/api/payme-webhook` for payment verification
- Added database fields: `payme_transaction_id`, `payme_transaction_time`, `payme_cancel_time`
- Fixed payment link format to match Payme base64 encoding specification
- **Click Integration**: Added Click.uz as alternative payment gateway
  - Created `src/services/click.js` for payment link generation
  - Implemented `/api/click-webhook` with two-phase protocol (prepare + complete)
  - Added database fields: `click_order_id`, `click_trans_id`, `click_complete_time`, `click_error`
  - Key difference: Click uses UZS amounts (not tiyin) and requires `click_paydoc_id` in response

### Telegram Native Integration
- Created `useBackButton` hook with null safety checks
- Created `useMainButton` hook for CTAs ("Pay with Payme", etc.)
- Integrated BackButton in: ProductPage, CheckoutPage, OrderDetailsPage, PaymentPage, WriteReviewPage
- Fixed "Minified React error #310" by adding proper Telegram WebApp availability checks

### Cart System Enhancement
- Added cart syncing to Supabase (`users.cart` JSONB column)
- Enables cross-device cart persistence
- Database migration: `add-cart-column.sql`

### Admin Panel Features
- **Analytics Dashboard**: Revenue, order stats, top products
- **User Management**: View all users, bonus points, referral tracking
- **Order Management**: 
  - Bulk actions (select multiple orders)
  - Status updates with Telegram notifications
  - CSV export with full delivery info
  - Order details modal with payment screenshots
  - Mark as Shipped/Delivered functions
- **Product Management**:
  - Variant-specific images support
  - Smart product recommendation engine
  - Variant inventory tracking
- **Promotions**:
  - Multi-banner carousel with admin upload
  - Sale timer with localStorage caching
  - Banner management (upload, reorder, delete)
- **Reviews Management**: Admin approval system with image uploads
- **Shipping**: Pickup points and shipping rates configuration

### Bug Fixes
- Fixed Temporal Dead Zone error in ProductDetails
- Fixed courier reference error in PaymentPage
- Fixed multiple hydration errors across pages
- Fixed order creation: Generate proper UUID for `id` field
- Fixed order updates: Support both UUID and order_number lookup
- Fixed null user error in ProfilePage with proper loading states
- Fixed Telegram invoice parameter validation
- Fixed Vercel config: Updated to v3 format with proper API routing

### Deployment & Configuration
- Multiple Vercel redeployments with environment variable updates
- Cache busting with version bump (1.0.1)
- Added comprehensive error handling for Telegram WebApp APIs
- Updated `.env.example` with all required Payme and Click variables
