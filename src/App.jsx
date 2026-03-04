import { useState, useContext, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { UserContext } from './context/UserContext';
import { AdminContext } from './context/AdminContext';
import BottomNav from './components/layout/BottomNav';
import Header from './components/layout/Header';
import CategoryNavBar from './components/layout/CategoryNavBar';
import Footer from './components/layout/Footer';
import TelegramChatButton from './components/common/TelegramChatButton';

// Critical pages - load immediately
import HomePage from './components/pages/HomePage';
import ShopPage from './components/pages/ShopPage';
import CartPage from './components/pages/CartPage';

// Auto-reload on chunk load failure (stale cache after deployment)
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      // Chunk failed to load — force reload once
      const reloaded = sessionStorage.getItem('chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
      }
      return importFn();
    })
  );
}

// Lazy load non-critical pages
const ProductPage = lazyWithRetry(() => import('./components/pages/ProductPage'));
const CheckoutPage = lazyWithRetry(() => import('./components/pages/CheckoutPage'));
const PaymentPage = lazyWithRetry(() => import('./components/pages/PaymentPage'));
const PaymentStatusPage = lazyWithRetry(() => import('./components/pages/PaymentStatusPage'));
const AccountPage = lazyWithRetry(() => import('./components/pages/AccountPage'));
const ProfilePage = lazyWithRetry(() => import('./components/pages/ProfilePage'));
const OrderHistoryPage = lazyWithRetry(() => import('./components/pages/OrderHistoryPage'));
const OrderDetailsPage = lazyWithRetry(() => import('./components/pages/OrderDetailsPage'));
const MyReviewsPage = lazyWithRetry(() => import('./components/pages/MyReviewsPage'));
const WriteReviewPage = lazyWithRetry(() => import('./components/pages/WriteReviewPage'));
const FavoritesPage = lazyWithRetry(() => import('./components/pages/FavoritesPage'));
const ReferralsPage = lazyWithRetry(() => import('./components/pages/ReferralsPage'));
const LoginPage = lazyWithRetry(() => import('./components/pages/LoginPage'));
const AdminAuth = lazyWithRetry(() => import('./components/AdminAuth'));
const CashierMode = lazyWithRetry(() => import('./components/cashier/CashierMode'));
import { loadFromLocalStorage, saveToLocalStorage, removeFromLocalStorage } from './utils/helpers';

// Map page names to URL paths
const PAGE_TO_PATH = {
  home: '/',
  shop: '/shop',
  cart: '/cart',
  checkout: '/checkout',
  payment: '/payment',
  paymentStatus: '/payment/status',
  account: '/account',
  profile: '/profile',
  orderHistory: '/orders',
  myReviews: '/reviews',
  favorites: '/favorites',
  referrals: '/referrals',
  login: '/login',
  admin: '/admin',
};

// Parse URL path to page name + data
function parseURL() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Admin detection — ?admin=true query param takes priority
  if (params.get('admin') === 'true' || path === '/admin') {
    return { page: 'admin', data: {} };
  }

  // Product deep links: /product/:id
  const productMatch = path.match(/^\/product\/(.+)$/);
  if (productMatch) {
    return { page: 'product', data: { productId: productMatch[1] } };
  }

  // Order details: /orders/:id
  const orderMatch = path.match(/^\/orders\/(.+)$/);
  if (orderMatch) {
    return { page: 'orderDetails', data: { orderId: orderMatch[1] } };
  }

  // Reviews write: /reviews/write
  if (path === '/reviews/write') {
    return { page: 'writeReview', data: {} };
  }

  // Payment status: /payment/status?order=X&method=Y
  if (path === '/payment/status') {
    return {
      page: 'paymentStatus',
      data: {
        orderId: params.get('order'),
        paymentMethod: params.get('method')
      }
    };
  }

  // Reverse lookup: path → page name
  for (const [pageName, pagePath] of Object.entries(PAGE_TO_PATH)) {
    if (path === pagePath) {
      return { page: pageName, data: {} };
    }
  }

  // Unknown path → default to home
  return { page: 'home', data: {} };
}

function App() {
  const { loading: adminLoading, error: adminError } = useContext(AdminContext);
  const [currentPage, setCurrentPage] = useState('home');
  const [pageData, setPageData] = useState({});

  const { user, setReferredBy } = useContext(UserContext);

  // Check if user is a cashier
  const isCashier = user?.role === 'cashier';

  // Track if referral has been processed
  const referralProcessed = useRef(false);

  // Dynamic page titles for SEO
  const PAGE_TITLES = {
    home: 'Ailem — Uy tekstillari | ailem.uz',
    shop: 'Mahsulotlar — Ailem',
    cart: 'Savat — Ailem',
    checkout: 'Buyurtma rasmiylashtirish — Ailem',
    payment: "To'lov — Ailem",
    paymentStatus: "To'lov holati — Ailem",
    account: 'Kabinet — Ailem',
    profile: 'Profil — Ailem',
    orderHistory: 'Buyurtmalar tarixi — Ailem',
    myReviews: 'Mening sharhlarim — Ailem',
    favorites: 'Sevimlilar — Ailem',
    referrals: 'Referrallar — Ailem',
    login: 'Kirish — Ailem',
  };

  useEffect(() => {
    const title = PAGE_TITLES[currentPage] || 'Ailem — Uy tekstillari';
    document.title = title;
  }, [currentPage]);

  // Load pageData from localStorage after mount
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (initialLoadDone.current) return;

    const savedPageData = loadFromLocalStorage('pageData', {});
    if (savedPageData && Object.keys(savedPageData).length > 0) {
      setPageData(savedPageData);
    }

    initialLoadDone.current = true;
  }, []);

  // Navigate function — pushState routing
  const navigate = useCallback((page, data = {}) => {
    setCurrentPage(page);
    setPageData(data);

    // Build the URL path
    let path;
    if (page === 'admin') {
      path = '/?admin=true';
    } else if (page === 'product' && data.productId) {
      path = `/product/${data.productId}`;
    } else if (page === 'orderDetails' && data.orderId) {
      path = `/orders/${data.orderId}`;
    } else if (page === 'paymentStatus') {
      const params = new URLSearchParams();
      if (data.orderId) params.set('order', data.orderId);
      if (data.paymentMethod) params.set('method', data.paymentMethod);
      path = `/payment/status?${params}`;
    } else if (page === 'writeReview') {
      path = '/reviews/write';
    } else {
      path = PAGE_TO_PATH[page] || `/${page}`;
    }

    window.history.pushState({ page, data }, '', path);

    // Save to localStorage for page data persistence
    if (page !== 'admin') {
      saveToLocalStorage('currentPage', page);
      saveToLocalStorage('pageData', data);
    }

    window.scrollTo(0, 0);
  }, []);

  // URL parsing on mount + popstate handler
  useEffect(() => {
    // Backward compatibility: redirect hash-based URLs to pathname URLs
    if (window.location.hash.startsWith('#')) {
      const hash = window.location.hash;
      // Handle old format: /#paymentStatus?order=X&method=Y or /#/shop
      const hashParts = hash.replace('#', '').replace('/', '').split('?');
      const hashPage = hashParts[0];
      const hashQuery = hashParts[1] ? `?${hashParts[1]}` : '';

      if (hashPage) {
        const newPath = PAGE_TO_PATH[hashPage] || `/${hashPage}`;
        window.history.replaceState({}, '', newPath + hashQuery);
      }
    }

    // Parse initial URL
    const { page, data } = parseURL();
    setCurrentPage(page);
    if (Object.keys(data).length > 0) setPageData(data);

    // Handle browser back/forward
    const handlePopState = (event) => {
      if (event.state?.page) {
        setCurrentPage(event.state.page);
        setPageData(event.state.data || {});
      } else {
        const parsed = parseURL();
        setCurrentPage(parsed.page);
        setPageData(parsed.data);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle referral codes from URL (?ref=CODE)
  useEffect(() => {
    if (referralProcessed.current || !user || user.isGuest) return;

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');

    if (refCode) {
      referralProcessed.current = true;

      // Clean ref param from URL
      const url = new URL(window.location);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.pathname + url.search);

      // Prevent self-referral
      if (refCode === user.referralCode) {
        alert('Siz o\'zingizning referral kodingizni ishlata olmaysiz!');
        return;
      }

      // Save referral code if user hasn't been referred before
      if (!user.referredBy && setReferredBy) {
        setReferredBy(refCode).then(() => {
          alert('Xush kelibsiz! Siz do\'stingiz orqali taklif qilindingiz!');
        });
      }
    }
  }, [user?.id]);

  // Check for pending payment when app loads
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    // Also check hash for backward compat (old payment return URLs)
    const hash = window.location.hash;
    const hashParts = hash.split('?');
    const hashParams = hashParts[1] ? new URLSearchParams(hashParts[1]) : null;

    const urlOrderId = urlParams.get('order') || (hashParams && hashParams.get('order'));
    const urlPaymentMethod = urlParams.get('method') || (hashParams && hashParams.get('method'));

    if (urlOrderId && urlPaymentMethod) {
      removeFromLocalStorage('pendingPayment');
      navigate('paymentStatus', { orderId: urlOrderId, paymentMethod: urlPaymentMethod });
      return;
    }

    // Check localStorage for pending payment
    const pendingPayment = loadFromLocalStorage('pendingPayment');

    if (pendingPayment) {
      const { orderId, paymentMethod, timestamp } = pendingPayment;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (timestamp > oneHourAgo) {
        removeFromLocalStorage('pendingPayment');
        navigate('paymentStatus', { orderId, paymentMethod });
      } else {
        removeFromLocalStorage('pendingPayment');
      }
    }
  }, [navigate]);

  // Disable context menu on all images
  useEffect(() => {
    const preventContextMenu = (e) => {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, []);

  // Show loading screen while data is being fetched
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <h2 className="text-white text-xl font-semibold mb-2">Ailem yuklanmoqda...</h2>
          <p className="text-white/80 text-sm">Ma'lumotlar bazasiga ulanmoqda</p>
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
          <h2 className="text-gray-800 text-xl font-semibold mb-2">Ma'lumotlarni yuklashda xatolik</h2>
          <p className="text-gray-600 text-sm mb-4">{adminError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  // Loading fallback for lazy components
  const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  // Cashiers see a completely different interface
  if (isCashier) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<PageLoader />}>
          <CashierMode />
        </Suspense>
      </div>
    );
  }

  // Pages that should hide the global header (they have their own)
  const hideGlobalHeader = ['admin', 'login'].includes(currentPage);
  // Pages that should hide the bottom nav
  const hideBottomNav = ['admin', 'login', 'payment', 'paymentStatus', 'checkout'].includes(currentPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Header — hidden on admin and login pages */}
      {!hideGlobalHeader && (
        <>
          <Header onNavigate={navigate} currentPage={currentPage} />
          <CategoryNavBar onNavigate={navigate} currentCategory={pageData.category} />
        </>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto bg-white min-h-screen">
        <Suspense fallback={<PageLoader />}>
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

          {currentPage === 'referrals' && <ReferralsPage onNavigate={navigate} />}

          {currentPage === 'login' && (
            <LoginPage
              onNavigate={navigate}
              returnTo={pageData.returnTo}
            />
          )}

          {currentPage === 'admin' && <AdminAuth />}
        </Suspense>
      </main>

      {/* Footer — desktop only */}
      {!hideGlobalHeader && (
        <Footer onNavigate={navigate} />
      )}

      {/* Bottom Navigation */}
      {!hideBottomNav && (
        <BottomNav currentPage={currentPage} onNavigate={navigate} />
      )}

      {/* Telegram Chat Button */}
      {!hideGlobalHeader && <TelegramChatButton />}
    </div>
  );
}

export default App;
