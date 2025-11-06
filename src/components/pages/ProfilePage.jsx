import { useContext } from 'react';
import { t } from "../../utils/translation-fallback";
import { Package, Award, Settings, HelpCircle, ChevronRight, MapPin, MessageSquare } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { useOrders } from '../../hooks/useOrders';
import { formatPrice } from '../../utils/helpers';

const ProfilePage = ({ onNavigate, hideHeader = false }) => {
  const { user } = useContext(UserContext);
  const { getUserOrders } = useOrders();
  const userOrders = getUserOrders();

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={hideHeader ? '' : 'pb-20 bg-gray-50 min-h-screen'}>
      {/* Header */}
      {!hideHeader && (
        <div className="bg-white p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 text-center">{t('profile.title')}</h1>
        </div>
      )}

      {/* Profile Info */}
      <div className="bg-white p-6 pt-16 pb-3 text-center">
        {user?.photoUrl ? (
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
          style={{ display: user?.photoUrl ? 'none' : 'flex' }}
        >
          {getInitial(user?.name)}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{user?.name || t('profile.guest')}</h2>
      </div>

      {/* Total Bonus Points Card */}
      <div className="px-4 pt-2">
        <div className="bg-gradient-to-r from-success to-green-600 text-white rounded-xl shadow-md p-6 text-center">
          <Award className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm opacity-90 mb-2">Jami bonus ballar</p>
          <p className="text-4xl font-bold">{formatPrice(user.bonusPoints)}</p>
          <p className="text-sm opacity-90 mt-2">
            Xaridlarda foydalaning yoki do'stlarni taklif qilib ko'proq ishlang
          </p>
        </div>
      </div>

      {/* Menu Cards */}
      <div className="p-4 space-y-3">
        {/* Language Switcher */}

        <MenuCard
          icon={Package}
          title={t('orders.title')}
          subtitle={userOrders.length > 0 ? `${userOrders.length} ${t('orders.title').toLowerCase()}` : t('orders.empty')}
          onClick={() => onNavigate('orderHistory')}
        />

        <MenuCard
          icon={MapPin}
          title={t('profile.addresses')}
          subtitle={t('profile.addressesSubtitle')}
          onClick={() => alert(t('common.comingSoon'))}
        />

        <MenuCard
          icon={MessageSquare}
          title={t('profile.reviews')}
          subtitle={t('profile.reviewsSubtitle')}
          onClick={() => onNavigate('myReviews')}
        />

        <MenuCard
          icon={Settings}
          title={t('profile.settings')}
          subtitle={t('profile.settingsSubtitle')}
          onClick={() => alert(t('common.comingSoon'))}
        />

        <MenuCard
          icon={HelpCircle}
          title={t('profile.help')}
          subtitle={t('profile.helpSubtitle')}
          onClick={() => alert(t('common.comingSoon'))}
        />
      </div>
    </div>
  );
};

const MenuCard = ({ icon: Icon, title, subtitle, onClick }) => {
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
