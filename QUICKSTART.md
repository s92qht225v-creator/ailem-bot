# Quick Start Guide

## Getting Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 3. Toggle Admin Mode
Click the button in the top-right corner (👤 User / 👑 Admin) to switch between user and admin views.

## Key Pages to Explore

### Customer Flow
1. **Home Page** - Browse categories and featured products
2. **Shop Page** - Filter and search products
3. **Product Page** - View details, select options, add to cart
4. **Cart Page** - Review items and proceed to checkout
5. **Checkout Page** - Enter delivery info, select courier, apply bonus points
6. **Payment Page** - Upload payment screenshot
7. **Profile Page** - View orders and bonus points
8. **Referrals Page** - Share referral code

### Admin Flow
1. Toggle to Admin Mode (top-right button)
2. Click "Admin Panel" in the bottom admin bar
3. Explore tabs:
   - **Orders** - Approve/reject orders
   - **Products** - Manage product catalog
   - **Reviews** - Moderate customer reviews
   - **Users** - View users and adjust bonus points

## Test Features

### Add Products to Cart
1. Go to Home or Shop page
2. Click "View" on any product
3. Select color/size if available
4. Adjust quantity
5. Click "Add to Cart"

### Complete an Order
1. Add items to cart
2. Go to Cart → "Proceed to Checkout"
3. Fill delivery information
4. Select courier service
5. Check "Use bonus points" if desired
6. Click "Continue to Payment"
7. Copy card number
8. Upload any image as payment screenshot
9. Submit order

### Approve Order (Admin)
1. Toggle to Admin Mode
2. Go to Admin Panel → Orders tab
3. View pending orders
4. Click "Approve" on any order
5. Check user's profile to see updated order history

### Manage Products (Admin)
1. Go to Admin Panel → Products tab
2. View all products
3. Click "Edit" to modify (form coming soon)
4. Click "Delete" to remove product

### Moderate Reviews (Admin)
1. Submit a review as a customer first
2. Toggle to Admin Mode
3. Go to Admin Panel → Reviews tab
4. Approve or delete the review

## Default User Data

The app comes with a default user:
- **Name**: John Doe
- **Phone**: +1234567890
- **Bonus Points**: 250
- **Referrals**: 3
- **Admin Mode**: Toggle via button (dev only)

## Customization

### Update Product Images
Edit `src/data/products.js` and replace image URLs

### Change Colors
Edit `tailwind.config.js` in the `colors` section

### Modify Courier Options
Edit `src/data/courierServices.js`

### Add Categories
Edit `src/data/categories.js`

### Configure Bonus Points
Edit functions in `src/utils/helpers.js`:
- `calculateBonusPoints()` - Earning rate
- `calculateMaxBonusUsage()` - Max usage percentage

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### Port Already in Use
If port 3000 is busy, Vite will automatically use the next available port.

### Images Not Loading
Ensure you have internet connection - product images use Unsplash URLs.

### LocalStorage Issues
Clear browser storage: DevTools → Application → Local Storage → Clear

### Admin Mode Not Working
Make sure you're in development mode. Check the top-right corner for the toggle button.

## Next Steps

1. **Integrate Backend**: Replace localStorage with API calls
2. **Add Authentication**: Implement Telegram login
3. **Payment Gateway**: Integrate real payment processor
4. **Deploy**: Host on Vercel, Netlify, or your preferred platform
5. **Telegram Integration**: Set up as Telegram Mini App

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review component files for inline comments
- Check browser console for errors
- Verify all dependencies are installed

Happy building! 🚀
