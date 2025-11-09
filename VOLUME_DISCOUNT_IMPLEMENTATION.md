# Volume Discount System Implementation

## Overview
A complete volume discount/pricing system has been implemented that allows you to set tiered pricing based on quantity purchased. Customers buying in bulk get better per-unit prices.

## Features Implemented

### 1. Database Schema
- **File**: [add-volume-pricing.sql](add-volume-pricing.sql)
- Added `volume_pricing` JSONB column to `products` table
- Stores array of pricing tiers: `[{"min_qty": 3, "max_qty": 5, "price": 140000}, ...]`

**Run this SQL in Supabase SQL Editor to enable the feature:**
```sql
-- Run the migration
-- See add-volume-pricing.sql for full script
```

### 2. Admin Panel Configuration
- **File**: [src/components/pages/DesktopAdminPanel.jsx](src/components/pages/DesktopAdminPanel.jsx:1659-1784)
- New "Volume Pricing" section in product form
- Features:
  - ✅ Add unlimited tiers with "Add Tier" button
  - ✅ Remove any tier with delete button
  - ✅ Configure min quantity, max quantity, and price per unit for each tier
  - ✅ Live preview showing how pricing will appear to customers
  - ✅ Auto-saves with product data

**Admin UI includes:**
- Min quantity input
- Max quantity input (leave empty for unlimited/open-ended tier)
- Price per unit in UZS
- Visual preview of all tiers

### 3. Price Calculation Logic
- **File**: [src/utils/volumePricing.js](src/utils/volumePricing.js)
- Core functions:
  - `getVolumePricedUnit()` - Returns effective price per unit based on quantity
  - `calculateItemTotal()` - Calculates total price for item with volume discount
  - `getVolumeDiscountDescription()` - Returns discount info for display

### 4. Cart Integration
- **File**: [src/context/CartContext.jsx](src/context/CartContext.jsx:132-138)
- Cart total automatically calculates volume discounts
- Each item's `volume_pricing` data is stored in cart
- Real-time price updates as quantity changes

### 5. Customer-Facing Displays

#### Product Details Page
- **File**: [src/components/product/ProductDetails.jsx](src/components/product/ProductDetails.jsx:289-317)
- Green highlighted section showing all volume pricing tiers
- Shows savings per tier compared to base price
- Example display:
  ```
  💰 Hajm bo'yicha chegirmalar
  • 3-5 dona: 140,000 UZS har biri (10,000 tejash)
  • 6-10 dona: 130,000 UZS har biri (20,000 tejash)
  • 11+ dona: 120,000 UZS har biri (30,000 tejash)
  ```

#### Cart Page
- **File**: [src/components/pages/CartPage.jsx](src/components/pages/CartPage.jsx:95-139)
- Shows "Volume discount available" badge on products with tiers
- Displays effective price per unit based on quantity
- Shows total savings in green box
- Displays original price with strikethrough when discount applies

## How to Use

### For Admin:

1. **Run the SQL migration** in Supabase SQL Editor:
   ```bash
   # Open Supabase Dashboard > SQL Editor
   # Copy and paste contents of add-volume-pricing.sql
   # Click "Run"
   ```

2. **Configure volume pricing for a product**:
   - Go to Admin Panel > Products
   - Edit or create a product
   - Scroll to "Volume Pricing" section (green box at bottom)
   - Click "Daraja qo'shish" (Add Tier) button
   - Set:
     - Min quantity (e.g., 3)
     - Max quantity (e.g., 5) or leave empty for "11+"
     - Price per unit (e.g., 140000)
   - Add more tiers as needed
   - Preview shows exactly what customers will see
   - Click "Update Product" or "Add Product"

3. **Remove tiers**:
   - Click the red trash icon next to any tier
   - Tiers automatically reorder by quantity

### For Customers:

1. **Product page**:
   - See all available volume pricing tiers
   - Understand savings before adding to cart

2. **Cart page**:
   - Add multiple quantities to cart
   - See discount automatically applied
   - View savings in green box
   - Original price shown with strikethrough

3. **Checkout**:
   - Final total includes all volume discounts
   - Discounts persist through order completion

## Example Configuration

### Product: Premium Bedsheet Set
- Base price: 150,000 UZS
- Volume pricing:
  ```json
  [
    { "min_qty": 3, "max_qty": 5, "price": 140000 },
    { "min_qty": 6, "max_qty": 10, "price": 130000 },
    { "min_qty": 11, "max_qty": null, "price": 120000 }
  ]
  ```

### Customer Scenarios:
- **Buy 1-2 units**: 150,000 UZS each (base price)
- **Buy 3-5 units**: 140,000 UZS each (save 10,000 per unit)
- **Buy 6-10 units**: 130,000 UZS each (save 20,000 per unit)
- **Buy 11+ units**: 120,000 UZS each (save 30,000 per unit)

## Technical Details

### Data Structure
```javascript
// In products table
{
  "volume_pricing": [
    {
      "min_qty": 3,      // Minimum quantity for this tier
      "max_qty": 5,      // Maximum quantity (null = unlimited)
      "price": 140000    // Price per unit in this tier
    },
    // ... more tiers
  ]
}
```

### Price Calculation Algorithm
1. Sort tiers by `min_qty` ascending
2. Find tier where `quantity >= min_qty` and `quantity <= max_qty` (or `max_qty` is null)
3. Return that tier's price
4. If no tier matches, return base price

### Cart Storage
- Volume pricing data is copied to cart items when added
- Ensures price consistency even if admin changes tiers later
- Cart recalculates on every render for real-time updates

## Benefits

1. **Encourages bulk purchases**: Customers buy more to get better prices
2. **Flexible configuration**: Add/remove tiers per product as needed
3. **Transparent pricing**: Customers see exactly what they'll save
4. **Automatic calculation**: No manual discount codes needed
5. **SEO friendly**: Pricing displayed directly on product pages

## Files Modified/Created

### Created:
- `add-volume-pricing.sql` - Database migration
- `src/utils/volumePricing.js` - Price calculation utilities
- `VOLUME_DISCOUNT_IMPLEMENTATION.md` - This documentation

### Modified:
- `src/components/pages/DesktopAdminPanel.jsx` - Admin form UI
- `src/context/CartContext.jsx` - Cart total calculation
- `src/components/product/ProductDetails.jsx` - Product page display
- `src/components/pages/CartPage.jsx` - Cart page display

## Next Steps

1. ✅ Run the SQL migration in Supabase
2. ✅ Test by adding volume pricing to a product
3. ✅ Verify display on product page
4. ✅ Add to cart and check discount calculation
5. ✅ Complete test order to ensure webhooks work correctly

## Notes

- Volume pricing is optional - products without tiers work normally
- Tiers can overlap or have gaps (system picks first matching tier)
- Recommended: Create non-overlapping, sequential tiers
- Max quantity can be null for open-ended "11+" style tiers
- All prices must be in UZS (Uzbekistan Sum)
