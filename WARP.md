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

### Development Server Configuration
- Default port: 3000
- Ngrok integration configured for Telegram testing
- Host: `spongy-sledlike-narcisa.ngrok-free.dev` (configured in vite.config.js)

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS with custom color scheme
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Context API
- **Storage**: Supabase Storage for images
- **Platform**: Telegram Mini Apps (WebApp API)

### Core Architecture Patterns

#### Context-Based State Management
The app uses React Context providers in a nested hierarchy:
```
UserProvider
  └── AdminProvider
      └── PickupPointsProvider
          └── ShippingRatesProvider
              └── CartProvider
                  └── App
```

#### Route Management
- **Navigation**: Hash-based routing with custom `navigate()` function
- **Page State**: Persistent through localStorage (with Telegram Desktop fallbacks)
- **URL Structure**: `/#/page` format with page data stored separately

#### Data Layer
- **API Services**: Centralized in `src/services/api.js` with separate modules:
  - `usersAPI` - User management and Telegram integration
  - `productsAPI` - Product CRUD with review aggregation  
  - `ordersAPI` - Order management with status tracking
  - `reviewsAPI` - Review moderation system
  - `storageAPI` - Image upload to Supabase Storage
  - `pickupPointsAPI` - Courier pickup points
  - `categoriesAPI` - Product category management

#### Storage Strategy
- **Local Storage**: Safe wrapper for Telegram Desktop compatibility
- **Database**: Supabase with field mapping between DB snake_case and app camelCase
- **Images**: Supabase Storage with public/private bucket separation

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

## Development Guidelines

### Telegram Mini App Specific
- Always test with ngrok URL when developing Telegram features
- Use `isInTelegram()` utility to detect Telegram environment
- Handle localStorage failures gracefully (Telegram Desktop compatibility)
- Referral codes processed on app initialization via URL params

### State Management
- Use existing Context providers rather than creating new ones
- Persist critical state (cart, user data) to localStorage
- Handle loading states consistently across components

### API Integration
- All Supabase calls go through `src/services/api.js`
- Database field mapping handled in API layer
- Error handling with fallbacks to localStorage for demo users

### Styling
- Tailwind with custom color scheme in `tailwind.config.js`
- Mobile-first responsive design
- Dark mode not implemented
- Custom CSS variables in `src/index.css`

### File Upload
- Product images: Public Supabase bucket
- Payment screenshots: Private Supabase bucket with signed URLs
- Image optimization and CDN not implemented

## Environment Configuration

### Environment Variables (`.env`)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
VITE_PAYME_MERCHANT_ID=your_payme_merchant_id
VITE_PAYME_TEST_MODE=true
PAYME_KEY=your_payme_merchant_key
```

### Local Development
- Demo user automatically created when not in Telegram
- Admin mode toggle available in top-right corner
- LocalStorage fallback for Telegram Desktop

## Data Models

### Key Database Mappings
- Products: `category_name` ↔ `category`, `original_price` ↔ `originalPrice`
- Orders: `user_id` ↔ `userId`, `bonus_discount` ↔ `bonusDiscount`  
- Users: `bonus_points` ↔ `bonusPoints`, `referral_code` ↔ `referralCode`

### Business Logic
- **Bonus Points**: Configurable percentage of order total (default 10%)
- **Point Usage**: Max 20% of order value can be paid with points
- **Referrals**: Earn commission percentage from referred user orders
- **Review System**: Admin approval required before display

## Testing & Deployment

### Telegram Testing
1. Use ngrok URL from `vite.config.js`
2. Set up bot with @BotFather
3. Configure Mini App URL in bot settings

### Production Build
- Static files output to `dist/`
- Vercel configuration in `vercel.json`
- Nginx configuration in `nginx.conf`

## Notable Implementation Details

- **Safe localStorage**: Wrapper handles Telegram Desktop restrictions
- **Image Loading**: Lazy loading with fallbacks
- **Error Boundaries**: App-level error catching
- **Admin Authentication**: UI toggle only (implement proper auth for production)
- **Payment Processing**: Payme gateway integration with webhook auto-approval
- **Order Status Flow**: pending → approved (via Payme webhook) / rejected (manual admin action)

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

### Known Configuration Needs
- ⚠️ **Webhook URL must be configured in Payme cabinet**: `https://www.ailem.uz/api/payme-webhook`
- Test mode active by default (`VITE_PAYME_TEST_MODE=true`)
- Switch to production: Set test mode to false and update `PAYME_KEY` to production password

### Current Issues
- None - all React errors and payment integration issues resolved
- See `PROJECT_STATUS.md` for detailed status and testing instructions
