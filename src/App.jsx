import { useState, useContext, useEffect } from 'react';
import { UserContext } from './context/UserContext';
import { AdminContext } from './context/AdminContext';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import HomePage from './components/pages/HomePage';
import ShopPage from './components/pages/ShopPage';
import ProductPage from './components/pages/ProductPage';
import CartPage from './components/pages/CartPage';
import CheckoutPage from './components/pages/CheckoutPage';
import PaymentPage from './components/pages/PaymentPage';
import ProfilePage from './components/pages/ProfilePage';
import OrderHistoryPage from './components/pages/OrderHistoryPage';
import OrderDetailsPage from './components/pages/OrderDetailsPage';
import MyReviewsPage from './components/pages/MyReviewsPage';
import WriteReviewPage from './components/pages/WriteReviewPage';
import FavoritesPage from './components/pages/FavoritesPage';
import ReferralsPage from './components/pages/ReferralsPage';
import AdminPanel from './components/pages/AdminPanel';
import { useProducts } from './hooks/useProducts';
import { initTelegramWebApp, getTelegramUser, isInTelegram, getReferralCode } from './utils/telegram';

function App() {
  const { loading: adminLoading, error: adminError } = useContext(AdminContext);
  const { loading: userLoading } = useContext(UserContext);
  // Initialize from URL hash or localStorage
  const [currentPage, setCurrentPage] = useState(() => {
    // Check URL hash first (e.g., #/checkout)
    const hash = window.location.hash.slice(1); // Remove #
    if (hash) {
      return hash.replace('/', ''); // Convert #/checkout to 'checkout'
    }
    // Don't use localStorage on initial load - always start fresh
    // This prevents blank screen issues in Telegram
    return 'home';
  });

  const [pageData, setPageData] = useState(() => {
    const saved = localStorage.getItem('pageData');
    return saved ? JSON.parse(saved) : {};
  });

  const { user, toggleAdminMode, setUser, setReferredBy } = useContext(UserContext);

  // Initialize Telegram WebApp
  useEffect(() => {
    const initApp = async () => {
      console.log('🚀 Initializing app...');
      const tg = await initTelegramWebApp();

      if (tg) {
        console.log('✅ Telegram WebApp initialized');
        console.log('Platform:', tg.platform);
        console.log('Version:', tg.version);

        // Get Telegram user data
        const tgUser = getTelegramUser();
        if (tgUser) {
          console.log('Telegram User:', tgUser);

          // Update user with Telegram data
          setUser(prev => ({
            ...prev,
            name: `${tgUser.firstName} ${tgUser.lastName || ''}`.trim(),
            telegramId: tgUser.id,
            username: tgUser.username || '',
            photoUrl: tgUser.photoUrl || ''
          }));
        }

        // Check for referral code
        const refCode = getReferralCode();
        if (refCode && user) {
          console.log('Referral code detected:', refCode);

          // Prevent self-referral
          if (refCode === user.referralCode) {
            alert('❌ You cannot use your own referral code!');
            return;
          }

          // Save referral code if user hasn't been referred before
          if (!user.referredBy) {
            await setReferredBy(refCode);
            console.log('✅ Referral code saved to database');
            alert(`🎉 Welcome! You've been referred by a friend!\n\nYou'll earn bonus points from your purchases!`);
          } else {
            console.log('User already has a referrer');
          }
        }
      } else {
        console.log('ℹ️ Not running in Telegram - using demo mode');
      }
    };

    initApp();
  }, [setUser, setReferredBy, user?.referralCode, user?.referredBy]);

  const inTelegram = isInTelegram();

  const navigate = (page, data = {}) => {
    setCurrentPage(page);
    setPageData(data);
    // Save to localStorage
    localStorage.setItem('currentPage', page);
    localStorage.setItem('pageData', JSON.stringify(data));
    // Update URL hash
    window.location.hash = `/${page}`;
    window.scrollTo(0, 0);
  };

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1).replace('/', '');
      if (hash && hash !== currentPage) {
        setCurrentPage(hash || 'home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentPage]);

  // Save current page and data to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
    localStorage.setItem('pageData', JSON.stringify(pageData));
  }, [currentPage, pageData]);

  const getPageTitle = () => {
    switch (currentPage) {
      case 'home':
        return 'Ailem';
      case 'shop':
        return 'Shop';
      case 'product':
        return 'Product Details';
      case 'cart':
        return 'Shopping Cart';
      case 'checkout':
        return 'Checkout';
      case 'payment':
        return 'Payment';
      case 'profile':
        return 'Profile';
      case 'orderHistory':
        return 'Order History';
      case 'orderDetails':
        return 'Order Details';
      case 'myReviews':
        return 'My Reviews';
      case 'writeReview':
        return 'Write Review';
      case 'favorites':
        return 'Favorites';
      case 'referrals':
        return 'Referrals';
      case 'admin':
        return 'Admin Panel';
      default:
        return 'Ailem';
    }
  };

  const showHeader = !['home', 'admin', 'referrals', 'profile', 'favorites', 'orderHistory', 'orderDetails', 'myReviews', 'writeReview'].includes(currentPage);
  const showSearch = ['shop'].includes(currentPage);

  // Only show loading for a short time - then show content anyway
  // This prevents blank screen issues in Telegram
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    // Hide loading screen after 2 seconds even if still loading
    const timer = setTimeout(() => setShowLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while data is being fetched (max 2 seconds)
  if ((adminLoading || userLoading) && showLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <h2 className="text-white text-xl font-semibold mb-2">Loading Ailem Store...</h2>
          <p className="text-white/80 text-sm">Connecting to database</p>
        </div>
      </div>
    );
  }

  // Show error screen if data loading failed
  if (adminError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-gray-800 text-xl font-semibold mb-2">Failed to Load Data</h2>
          <p className="text-gray-600 text-sm mb-4">{adminError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('📄 App rendering:', {
    currentPage,
    adminLoading,
    userLoading,
    showLoading,
    categoriesCount: products?.length || 0
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Mode Toggle - Always visible */}
      {user && (
        <button
          onClick={toggleAdminMode}
          className="fixed top-4 right-4 z-50 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg hover:bg-gray-800"
        >
          {user.isAdmin ? '👑 Admin' : '👤 User'}
        </button>
      )}

      {/* Header - Search functionality removed, now managed in ShopPage */}
      {showHeader && (
        <Header
          title={getPageTitle()}
          showSearch={false}
        />
      )}

      {/* Main Content */}
      <main className="max-w-mobile mx-auto bg-white min-h-screen">
        {console.log('🏠 Rendering home page:', currentPage === 'home')}
        {currentPage === 'home' && <HomePage onNavigate={navigate} />}

        {currentPage === 'shop' && (
          <ShopPage
            onNavigate={navigate}
            initialCategory={pageData.category}
          />
        )}

        {currentPage === 'product' && (
          <ProductPage
            productId={pageData.productId}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'cart' && <CartPage onNavigate={navigate} />}

        {currentPage === 'checkout' && <CheckoutPage onNavigate={navigate} />}

        {currentPage === 'payment' && (
          <PaymentPage
            checkoutData={pageData.checkoutData}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'profile' && <ProfilePage onNavigate={navigate} />}

        {currentPage === 'orderHistory' && <OrderHistoryPage onNavigate={navigate} />}

        {currentPage === 'orderDetails' && (
          <OrderDetailsPage
            orderId={pageData.orderId}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'myReviews' && <MyReviewsPage onNavigate={navigate} />}

        {currentPage === 'writeReview' && <WriteReviewPage onNavigate={navigate} pageData={pageData} />}

        {currentPage === 'favorites' && <FavoritesPage onNavigate={navigate} />}

        {currentPage === 'referrals' && <ReferralsPage />}

        {currentPage === 'admin' && user?.isAdmin && <AdminPanel />}
      </main>

      {/* Bottom Navigation */}
      {(!user || !user.isAdmin) && (
        <BottomNav currentPage={currentPage} onNavigate={navigate} />
      )}

      {/* Admin Quick Access */}
      {user?.isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 bg-primary text-white shadow-lg z-50">
          <div className="max-w-mobile mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">👑 Admin Mode</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('admin')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === 'admin'
                    ? 'bg-accent text-white'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                Admin Panel
              </button>
              <button
                onClick={() => navigate('home')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === 'home'
                    ? 'bg-accent text-white'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                Store View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
