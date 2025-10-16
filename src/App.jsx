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
import ReferralsPage from './components/pages/ReferralsPage';
import AdminPanel from './components/pages/AdminPanel';
import { initTelegramWebApp, getTelegramUser, getReferralCode } from './utils/telegram';
import { loadFromLocalStorage, saveToLocalStorage, removeFromLocalStorage } from './utils/helpers';

function App() {
  const { loading: adminLoading, error: adminError } = useContext(AdminContext);
  const { loading: userLoading } = useContext(UserContext);
  // Initialize from URL hash or localStorage
  const [currentPage, setCurrentPage] = useState(() => {
    // ALWAYS start on home page in production
    // Clear any stored page data (safe for Telegram Desktop)
    removeFromLocalStorage('currentPage');
    removeFromLocalStorage('pageData');

    // Clear URL hash
    if (typeof window !== 'undefined' && window.location.hash) {
      window.location.hash = '';
    }

    return 'home';
  });

  const [pageData, setPageData] = useState(() => loadFromLocalStorage('pageData', {}));

  const { user, toggleAdminMode, setUser, setReferredBy } = useContext(UserContext);

  // Initialize Telegram WebApp
  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      try {
        const tg = await initTelegramWebApp();

        if (!mounted) return;

        if (tg) {
          // Get Telegram user data
          const tgUser = getTelegramUser();
          if (tgUser && mounted) {

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
          if (refCode && user && mounted) {
            // Prevent self-referral
            if (refCode === user.referralCode) {
              if (tg.showAlert) {
                tg.showAlert('❌ You cannot use your own referral code!');
              }
              return;
            }

            // Save referral code if user hasn't been referred before
            if (!user.referredBy) {
              await setReferredBy(refCode);
              if (tg.showAlert) {
                tg.showAlert('🎉 Welcome! You\'ve been referred by a friend!\n\nYou\'ll earn bonus points from your purchases!');
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error initializing app:', error);
      }
    };

    initApp();

    return () => {
      mounted = false;
    };
  }, [setUser, setReferredBy, user?.referralCode, user?.referredBy]);

  const navigate = (page, data = {}) => {
    setCurrentPage(page);
    setPageData(data);
    // Save to localStorage (safe for Telegram Desktop)
    saveToLocalStorage('currentPage', page);
    saveToLocalStorage('pageData', data);
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
    saveToLocalStorage('currentPage', currentPage);
    saveToLocalStorage('pageData', pageData);
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
      case 'referrals':
        return 'Referrals';
      case 'admin':
        return 'Admin Panel';
      default:
        return 'Ailem';
    }
  };

  const showHeader = !['home', 'admin', 'referrals', 'profile', 'orderHistory', 'orderDetails', 'myReviews', 'writeReview'].includes(currentPage);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Mode Toggle - Always visible */}
      {user && (
        <button
          onClick={() => {
            toggleAdminMode();
            // Navigate to home when switching from admin to user
            if (user.isAdmin) {
              navigate('home');
            }
          }}
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
