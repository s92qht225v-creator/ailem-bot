# Ailem - Home Textiles Store Telegram Mini App

A fully-featured e-commerce Telegram Mini App for selling home textile products (bedsheets, pillows, curtains, towels) with an integrated admin panel.

## Features

### Customer Features
- **Product Browsing**: Browse products by category with advanced filtering and search
- **Product Details**: View detailed product information with image galleries, reviews, and ratings
- **Shopping Cart**: Add products with custom options (color, size), manage quantities
- **Checkout Flow**: Complete checkout with delivery information and courier selection
- **Payment System**: Upload payment screenshot for manual verification
- **Bonus Points**: Earn 10% of purchase as bonus points, use up to 20% on orders
- **Referral System**: Share referral code, earn 100 points per successful referral
- **Order Tracking**: View order history with status updates
- **Wishlist**: Save favorite products for later

### Admin Features
- **Order Management**: View, approve, reject orders with payment screenshot verification
- **Product Management**: Full CRUD operations for products
- **Review Moderation**: Approve/reject customer reviews
- **User Management**: View users, adjust bonus points, track referrals
- **Real-time Updates**: All changes reflected immediately

## Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API (Cart, User, Admin)
- **Storage**: LocalStorage for persistence
- **Platform**: Telegram Mini Apps

## Project Structure

```
ailem-bot/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.jsx
│   │   │   └── Header.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── ShopPage.jsx
│   │   │   ├── ProductPage.jsx
│   │   │   ├── CartPage.jsx
│   │   │   ├── CheckoutPage.jsx
│   │   │   ├── PaymentPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── ReferralsPage.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── product/
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductDetails.jsx
│   │   │   └── ReviewSection.jsx
│   │   └── common/
│   │       ├── CountdownTimer.jsx
│   │       └── CategoryFilter.jsx
│   ├── context/
│   │   ├── CartContext.jsx
│   │   ├── UserContext.jsx
│   │   └── AdminContext.jsx
│   ├── data/
│   │   ├── products.js
│   │   ├── categories.js
│   │   └── courierServices.js
│   ├── hooks/
│   │   ├── useCart.js
│   │   ├── useProducts.js
│   │   └── useOrders.js
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Installation

1. **Clone the repository**
```bash
cd ailem-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Build for production**
```bash
npm run build
```

5. **Preview production build**
```bash
npm run preview
```

## Configuration

### Admin Mode

In development, you can toggle admin mode using the button in the top-right corner. In production, you would implement proper authentication.

To enable admin mode programmatically, update the user's `isAdmin` property in [UserContext.jsx](src/context/UserContext.jsx):

```javascript
const defaultUser = {
  // ...other properties
  isAdmin: true  // Set to true for admin access
};
```

### Payment Card Number

Update the admin card number in [PaymentPage.jsx](src/components/pages/PaymentPage.jsx):

```javascript
const adminCardNumber = '4532 1234 5678 9012'; // Change this
```

### Bonus Points Configuration

Adjust bonus points settings in [helpers.js](src/utils/helpers.js):

```javascript
// Calculate bonus points earned (10% of purchase)
export const calculateBonusPoints = (amount) => {
  return Math.floor(amount * 0.1 * 10); // Adjust percentage here
};

// Calculate max bonus points usage (20% of order)
export const calculateMaxBonusUsage = (orderTotal) => {
  const maxDiscount = orderTotal * 0.2; // Adjust percentage here
  return Math.floor(maxDiscount * 10);
};
```

### Courier Services

Edit courier options in [courierServices.js](src/data/courierServices.js):

```javascript
export const courierServices = [
  {
    id: 'express',
    name: 'Express Delivery',
    duration: '1-2 days',
    price: 15
  },
  // Add more services...
];
```

## Data Models

### Product
```javascript
{
  id: number,
  name: string,
  category: string,
  price: number,
  originalPrice?: number,
  image: string,
  images: string[],
  rating: number,
  reviewCount: number,
  stock: number,
  description: string,
  badge?: string,
  colors?: string[],
  sizes?: string[],
  reviews: Review[]
}
```

### Order
```javascript
{
  id: string,
  userId: number,
  userName: string,
  items: CartItem[],
  deliveryInfo: {
    fullName: string,
    phone: string,
    address: string,
    city: string
  },
  courier: CourierService,
  subtotal: number,
  bonusDiscount: number,
  deliveryFee: number,
  total: number,
  paymentScreenshot: string,
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
  email: string,
  bonusPoints: number,
  referralCode: string,
  referrals: number,
  isAdmin: boolean
}
```

## Key Features Explained

### Countdown Timer
Live countdown timer for sales/promotions that updates every second. Configure the end date in [HomePage.jsx](src/components/pages/HomePage.jsx):

```javascript
const saleEndDate = new Date();
saleEndDate.setDate(saleEndDate.getDate() + 7); // 7 days from now
```

### Bonus Points System
- Users earn 10% of purchase amount as bonus points
- 1 point = $0.10 value
- Can use up to 20% of order value in points
- Points earned after order approval
- Referrals grant 100 bonus points

### Referral System
- Each user gets a unique referral code
- New users get 10% discount when using a code
- Referrer earns 100 bonus points per successful referral
- Track total referrals in user profile

### Cart Management
- Persisted in localStorage
- Supports product variations (color, size)
- Real-time total calculation
- Empty cart state handling

### Review System
- Customers can submit reviews with ratings
- Reviews require admin approval before display
- Star rating (1-5)
- Review moderation in admin panel

### Order Flow
1. Customer adds items to cart
2. Proceeds to checkout with delivery details
3. Selects courier service
4. Optionally applies bonus points
5. Uploads payment screenshot
6. Order submitted for admin approval
7. Admin reviews payment and approves/rejects
8. Customer receives bonus points on approval

## Customization

### Colors
Update the color scheme in [tailwind.config.js](tailwind.config.js):

```javascript
colors: {
  primary: '#111827',    // Main dark color
  accent: '#3B82F6',     // Blue accent
  success: '#10B981',    // Green for success
  warning: '#F59E0B',    // Yellow for warnings
  error: '#EF4444',      // Red for errors
}
```

### Product Images
Replace product image URLs in [products.js](src/data/products.js) with your own images. Current implementation uses Unsplash for demo purposes.

### Categories
Add/remove categories in [categories.js](src/data/categories.js):

```javascript
export const categories = [
  {
    id: 1,
    name: 'Bedsheets',
    image: 'your-image-url',
    icon: '🛏️'
  },
  // Add more categories...
];
```

## Telegram Integration

This app is designed to work as a Telegram Mini App. To integrate:

1. Create a bot using [@BotFather](https://t.me/botfather)
2. Set up Mini App in bot settings
3. Deploy your built app to a hosting service
4. Set the Mini App URL in BotFather
5. The app will load inside Telegram

### Telegram Web App API
The app includes the Telegram Web App script in [index.html](index.html):

```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

You can access Telegram features using `window.Telegram.WebApp` API.

## Performance Optimizations

- **Lazy Loading**: Product images load lazily
- **LocalStorage**: Cart and user data persisted locally
- **Memoization**: Use React.memo for expensive components
- **Efficient Filtering**: Memoized product filtering and search
- **Optimized Renders**: Context-based state management

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Backend integration (API)
- [ ] Real payment gateway integration
- [ ] Push notifications via Telegram
- [ ] Order tracking with courier APIs
- [ ] Image optimization and CDN
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Product search autocomplete
- [ ] Advanced filtering (price range, ratings)
- [ ] Wishlist page
- [ ] Product comparison feature

## Contributing

This is a demonstration project. Feel free to fork and customize for your needs.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open an issue in the repository.

---

Built with ❤️ using React, Vite, and Tailwind CSS
