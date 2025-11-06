# Language Implementation - Quick Reference Guide

## Files Organization

### Translation Files
- **Primary**: `/src/locales/` (MAIN - used by app)
  - `index.js` - Language definitions
  - `ru.js` - Russian (18,940 bytes) ✓ Comprehensive
  - `uz.js` - Uzbek (14,721 bytes) ✓ Comprehensive

- **Secondary**: `/src/translations/` (DUPLICATE - not used)
  - `ru.js` - Russian (2,982 bytes) - Minimal
  - `uz.js` - Uzbek (2,431 bytes) - Minimal

### Language Context
- `/src/context/LanguageContext.jsx` - Language switching logic
- `/src/hooks/useTranslation.js` - Hook for accessing translations

## What Has Translations

| Feature | Status |
|---------|--------|
| UI Menu Items | ✓ Complete |
| Cart/Checkout | ✓ Complete |
| Orders | ✓ Complete |
| Profile | ✓ Complete |
| Reviews | ✓ Complete |
| Tashkent Districts | ✓ Complete |
| Common Messages | ✓ Complete |

## What DOESN'T Have Translations

| Feature | Status | Issue |
|---------|--------|-------|
| Courier Names | ✗ Missing | English only (BTS, Starex, EMU, UzPost, Yandex) |
| State Names | ✗ Missing | English only (Tashkent Region, Samarkand Region) |
| City Names | ✗ Missing | English only (Tashkent, Samarkand) |
| Admin Panel | ✗ Missing | 50+ hardcoded English strings |
| Pickup Points | ✗ Incomplete | Has language column but not used |

## Data Storage Issues

### Shipping Rates Table
```sql
-- CURRENT (PROBLEM):
CREATE TABLE shipping_rates (
  courier TEXT,  -- English only
  state TEXT     -- English only
)

-- SHOULD BE:
CREATE TABLE shipping_rates (
  courier_uz TEXT,      -- Uzbek version
  courier_ru TEXT,      -- Russian version
  state_uz TEXT,        -- Uzbek version
  state_ru TEXT         -- Russian version
)
```

### Pickup Points Table
```sql
-- CURRENT (PROBLEM):
CREATE TABLE pickup_points (
  courier_service TEXT,  -- English only
  state TEXT,           -- English only
  city TEXT,            -- English only
  language TEXT         -- Added but not used!
)

-- ISSUE: 
-- - language column was added but never implemented
-- - No Russian duplicate entries created
-- - API doesn't filter by language
```

## Code Issues

### DesktopAdminPanel
**File**: `/src/components/pages/DesktopAdminPanel.jsx`

**Problem**: All English, hardcoded strings
```javascript
label: 'Dashboard'        // Should be: t('admin.dashboard')
label: 'Orders'           // Should be: t('admin.orders')
label: 'Products'         // Should be: t('admin.products')
title: "Total Revenue"    // Should be: t('admin.totalRevenue')
<span>Add New Product</span>   // Should be: t('admin.addProduct')
```

**Hardcoded count**: 50+ strings across entire component

### ShippingRatesContext
**File**: `/src/context/ShippingRatesContext.jsx`

**Problem**: Courier and state names are English, no translation
```javascript
// Line 9: BTS stored as English, not translated
{ id: 1, courier: 'BTS', state: 'Tashkent Region', ... }

// Should use: t('couriers.BTS') but this key doesn't exist
```

### PickupPointsContext
**File**: `/src/context/PickupPointsContext.jsx`

**Problem**: Language parameter accepted but ignored
```javascript
// Lines 108, 120, 133: language parameter is ignored
const getStatesByCourier = useCallback((courierService, language = 'uz') => {
  // COMMENT: "no language filtering - courier/state names are in English"
  return [...new Set(pickupPoints.map(point => point.state))].sort();
}, [pickupPoints]);
// ^ Always returns English, ignores language param
```

## Translation Keys Needed

### In `/src/locales/ru.js` - Add These:
```javascript
couriers: {
  'BTS': 'БТС',
  'Starex': 'Старекс',
  'EMU': 'ЕМУ',
  'UzPost': 'УзПост',
  'Yandex': 'Яндекс',
  'MaxWay': 'Макс Вей'
},

states: {
  'Tashkent Region': 'Ташкентская область',
  'Samarkand Region': 'Самаркандская область'
},

cities: {
  'Tashkent': 'Ташкент',
  'Samarkand': 'Самарканд'
},

admin: {
  dashboard: 'Панель управления',
  orders: 'Заказы',
  products: 'Товары',
  categories: 'Категории',
  reviews: 'Отзывы',
  users: 'Пользователи',
  pickupPoints: 'Пункты самовывоза',
  shippingRates: 'Тарифы доставки',
  addProduct: 'Добавить товар',
  logout: 'Выход'
}
```

### In `/src/locales/uz.js` - Add These:
```javascript
couriers: {
  'BTS': 'BTS',  // Usually same as English for Uzbek
  'Starex': 'Starex',
  'EMU': 'EMU',
  'UzPost': 'UzPost',
  'Yandex': 'Yandex',
  'MaxWay': 'MaxWay'
},

states: {
  'Tashkent Region': 'Toshkent Viloyati',
  'Samarkand Region': 'Samarqand Viloyati'
},

cities: {
  'Tashkent': 'Toshkent',
  'Samarkand': 'Samarqand'
},

admin: {
  dashboard: 'Boshqaruv paneli',
  orders: 'Buyurtmalar',
  products: 'Mahsulotlar',
  categories: 'Kategoriyalar',
  reviews: 'Sharhlar',
  users: 'Foydalanuvchilar',
  pickupPoints: 'Olib ketish punktlari',
  shippingRates: 'Yetkazish tariflari',
  addProduct: 'Mahsulot qo\'shish',
  logout: 'Chiqish'
}
```

## API Service Issues

### File: `/src/services/api.js`

**Problem**: No language parameter usage in data retrieval

```javascript
// Line 1208+: shippingRatesAPI.getAll() 
// Returns English data, no translation lookup
export const shippingRatesAPI = {
  async getAll() {
    // Returns: { courier: 'BTS', state: 'Tashkent Region', ... }
    // Should return: translated based on language
  }
}

// Line 899+: pickupPointsAPI
// Accepts language but doesn't use it
async getByCourier(courierService) {
  // Returns English courier service names
  // Should translate based on current language
}
```

## How to Fix (Quick Steps)

1. **Add translation keys** (15 min)
   - Add courier, state, city keys to `/src/locales/ru.js` and `/src/locales/uz.js`
   
2. **Update context** (30 min)
   - ShippingRatesContext: Use `t()` for courier/state names
   - PickupPointsContext: Actually use language parameter
   
3. **Update components** (1-2 hours)
   - DesktopAdminPanel: Replace 50+ hardcoded strings with `t()`
   - CheckoutPage: Use translated courier names
   
4. **Database updates** (1 hour)
   - Add translation columns or language-based entries
   
5. **Testing** (1 hour)
   - Verify Russian user sees Russian names
   - Verify language switch works throughout app

## User Impact

**Uzbek Users**: No visible impact (works as before)

**Russian Users**: 
- Sees English courier names instead of Russian
- Sees English state/city names instead of Russian
- Sees English admin interface
- Poor user experience for logistics management

## Key Statistics

- UI translation coverage: 100% (all UI text translated)
- Data translation coverage: 0% (courier/state/city names)
- Admin panel translation coverage: 0%
- Hardcoded English in DesktopAdminPanel: 50+ strings
- Missing translation keys: ~15 (couriers, states, cities, admin terms)
- Incomplete implementations: 1 (pickup_points language)

## Quick Checklist for Verification

```
Courier Names Issue:
[ ] BTS shows as BTS, not БТС for Russian users
[ ] Starex shows as Starex, not Старекс for Russian users
[ ] EMU shows as EMU, not ЕМУ for Russian users

State Names Issue:
[ ] "Tashkent Region" shows in English, not Russian
[ ] "Samarkand Region" shows in English, not Russian

Pickup Points Language:
[ ] language column exists but data is all 'uz'
[ ] No Russian entries exist
[ ] API doesn't filter by language

Admin Panel:
[ ] Dashboard shows in English
[ ] All menu items in English
[ ] Buttons and labels in English
```

## Database Schema Issues

Both `shipping_rates` and `pickup_points` tables store data in English only:

```sql
-- Problem: No localization support
courier TEXT NOT NULL  -- Always English
state TEXT NOT NULL    -- Always English

-- Solution needed: Either add translation columns or separate entries
courier_uz TEXT
courier_ru TEXT
state_uz TEXT
state_ru TEXT

-- OR duplicate entries with language field:
language TEXT  -- 'uz' or 'ru'
```

## Related Files

- Complete report: `LANGUAGE_INCONSISTENCIES_REPORT.md` (615 lines)
- Summary: `LANGUAGE_ANALYSIS_SUMMARY.txt` (244 lines)
- This file: `LANGUAGE_QUICK_REFERENCE.md`

---

**Last Updated**: 2025-11-06
**Status**: Critical issues identified, solutions documented
