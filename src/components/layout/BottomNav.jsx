import { Home, ShoppingBag, ShoppingCart, User, Users } from 'lucide-react';
import { useCart } from '../../hooks/useCart';

const BottomNav = ({ currentPage, onNavigate }) => {
  const { getCartItemsCount } = useCart();
  const cartCount = getCartItemsCount();

  const navItems = [
    { id: 'shop', label: 'Shop', icon: ShoppingBag },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: cartCount },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'referrals', label: 'Referrals', icon: Users }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-mobile mx-auto px-2">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all ${
                  isActive
                    ? 'text-accent'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
