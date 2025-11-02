import { Home, ShoppingBag, ShoppingCart, User, Heart } from 'lucide-react';
import { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { useCart } from '../../hooks/useCart';

const BottomNav = ({ currentPage, onNavigate }) => {
  const { favorites } = useContext(UserContext);
  const { getCartItemsCount } = useCart();
  const cartCount = getCartItemsCount();
  const favoritesCount = favorites?.length || 0;

  const navItems = [
    { id: 'home', icon: Home },
    { id: 'shop', icon: ShoppingBag },
    { id: 'favorites', icon: Heart, badge: favoritesCount },
    { id: 'account', icon: User },
    { id: 'cart', icon: ShoppingCart, badge: cartCount }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-mobile mx-auto px-2">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Account is active when on profile or referrals pages
            const isActive = item.id === 'account'
              ? (currentPage === 'profile' || currentPage === 'referrals' || currentPage === 'account')
              : currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center justify-center p-3 rounded-lg transition-all ${
                  isActive
                    ? 'text-accent'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-7 h-7 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
