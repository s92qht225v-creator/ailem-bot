import { useState, useContext, useEffect, lazy, Suspense } from 'react';
import { UserContext } from './context/UserContext';
import { AdminContext } from './context/AdminContext';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';

// Critical pages - load immediately
import HomePage from './components/pages/HomePage';
import ShopPage from './components/pages/ShopPage';
import CartPage from './components/pages/CartPage';

// Lazy load less critical pages
const ProductPage = lazy(() => import('./components/pages/ProductPage'));
const CheckoutPage = lazy(() => import('./components/pages/CheckoutPage'));
const PaymentPage = lazy(() => import('./components/pages/PaymentPage'));
const PaymentStatusPage = lazy(() => import('./components/pages/PaymentStatusPage'));
const AccountPage = lazy(() => import('./components/pages/AccountPage'));
const ProfilePage = lazy(() => import('./components/pages/ProfilePage'));
const OrderHistoryPage = lazy(() => import('./components/pages/OrderHistoryPage'));
const OrderDetailsPage = lazy(() => import('./components/pages/OrderDetailsPage'));
const MyReviewsPage = lazy(() => import('./components/pages/MyReviewsPage'));
const WriteReviewPage = lazy(() => import('./components/pages/WriteReviewPage'));
const FavoritesPage = lazy(() => import('./components/pages/FavoritesPage'));
const ReferralsPage = lazy(() => import('./components/pages/ReferralsPage'));
const AdminPanel = lazy(() => import('./components/pages/AdminPanel'));
const AdminAuth = lazy(() => import('./components/AdminAuth'));
import { loadFromLocalStorage, saveToLocalStorage, removeFromLocalStorage } from './utils/helpers';
import { initTelegramWebApp, getReferralCode } from './utils/telegram';

function App() {
  const { loading: adminLoading, error: adminError } = useContext(AdminContext);
  // Initialize page state - admin detection happens in useEffect
  const [currentPage, setCurrentPage] = useState('home');

  // Initialize pageData as empty object to avoid hydration mismatch
  // Load from localStorage in useEffect after mount
  const [pageData, setPageData] = useState({});

  const { user, setReferredBy, toggleAdminMode } = useContext(UserContext);

  // Load pageData from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const savedPageData = loadFromLocalStorage('pageData', {});
    if (savedPageData && Object.keys(savedPageData).length > 0) {
      setPageData(savedPageData);
    }
  }, []);

  const navigate = (page, data = {}) => {
    setCurrentPage(page);
    setPageData(data);
    
    // Handle admin page navigation
    if (page === 'admin') {
      // Add admin parameter to URL instead of hash
      const currentUrl = new URL(window.location);
      currentUrl.searchParams.set('admin', 'true');
      window.history.pushState({}, '', currentUrl);
    } else {
      // Remove admin parameter and use hash for other pages
      const currentUrl = new URL(window.location);
      currentUrl.searchParams.delete('admin');
      currentUrl.hash = `/${page}`;
      window.history.pushState({}, '', currentUrl);
      
      // Save to localStorage (safe for Telegram Desktop)
      saveToLocalStorage('currentPage', page);
      saveToLocalStorage('pageData', data);
    }
    
    window.scrollTo(0, 0);
  };

  // Monitor URL for admin parameter on mount and URL changes only
  useEffect(() => {
    const checkAdminParam = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const adminParam = urlParams.get('admin');
      const isAdminParam = adminParam === 'true';

      console.log('🔎 URL Check:', {
        url: window.location.href,
        adminParam,
        isAdminParam,
        currentPage,
        userIsAdmin: user?.isAdmin
      });

      // Use callback form to avoid dependency on currentPage
      if (isAdminParam) {
        setCurrentPage((prev) => {
          if (prev !== 'admin') {
            console.log('🔍 Admin access detected - switching to admin page');
            return 'admin';
          }
          return prev;
        });
      } else {
        setCurrentPage((prev) => {
          if (prev === 'admin') {
            console.log('🏠 Admin param removed - returning to home');
            return 'home';
          }
          return prev;
        });
      }
    };
    
    // Check immediately
    checkAdminParam();
    
    // Check on URL changes
    const handleURLChange = () => {
      checkAdminParam();
      
      // Handle hash changes for regular navigation (only if not admin)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') !== 'true') {
        const hash = window.location.hash.slice(1).replace('/', '');
        if (hash) {
          setCurrentPage((prev) => {
            return hash !== prev ? (hash || 'home') : prev;
          });
        }
      }
    };

    window.addEventListener('hashchange', handleURLChange);
    window.addEventListener('popstate', handleURLChange);
    
    return () => {
      window.removeEventListener('hashchange', handleURLChange);
      window.removeEventListener('popstate', handleURLChange);
    };
  }, []);

  // Save current page and data to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage('currentPage', currentPage);
    saveToLocalStorage('pageData', pageData);
  }, [currentPage, pageData]);

  // Initialize Telegram WebApp and handle referral codes
  useEffect(() => {
    const initApp = async () => {
      try {
        const tg = await initTelegramWebApp();

        if (tg) {
          console.log('✅ Telegram WebApp initialized');

          // Check for referral code
          const refCode = getReferralCode();
          if (refCode && user) {
            // Prevent self-referral
            if (refCode === user.referralCode) {
              if (tg.showAlert) {
                tg.showAlert('❌ You cannot use your own referral code!');
              }
              return;
            }

            // Save referral code if user hasn't been referred before
            if (!user.referredBy && setReferredBy) {
              await setReferredBy(refCode);
              if (tg.showAlert) {
                tg.showAlert('🎉 Welcome! You\'ve been referred by a friend!\n\nYou\'ll earn bonus points from your purchases!');
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error initializing Telegram:', error);
      }
    };

    initApp();
  }, [user, setReferredBy]);

  // Check for pending payment when app loads
  useEffect(() => {
    const pendingPayment = loadFromLocalStorage('pendingPayment');
    
    if (pendingPayment) {
      const { orderId, paymentMethod, timestamp } = pendingPayment;
      
      // Only check if payment was initiated recently (within 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (timestamp > oneHourAgo) {
        console.log('💳 Pending payment detected, navigating to status page:', {
          orderId,
          paymentMethod
        });
        
        // Clear the pending payment flag
        removeFromLocalStorage('pendingPayment');
        
        // Navigate to payment status page
        navigate('paymentStatus', { orderId, paymentMethod });
      } else {
        // Payment too old, clear it
        removeFromLocalStorage('pendingPayment');
      }
    }
  }, []); // Run only once on mount

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
      case 'paymentStatus':
        return 'Payment Status';
      case 'account':
        return 'Account';
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

  const showHeader = !['home', 'admin', 'referrals', 'profile', 'favorites', 'orderHistory', 'orderDetails', 'myReviews', 'writeReview', 'account'].includes(currentPage);

  // Only show loading for a short time - then show content anyway
  // This prevents blank screen issues in Telegram
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    // Hide loading screen after 2 seconds even if still loading
    const timer = setTimeout(() => setShowLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while data is being fetched (max 2 seconds)
  if (adminLoading && showLoading) {
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

      {/* Header - Search functionality removed, now managed in ShopPage */}
      {showHeader && (
        <Header
          title={getPageTitle()}
          showSearch={false}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto bg-white min-h-screen">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }>
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

          {currentPage === 'paymentStatus' && (
            <PaymentStatusPage
              orderId={pageData.orderId}
              paymentMethod={pageData.paymentMethod}
              onNavigate={navigate}
            />
          )}

          {currentPage === 'account' && <AccountPage onNavigate={navigate} />}

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

          {currentPage === 'admin' && (
            <AdminAuth>
              <AdminPanel />
            </AdminAuth>
          )}
        </Suspense>
      </main>

      {/* Bottom Navigation - hidden only on admin page */}
      {currentPage !== 'admin' && (
        <BottomNav currentPage={currentPage} onNavigate={navigate} />
      )}
    </div>
  );
}

export default App;
