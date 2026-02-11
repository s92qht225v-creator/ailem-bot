import ReactDOM from 'react-dom/client'
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import App from './App.jsx'
import './index.css'

// Vercel Analytics & Speed Insights
inject()
injectSpeedInsights()
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { AdminProvider } from './context/AdminContext.jsx'
import { PickupPointsProvider } from './context/PickupPointsContext.jsx'
import { ShippingRatesProvider } from './context/ShippingRatesContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ToastProvider>
      <ConfirmProvider>
        <UserProvider>
          <AdminProvider>
            <PickupPointsProvider>
              <ShippingRatesProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </ShippingRatesProvider>
            </PickupPointsProvider>
          </AdminProvider>
        </UserProvider>
      </ConfirmProvider>
    </ToastProvider>
  </ErrorBoundary>,
)
