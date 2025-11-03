import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../context/UserContext';
import { AdminContext } from '../../context/AdminContext';
import ProductCard from '../product/ProductCard';
import CountdownTimer from '../common/CountdownTimer';
import Carousel from '../common/Carousel';
import { settingsAPI } from '../../services/api';
import { loadFromLocalStorage, saveToLocalStorage } from '../../utils/helpers';
import { useProducts } from '../../hooks/useProducts';
import { useTranslation } from '../../hooks/useTranslation';

const HomePage = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { categories, loading } = useContext(AdminContext);
  const { toggleFavorite, isFavorite } = useContext(UserContext);
  const { featuredProducts } = useProducts();

  // Load cached settings immediately for instant display
  // IMPORTANT: ALL hooks must be called before any conditional returns!
  const [banners, setBanners] = useState(() => {
    const cached = loadFromLocalStorage('cachedBanners');
    // Support both old single banner format and new array format
    if (cached) {
      return Array.isArray(cached) ? cached : [cached];
    }
    // Fallback to old single banner cache if exists
    const oldBanner = loadFromLocalStorage('cachedSaleBanner');
    return oldBanner ? [oldBanner] : [];
  });
  const [saleTimer, setSaleTimer] = useState(() => {
    const cached = loadFromLocalStorage('cachedSaleTimer');
    return cached || null;
  });

  // Load fresh settings from Supabase in background
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsAPI.getSettings();
        console.log('🏠 HomePage loading settings from Supabase:', settings);
        
        // Handle both array (new) and single banner (old) format
        if (settings.banners) {
          // New array format
          setBanners(settings.banners);
          saveToLocalStorage('cachedBanners', settings.banners);
        } else if (settings.sale_banner) {
          // Old single banner format - convert to array
          setBanners([settings.sale_banner]);
          saveToLocalStorage('cachedBanners', [settings.sale_banner]);
        }
        
        if (settings.sale_timer) {
          setSaleTimer(settings.sale_timer);
          saveToLocalStorage('cachedSaleTimer', settings.sale_timer);
        }
      } catch (error) {
        console.error('Failed to load settings from Supabase:', error);
        // Keep using cached values, don't override with defaults
      }
    };
    loadSettings();
  }, []);

  const saleEndDate = saleTimer ? new Date(saleTimer.endDate) : null;

  // Show loading state if no data yet (AFTER all hooks are called)
  if (loading && (!categories || categories.length === 0)) {
    return (
      <div className="pb-20 px-4 pt-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Logo Space */}
      <div className="pt-16"></div>

      {/* Hero Banner Carousel - Only show if there are enabled banners */}
      <Carousel banners={banners} autoSlideInterval={5000} />

      {/* Countdown Timer - Only show if timer is enabled */}
      {saleTimer && saleTimer.enabled && saleEndDate && (
        <div className="bg-white shadow-md py-6 px-4 mb-6">
          <h3 className="text-center font-semibold text-gray-700 mb-3">{t('home.saleEnds')}</h3>
          <CountdownTimer endDate={saleEndDate} />
        </div>
      )}

      {/* Categories */}
      <div className="px-4 mb-6 pt-6">
        <h3 className="text-xl font-bold mb-4">{t('nav.categories')}</h3>
        <div className="grid grid-cols-3 gap-4">
          {categories && categories.length > 0 ? categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                onNavigate('shop', { category: category.originalName || category.name });
              }}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-16 flex items-center justify-center">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <span className="text-xs font-medium text-gray-800 text-center uppercase leading-tight">
                {category.name}
              </span>
            </button>
          )) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-gray-500 mb-4">{t('common.loading')}</p>
              <button
                onClick={() => onNavigate('shop')}
                className="bg-accent text-white px-6 py-2 rounded-lg font-semibold"
              >
                {t('shop.allProducts')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Featured Products */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{t('home.bestSellers')}</h3>
          <button
            onClick={() => onNavigate('shop')}
            className="text-accent font-semibold hover:underline"
          >
            {t('home.viewAll')}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={(id) => onNavigate('product', { productId: id })}
              isFavorite={isFavorite(product.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
