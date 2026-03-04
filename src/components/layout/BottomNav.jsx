import { Home, ShoppingBag, ShoppingCart, User, Heart } from 'lucide-react';
import { useContext, useMemo } from 'react';
import { UserContext } from '../../context/UserContext';
import { useCart } from '../../hooks/useCart';
import { useProducts } from '../../hooks/useProducts';

const BottomNav = ({ currentPage, onNavigate }) => {
  const { favorites } = useContext(UserContext);
  const { cartItems } = useCart();
  const { allProducts } = useProducts();

  // Count only visible cart items (hidden products excluded)
  const cartCount = useMemo(() => {
    if (!allProducts.length) return cartItems.reduce((c, i) => c + i.quantity, 0);
    return cartItems
      .filter(item => {
        const liveProduct = allProducts.find(p => p.id === item.id);
        return !liveProduct || liveProduct.visible !== false;
      })
      .reduce((count, item) => count + item.quantity, 0);
  }, [cartItems, allProducts]);

  // Count only favorites that match existing products
  const favoritesCount = useMemo(() => {
    if (!allProducts || !favorites) return 0;
    return favorites.filter(fav => allProducts.some(p => p.id === fav)).length;
  }, [allProducts, favorites]);

  const navItems = [
    { id: 'home', href: '/', icon: Home },
    { id: 'shop', href: '/shop', icon: ShoppingBag },
    { id: 'favorites', href: '/favorites', icon: Heart, badge: favoritesCount },
    { id: 'account', href: '/account', icon: User },
    { id: 'cart', href: '/cart', icon: ShoppingCart, badge: cartCount }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 lg:hidden">
      <div className="max-w-6xl mx-auto px-2">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Account is active when on profile or referrals pages
            const isActive = item.id === 'account'
              ? (['/profile', '/referrals', '/account'].includes(currentPage))
              : currentPage === item.href;

            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => { e.preventDefault(); onNavigate(item.id); }}
                className={`flex items-center justify-center p-3 rounded-lg transition-all ${
                  isActive
                    ? 'text-accent'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-8 h-8 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
