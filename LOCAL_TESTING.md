# 🧪 Local Testing Guide

## ✅ Your Setup is Ready!

Since you're testing locally only, your bot token is **safe** in the `.env` file. No need to revoke it!

## 🚀 Start Testing Now (30 seconds)

```bash
# Start the development server
npm run dev
```

Your app will open at `http://localhost:3000`

## 🎯 What to Test

### 1. Browse Products (2 minutes)
- ✅ Home page loads with countdown timer
- ✅ Click category cards (Bedsheets, Pillows, etc.)
- ✅ Browse featured products
- ✅ Click "View" on any product

### 2. Product Details (2 minutes)
- ✅ Product images display
- ✅ Select color (if available)
- ✅ Select size (if available)
- ✅ Change quantity with +/- buttons
- ✅ Click "Add to Cart"

### 3. Shopping Cart (2 minutes)
- ✅ View items in cart
- ✅ Update quantities
- ✅ Remove items
- ✅ See cart total
- ✅ Click "Proceed to Checkout"

### 4. Checkout Flow (3 minutes)
- ✅ Fill delivery information
- ✅ Select courier service
- ✅ Check "Use bonus points" (you have 250 points)
- ✅ See order summary with calculations
- ✅ Click "Continue to Payment"

### 5. Payment (2 minutes)
- ✅ Copy card number
- ✅ Upload any image file as payment screenshot
- ✅ See preview of uploaded image
- ✅ Click "Submit Order"
- ✅ See success message with bonus points earned

### 6. Profile & Orders (2 minutes)
- ✅ View your profile
- ✅ Check bonus points balance
- ✅ See order history
- ✅ Click "View Details" on an order

### 7. Reviews (2 minutes)
- ✅ Go to any product page
- ✅ Scroll to reviews section
- ✅ Click "Write a Review"
- ✅ Select star rating
- ✅ Write comment
- ✅ Submit review

### 8. Referrals (1 minute)
- ✅ Go to Referrals page (bottom nav)
- ✅ See your referral code
- ✅ Click "Copy Code"
- ✅ Read "How It Works"

### 9. Search & Filter (2 minutes)
- ✅ Go to Shop page
- ✅ Use search box
- ✅ Filter by category
- ✅ Sort by price/rating
- ✅ Add to wishlist (heart icon)

### 10. Admin Panel (5 minutes)
- ✅ Click "👑 Admin" button (top-right corner)
- ✅ Click "Admin Panel" in bottom bar

**Orders Tab:**
- ✅ See pending orders
- ✅ Click "Approve" on an order
- ✅ Filter by status

**Products Tab:**
- ✅ View all products
- ✅ Click "Delete" on a product (with confirmation)
- ✅ See updated product list

**Reviews Tab:**
- ✅ See pending reviews (ones you submitted)
- ✅ Click "Approve" on a review
- ✅ Go back to product page and see approved review

**Users Tab:**
- ✅ View user list
- ✅ Click "Adjust Bonus Points"
- ✅ Add/subtract points

## 🎨 Customization Test

### Change a Product (1 minute)
1. Open `src/data/products.js`
2. Find product with id: 1
3. Change the `name` to something else
4. Save file
5. Browser auto-refreshes
6. See your changes!

### Change Colors (1 minute)
1. Open `tailwind.config.js`
2. Change `accent: '#3B82F6'` to `accent: '#FF0000'` (red)
3. Save file
4. See blue buttons turn red!

### Add a Product (2 minutes)
1. Open `src/data/products.js`
2. Copy the last product object
3. Change `id: 11`
4. Change `name`, `price`, `description`
5. Save file
6. Go to Shop page - see your new product!

## 🐛 Common Issues & Fixes

### Port Already in Use
**Solution:** Vite will automatically use next available port (3001, 3002, etc.)

### Images Not Loading
**Solution:** Check internet connection - images use Unsplash URLs

### Cart Not Saving
**Solution:**
```javascript
// Open browser DevTools (F12)
// Go to: Application → Local Storage
// Should see: cart, user, orders, products
```

### Admin Button Not Showing
**Solution:** Look at **top-right corner** of the page. Should say "👤 User" or "👑 Admin"

### Changes Not Appearing
**Solution:**
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Or close and restart: `npm run dev`

### Build Errors
**Solution:**
```bash
# Clear and reinstall
rm -rf node_modules
npm install
npm run dev
```

## 📱 Mobile View Testing

### Chrome DevTools
1. Press `F12` or `Cmd+Option+I` (Mac)
2. Click device toolbar icon (or `Cmd+Shift+M`)
3. Select "iPhone 12 Pro" or set width to 375px
4. Reload page
5. Test everything in mobile view!

### Firefox DevTools
1. Press `F12`
2. Click "Responsive Design Mode" icon
3. Set to 375x667 (iPhone size)
4. Test!

## 🎯 Performance Check

### Check Build Size
```bash
npm run build
```

Should show:
- Total: ~240 KB
- Gzipped: ~68 KB
- Build time: < 1 second

### Check Load Time
1. Open DevTools
2. Go to "Network" tab
3. Refresh page
4. Check "DOMContentLoaded" time
5. Should be < 1 second on fast connection

## 💾 Data Persistence Test

### Test LocalStorage
1. Add items to cart
2. Close browser
3. Reopen `http://localhost:3000`
4. Cart items should still be there!

### Reset Everything
```javascript
// In browser console (F12):
localStorage.clear();
location.reload();
```

## 🎨 Theme Test

Your app works with both light and dark system themes:

### Mac
1. System Preferences → General → Appearance
2. Try "Light" and "Dark"
3. Refresh browser

### Windows
1. Settings → Personalization → Colors
2. Choose theme
3. Refresh browser

## 📊 Browser Console

Keep console open while testing:

**What you should see:**
```
✅ Telegram WebApp initialized
   Platform: unknown
   Version: unknown
   ℹ️ Not running in Telegram - using demo mode
```

**If you see errors:**
- Red text = problem
- Check the error message
- Most common: missing file or syntax error

## 🚀 Testing Telegram Features Locally

Even though you're testing in browser, Telegram features are included:

### Check Telegram Integration
```javascript
// In browser console:
import { isInTelegram } from './utils/telegram.js';
console.log('In Telegram?', isInTelegram()); // Should be false
```

### Simulate Telegram User
1. Open `src/context/UserContext.jsx`
2. Change default user name
3. Save and see it update!

## 🎓 Learning While Testing

### Explore the Code
While testing, open files and see how they work:

**Want to understand cart?**
- Look at: `src/context/CartContext.jsx`

**Want to see how products filter?**
- Look at: `src/hooks/useProducts.js`

**Want to customize colors?**
- Look at: `tailwind.config.js`

**Want to add a feature?**
- Start with: `src/components/pages/`

## ✅ Testing Checklist

Print this and check off as you test:

### Basic Flow
- [ ] Home page loads
- [ ] Browse products
- [ ] View product details
- [ ] Add to cart
- [ ] View cart
- [ ] Checkout
- [ ] Upload payment
- [ ] Submit order
- [ ] View in profile

### Admin Flow
- [ ] Toggle to admin
- [ ] Approve order
- [ ] Manage products
- [ ] Approve review
- [ ] Adjust bonus points

### Edge Cases
- [ ] Empty cart
- [ ] Out of stock product
- [ ] Search with no results
- [ ] Remove all cart items
- [ ] Use all bonus points
- [ ] Upload large file

### UI/UX
- [ ] All images load
- [ ] Buttons work
- [ ] Navigation works
- [ ] Forms validate
- [ ] Mobile view looks good
- [ ] Animations smooth
- [ ] No console errors

## 🎉 All Working? Next Steps!

If everything works locally:

### Option 1: Keep Testing Locally
- Perfect! No need to deploy
- Add your products
- Customize design
- Test with colleagues

### Option 2: Deploy to Show Others
When you're ready to share:
```bash
npm install -g vercel
vercel
```

### Option 3: Integrate with Telegram
When ready for real users:
1. Deploy first (Vercel)
2. Follow [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)
3. Test in Telegram app

## 💡 Pro Tips

1. **Keep DevTools Open** - Catch errors early
2. **Test Mobile View** - Most users will be on mobile
3. **Clear Data Often** - Test fresh user experience
4. **Check Console** - Look for warnings
5. **Try Different Browsers** - Chrome, Firefox, Safari
6. **Test Slow Connection** - DevTools → Network → Slow 3G
7. **Break Things** - Best way to learn!

## 🎯 Fun Tests to Try

### Stress Test the Cart
- Add 10 different products
- Change quantities to 99
- See if totals calculate correctly

### Test Bonus Points Math
- Order total: $100
- Bonus points earned: 100
- Can use max: 20 points (20% of $100)
- Final discount: $2 (20 points × $0.10)

### Test Referral Code
- Copy your code
- Imagine friend uses it
- They get 10% off first order
- You get 100 points

## 📚 Documentation to Read

While testing, keep these handy:

- **[CHEATSHEET.md](CHEATSHEET.md)** - Quick reference
- **[FEATURES.md](FEATURES.md)** - All features list
- **[README.md](README.md)** - Project overview

## 🎊 Enjoy Testing!

Take your time, explore everything, and have fun!

Remember: You can't break anything - just refresh or restart!

**Questions while testing?**
- Check browser console
- Look at the code
- Read the documentation

---

**Happy Testing! 🚀**

Everything is working locally - no deployment needed until you're ready!
