import { useContext, useState } from 'react';
import { Package, Award, Settings, HelpCircle, Heart, ChevronRight, MapPin, MessageSquare, LogIn, LogOut } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { useOrders } from '../../hooks/useOrders';
import { formatPrice } from '../../utils/helpers';
import AuthModal from '../common/AuthModal';

const ProfilePage = ({ onNavigate, hideHeader = false }) => {
  const { user, login, logout } = useContext(UserContext);
  const { getUserOrders } = useOrders();
  const userOrders = getUserOrders();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className={hideHeader ? '' : 'pb-20 bg-gray-50 min-h-screen'}>
      {/* Header */}
      {!hideHeader && (
        <div className="bg-white p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 text-center">Profile</h1>
        </div>
      )}

      {/* Profile Info */}
      <div className="bg-white p-6 text-center">
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={user.name}
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-orange-300 shadow-lg"
            onError={(e) => {
              // Fallback to initial if image fails to load
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4"
          style={{ display: user.photoUrl ? 'none' : 'flex' }}
        >
          {getInitial(user.name)}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h2>
        <p className="text-sm text-gray-500">
          {user.phone || (user.username && user.username !== 'guest' ? `@${user.username}` : (user.telegramId ? `ID: ${user.telegramId}` : 'Guest User'))}
        </p>
      </div>

      {/* Menu Cards */}
      <div className="p-4 space-y-3">
        <MenuCard
          icon={Package}
          title="Order History"
          subtitle={userOrders.length > 0 ? `${userOrders.length} orders` : 'No orders yet'}
          onClick={() => onNavigate('orderHistory')}
        />

        <MenuCard
          icon={MapPin}
          title="Saved Addresses"
          subtitle="Manage delivery addresses"
          onClick={() => alert('Saved Addresses coming soon!')}
        />

        <MenuCard
          icon={MessageSquare}
          title="My Reviews"
          subtitle="Reviews for your purchases"
          onClick={() => onNavigate('myReviews')}
        />

        <MenuCard
          icon={Heart}
          title="Favorites"
          subtitle="Your wishlist items"
          onClick={() => onNavigate('favorites')}
        />

        <MenuCard
          icon={Award}
          title="Bonus Points"
          subtitle={`${formatPrice(user.bonusPoints)} earnings`}
          onClick={() => onNavigate('referrals')}
        />

        <MenuCard
          icon={Settings}
          title="Settings"
          subtitle="Account preferences"
          onClick={() => alert('Settings coming soon!')}
        />

        <MenuCard
          icon={HelpCircle}
          title="Help & Support"
          subtitle="Get assistance"
          onClick={() => alert('Support coming soon!')}
        />

        {/* Login/Logout Button */}
        {user && user.id === 'guest' ? (
          <MenuCard
            icon={LogIn}
            title="Login / Sign Up"
            subtitle="Create an account to save your data"
            onClick={() => setShowAuthModal(true)}
          />
        ) : (
          <MenuCard
            icon={LogOut}
            title="Logout"
            subtitle="Sign out of your account"
            onClick={logout}
          />
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={login}
      />
    </div>
  );
};

const MenuCard = ({ icon: Icon, title, subtitle, count, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
    >
      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-gray-700" />
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-semibold text-gray-900 mb-0.5">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </button>
  );
};

export default ProfilePage;
