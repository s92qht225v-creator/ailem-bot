# Ailem - Developer Cheat Sheet

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📂 Important Files to Edit

### Products
- **File**: `src/data/products.js`
- **Add Product**: Copy existing product object, change ID and details
- **Change Images**: Update `image` and `images` array URLs

### Categories
- **File**: `src/data/categories.js`
- **Add Category**: Add object with id, name, image, icon

### Courier Services
- **File**: `src/data/courierServices.js`
- **Add Service**: Add object with id, name, duration, price

### Colors
- **File**: `tailwind.config.js`
- **Location**: `theme.extend.colors`

### Bonus Points Settings
- **File**: `src/utils/helpers.js`
- **Earning Rate**: `calculateBonusPoints()` - default 10%
- **Max Usage**: `calculateMaxBonusUsage()` - default 20%
- **Point Value**: 1 point = $0.10

### Payment Card Number
- **File**: `src/components/pages/PaymentPage.jsx`
- **Line**: ~10
- **Variable**: `adminCardNumber`

## 🎨 Common Customizations

### Change App Name
```javascript
// File: index.html
<title>Your Store Name</title>

// File: src/components/layout/Header.jsx
title = 'Your Store Name'
```

### Update User Data
```javascript
// File: src/context/UserContext.jsx
const defaultUser = {
  name: 'Your Name',
  phone: '+1234567890',
  email: 'your@email.com',
  bonusPoints: 250,
  // ...
};
```

### Modify Sale Countdown
```javascript
// File: src/components/pages/HomePage.jsx
const saleEndDate = new Date();
saleEndDate.setDate(saleEndDate.getDate() + 7); // Change 7 to your number of days
```

## 📱 Component Usage Examples

### Use Cart
```javascript
import { useCart } from './hooks/useCart';

const { cartItems, addToCart, removeFromCart, getCartTotal } = useCart();

// Add item
addToCart(product, quantity, color, size);

// Remove item
removeFromCart(cartItemId);

// Get total
const total = getCartTotal();
```

### Use Products
```javascript
import { useProducts } from './hooks/useProducts';

const {
  products,           // Filtered products
  setSearchQuery,     // Set search
  setSelectedCategory,// Set category
  getProductById      // Get single product
} = useProducts();
```

### Use User Context
```javascript
import { useContext } from 'react';
import { UserContext } from './context/UserContext';

const { user, updateBonusPoints, toggleFavorite } = useContext(UserContext);

// Update points
updateBonusPoints(100); // Add 100 points

// Toggle favorite
toggleFavorite(productId);
```

### Use Admin Context
```javascript
import { useContext } from 'react';
import { AdminContext } from './context/AdminContext';

const { products, orders, approveOrder, deleteProduct } = useContext(AdminContext);

// Approve order
approveOrder(orderId);

// Delete product
deleteProduct(productId);
```

## 🎯 Navigation

### Navigate Between Pages
```javascript
// In any page component
const navigate = (page, data = {}) => {
  // page: 'home', 'shop', 'product', 'cart', 'checkout', 'payment', 'profile', 'referrals', 'admin'
  // data: optional object with page-specific data
};

// Examples:
navigate('shop');
navigate('product', { productId: 1 });
navigate('shop', { category: 'Bedsheets' });
navigate('payment', { checkoutData: {...} });
```

## 🎨 Styling Classes

### Common Tailwind Patterns
```jsx
// Card
<div className="bg-white rounded-lg shadow-md p-4">

// Button Primary
<button className="bg-accent text-white py-2 px-4 rounded-lg hover:bg-blue-600">

// Button Secondary
<button className="bg-gray-100 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-200">

// Button Danger
<button className="bg-error text-white py-2 px-4 rounded-lg hover:bg-red-600">

// Grid 2 columns
<div className="grid grid-cols-2 gap-4">

// Centered content
<div className="flex items-center justify-center">

// Badge
<span className="bg-accent text-white text-xs px-2 py-1 rounded">
```

## 📊 Data Models Quick Ref

### Product
```javascript
{
  id: number,
  name: string,
  category: string,
  price: number,
  originalPrice: number,
  image: string,
  images: string[],
  rating: number,
  reviewCount: number,
  stock: number,
  description: string,
  badge: string,
  colors: string[],
  sizes: string[],
  reviews: Review[]
}
```

### Order
```javascript
{
  id: string,
  userId: number,
  items: CartItem[],
  deliveryInfo: {...},
  courier: CourierService,
  total: number,
  status: 'pending' | 'approved' | 'rejected',
  date: string
}
```

### User
```javascript
{
  id: number,
  name: string,
  phone: string,
  bonusPoints: number,
  referralCode: string,
  referrals: number,
  isAdmin: boolean
}
```

## 🔧 Utility Functions

```javascript
import {
  formatPrice,              // formatPrice(99.99) → "$99.99"
  formatDate,               // formatDate('2025-01-15') → "Jan 15, 2025"
  calculateBonusPoints,     // calculateBonusPoints(100) → 100 points
  bonusPointsToDollars,     // bonusPointsToDollars(100) → 10.00
  copyToClipboard,          // copyToClipboard('text') → Promise<boolean>
  generateOrderNumber,      // generateOrderNumber() → "ORD-123456-789"
  generateReferralCode,     // generateReferralCode('John') → "JOHN1A2B"
  getStatusColor           // getStatusColor('pending') → "bg-warning text-white"
} from './utils/helpers';
```

## 🐛 Debugging Tips

### Check State
```javascript
// Cart items
console.log('Cart:', cartItems);

// User
console.log('User:', user);

// Products
console.log('Products:', products);

// Orders
console.log('Orders:', orders);
```

### Clear LocalStorage
```javascript
// In browser console:
localStorage.clear();
// Then reload page
```

### Toggle Admin Mode
```javascript
// In development, use the button in top-right
// Or set manually in UserContext.jsx:
isAdmin: true
```

## 🎯 Common Tasks

### Add New Product
1. Edit `src/data/products.js`
2. Copy an existing product object
3. Update: id, name, category, price, images, description
4. Save file
5. Refresh browser

### Change Delivery Prices
1. Edit `src/data/courierServices.js`
2. Update `price` values
3. Save file

### Modify Bonus Points Rate
1. Edit `src/utils/helpers.js`
2. Find `calculateBonusPoints`
3. Change `amount * 0.1` to your rate
4. Save file

### Add New Category
1. Edit `src/data/categories.js`
2. Add object with: id, name, image, icon
3. Save file
4. Add matching products

## 🚀 Deployment Quick Steps

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Firebase
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 📝 File Size Reference

- **Total Bundle**: ~239 KB (~68 KB gzipped)
- **JavaScript**: 217 KB (63 KB gzipped)
- **CSS**: 21 KB (5 KB gzipped)
- **HTML**: 0.5 KB (0.3 KB gzipped)

## 🔗 Quick Links

- **Lucide Icons**: https://lucide.dev/icons
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Unsplash Images**: https://unsplash.com
- **Telegram Bots**: https://core.telegram.org/bots

## 💡 Pro Tips

1. **Test mobile-first** - Set browser to 375px width
2. **Use React DevTools** - Inspect component state
3. **Check console** - Look for errors before deploying
4. **Clear cache** - Hard refresh with Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
5. **Test in Telegram** - Use ngrok for local testing
6. **Optimize images** - Use WebP format for better performance
7. **Use .env files** - Store sensitive data separately

## 🎓 Learning Path

1. **Start**: Run `npm run dev` and explore
2. **Customize**: Change colors, products, text
3. **Extend**: Add new features, pages
4. **Deploy**: Choose platform and deploy
5. **Integrate**: Connect to Telegram
6. **Backend**: Add API and database
7. **Scale**: Add analytics, monitoring

---

**Keep this handy!** Bookmark for quick reference.

Need more details? Check:
- **README.md** - Full documentation
- **QUICKSTART.md** - Getting started guide
- **FEATURES.md** - Feature list
- **DEPLOYMENT.md** - Deployment guide
