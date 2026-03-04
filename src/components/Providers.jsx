'use client';

import ErrorBoundary from './ErrorBoundary';
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import { UserProvider } from '../context/UserContext';
import { AdminProvider } from '../context/AdminContext';
import { PickupPointsProvider } from '../context/PickupPointsContext';
import { ShippingRatesProvider } from '../context/ShippingRatesContext';
import { CartProvider } from '../context/CartContext';
import GlobalEffects from './GlobalEffects';

// Wraps children with all 7 context providers in the same order as main.jsx
export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <UserProvider>
            <AdminProvider>
              <PickupPointsProvider>
                <ShippingRatesProvider>
                  <CartProvider>
                    {children}
                    <GlobalEffects />
                  </CartProvider>
                </ShippingRatesProvider>
              </PickupPointsProvider>
            </AdminProvider>
          </UserProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
