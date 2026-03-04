import { useContext } from 'react';
import { ShoppingCart, LogIn, Search } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { useCart } from '../../hooks/useCart';

const Header = ({ onNavigate, currentPage }) => {
  const { user } = useContext(UserContext);
  const { cartItems } = useCart();

  const cartCount = cartItems.reduce((c, i) => c + i.quantity, 0);
  const isGuest = user?.isGuest;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.svg" alt="Ailem" className="h-12 w-auto" />
          </button>

          {/* Search Bar — tablet+ */}
          <button
            onClick={() => onNavigate('shop')}
            className="hidden md:flex flex-1 max-w-xl mx-4 items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-400 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <Search className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Mahsulot qidirish...</span>
          </button>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Search icon — mobile only */}
            <button
              onClick={() => onNavigate('shop')}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Search className="w-6 h-6" />
            </button>

            {/* Cart */}
            <button
              onClick={() => onNavigate('cart')}
              className={`relative p-2 rounded-lg transition-colors ${
                currentPage === 'cart' ? 'text-accent' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Login / Avatar */}
            {isGuest ? (
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Kirish</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('account')}
                className={`p-2 rounded-lg transition-colors ${
                  ['account', 'profile'].includes(currentPage) ? 'text-accent' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {user?.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
