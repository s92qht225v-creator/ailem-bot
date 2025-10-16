import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { AdminProvider } from './context/AdminContext.jsx'
import { PickupPointsProvider } from './context/PickupPointsContext.jsx'
import { ShippingRatesProvider } from './context/ShippingRatesContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
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
  </ErrorBoundary>,
)
