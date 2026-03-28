import { useContext, useEffect, useState, useCallback } from 'react';
import { t } from "../../utils/translation-fallback";
import { Truck, Shield, CreditCard } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { AdminContext } from '../../context/AdminContext';
import { CartContext } from '../../context/CartContext';
import ProductCard from '../product/ProductCard';
import SkeletonCard from '../common/SkeletonCard';
import CountdownTimer from '../common/CountdownTimer';
import Carousel from '../common/Carousel';
import { settingsAPI } from '../../services/api';
import { loadFromLocalStorage, saveToLocalStorage } from '../../utils/helpers';
import { useProducts } from '../../hooks/useProducts';

const HomePage = ({ onNavigate }) => {
  const { categories, loading } = useContext(AdminContext);
  const { toggleFavorite, isFavorite } = useContext(UserContext);
  const { addToCart } = useContext(CartContext);
  const { allProducts } = useProducts();

  // Quick add to cart: if product has variants, navigate to product page; otherwise add directly
  const handleQuickAddToCart = useCallback((product) => {
    const hasVariants = (product.variants && product.variants.length > 0) ||
                       (product.colors && product.colors.length > 0) ||
                       (product.sizes && product.sizes.length > 0);
    if (hasVariants) {
      onNavigate('product', { productId: product.id });
    } else {
      addToCart(product, 1, null, null);
    }
  }, [onNavigate, addToCart]);

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
    <div className="pb-20 lg:pb-8 bg-[#f5f5f5] min-h-screen">
      {/* Hero Banner Carousel - Only show if there are enabled banners */}
      <Carousel banners={banners} autoSlideInterval={5000} onNavigate={onNavigate} />

      {/* Delivery & Trust Info Banner */}
      <div className="mx-4 mb-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-around gap-2 text-center">
          <div className="flex flex-col items-center gap-1">
            <Truck className="w-5 h-5 text-accent" />
            <span className="text-xs font-medium text-gray-700">{t('home.fastDelivery') || 'Tez yetkazish'}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex flex-col items-center gap-1">
            <Shield className="w-5 h-5 text-accent" />
            <span className="text-xs font-medium text-gray-700">{t('home.guarantee') || 'Kafolat'}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex flex-col items-center gap-1">
            <CreditCard className="w-5 h-5 text-accent" />
            <span className="text-xs font-medium text-gray-700">{t('home.securePayment') || "Xavfsiz to'lov"}</span>
          </div>
        </div>
      </div>

      {/* Countdown Timer - Only show if timer is enabled */}
      {saleTimer && saleTimer.enabled && saleEndDate && (
        <div className="bg-white shadow-md py-6 px-4 mb-4">
          <h3 className="text-center font-semibold text-gray-700 mb-3">{t('home.saleEnds')}</h3>
          <CountdownTimer endDate={saleEndDate} />
        </div>
      )}

      {/* Categories */}
      <div className="px-4 mb-4">
        <h3 className="text-xl font-bold mb-4 mt-4">{t('nav.categories')}</h3>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories && categories.length > 0 ? categories.filter(category => category.visible !== false).map((category) => (
            <button
              key={category.id}
              onClick={() => {
                onNavigate('shop', { category: category.name });
              }}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:border-accent hover:shadow-lg hover:-translate-y-1 transition-all duration-200 aspect-square"
            >
              <div className="w-20 h-20 flex items-center justify-center">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-900 text-center leading-tight h-8 flex items-center justify-center">
                {category.name.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase())}
              </span>
            </button>
          )) : (
            <div className="col-span-full text-center py-8">
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

      {/* UZUM Products */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">UZUM da mavjud</h3>
          <button
            onClick={() => onNavigate('shop')}
            className="text-accent font-semibold hover:underline"
          >
            {t('home.viewAll')}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading && allProducts.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : allProducts
              .filter(p => p.visible !== false && p.uzumUrl)
              .map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={(id) => onNavigate('product', { productId: id })}
                isFavorite={isFavorite(product.id)}
                onToggleFavorite={toggleFavorite}
                onQuickAddToCart={handleQuickAddToCart}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
