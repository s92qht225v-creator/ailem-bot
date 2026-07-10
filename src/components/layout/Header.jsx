import { useContext, useMemo, useState, useRef } from 'react';
import { ShoppingCart, LogIn, Search, Heart, X } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { useCart } from '../../hooks/useCart';
import { useProducts } from '../../hooks/useProducts';
import { getVisibleCartItems, getVisibleFavorites } from '../../utils/helpers';

const Header = ({ onNavigate, currentPage }) => {
  const { user, favorites } = useContext(UserContext);
  const { cartItems } = useCart();
  const { allProducts } = useProducts();
  const [headerSearch, setHeaderSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef(null);

  // Count only purchasable items — matches what CartPage displays, so the badge
  // never shows a phantom count for hidden/removed products.
  const cartCount = useMemo(
    () => getVisibleCartItems(cartItems, allProducts).reduce((c, i) => c + i.quantity, 0),
    [cartItems, allProducts]
  );
  const isGuest = user?.isGuest;

  // Count only favorites whose product is still visible — matches FavoritesPage,
  // so the badge never shows a phantom count for hidden/removed products.
  const favoritesCount = useMemo(
    () => getVisibleFavorites(favorites, allProducts).length,
    [allProducts, favorites]
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = headerSearch.trim();
    onNavigate('shop', q ? { q } : {});
    setMobileSearchOpen(false);
  };

  const handleMobileSearchOpen = () => {
    setMobileSearchOpen(true);
    setTimeout(() => mobileInputRef.current?.focus(), 50);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Mobile search bar overlay */}
        {mobileSearchOpen && (
          <form onSubmit={handleSearchSubmit} className="md:hidden flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={mobileInputRef}
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Mahsulot qidirish..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button type="submit" className="px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium">
              Qidirish
            </button>
            <button type="button" onClick={() => { setMobileSearchOpen(false); setHeaderSearch(''); }} className="p-2 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </form>
        )}

        <div className={`flex items-center justify-between gap-3 ${mobileSearchOpen ? 'hidden md:flex' : ''}`}>
          {/* Logo */}
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.svg" alt="Ailem" className="h-12 w-auto" />
          </a>

          {/* Search Bar — tablet+ */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl mx-4 items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            <Search className="w-5 h-5 flex-shrink-0 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Mahsulot qidirish..."
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            {headerSearch && (
              <button type="button" onClick={() => setHeaderSearch('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Search icon — mobile only */}
            <button
              onClick={handleMobileSearchOpen}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Qidirish"
            >
              <Search className="w-6 h-6" />
            </button>

            {/* Favorites */}
            <a
              href="/favorites"
              onClick={(e) => { e.preventDefault(); onNavigate('favorites'); }}
              className={`relative p-2 rounded-lg transition-colors ${
                currentPage === 'favorites' ? 'text-accent' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Heart className="w-6 h-6" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </a>

            {/* Cart */}
            <a
              href="/cart"
              onClick={(e) => { e.preventDefault(); onNavigate('cart'); }}
              className={`relative p-2 rounded-lg transition-colors ${
                currentPage === '/cart' ? 'text-accent' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </a>

            {/* Login / Avatar */}
            {isGuest ? (
              <a
                href="/login"
                onClick={(e) => { e.preventDefault(); onNavigate('login'); }}
                className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Kirish</span>
              </a>
            ) : (
              <a
                href="/account"
                onClick={(e) => { e.preventDefault(); onNavigate('account'); }}
                className={`p-2 rounded-lg transition-colors ${
                  ['/account', '/profile'].includes(currentPage) ? 'text-accent' : 'text-gray-600 hover:text-gray-900'
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
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
