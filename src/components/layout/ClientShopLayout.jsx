'use client';

import { useContext, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AdminContext } from '../../context/AdminContext';
import { UserContext } from '../../context/UserContext';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import TelegramChatButton from '../common/TelegramChatButton';
import { useAppNavigate } from '../../hooks/useAppNavigate';

// Page loader for suspense boundaries
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function ClientShopLayout({ children }) {
  const { loading: adminLoading, error: adminError } = useContext(AdminContext);
  const { user } = useContext(UserContext);
  const pathname = usePathname();
  const onNavigate = useAppNavigate();

  // Cashier mode: redirect to dedicated interface
  const isCashier = user?.role === 'cashier';

  // Determine which page we're on from the pathname
  const isLoginPage = pathname === '/login';
  const isAdminPage = pathname === '/admin';
  const isPaymentPage = pathname === '/payment';
  const isPaymentStatusPage = pathname.startsWith('/payment/status');
  const isCheckoutPage = pathname === '/checkout';

  const hideGlobalHeader = isAdminPage || isLoginPage;
  const hideBottomNav =
    isAdminPage || isLoginPage || isPaymentPage || isPaymentStatusPage || isCheckoutPage;

  // Show loading screen while data is being fetched
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <h2 className="text-white text-xl font-semibold mb-2">
            Ailem yuklanmoqda...
          </h2>
          <p className="text-white/80 text-sm">
            Ma&apos;lumotlar bazasiga ulanmoqda
          </p>
        </div>
      </div>
    );
  }

  // Show error screen if data loading failed
  if (adminError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">&#9888;&#65039;</div>
          <h2 className="text-gray-800 text-xl font-semibold mb-2">
            Ma&apos;lumotlarni yuklashda xatolik
          </h2>
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

  // Cashier mode
  if (isCashier) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideGlobalHeader && (
        <Header onNavigate={onNavigate} currentPage={pathname} />
      )}

      <main className="max-w-6xl mx-auto bg-white min-h-screen">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>

      {!hideGlobalHeader && <Footer onNavigate={onNavigate} />}

      {!hideBottomNav && <BottomNav currentPage={pathname} onNavigate={onNavigate} />}

      {!hideGlobalHeader && <TelegramChatButton />}
    </div>
  );
}
