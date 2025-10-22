import { useContext, useEffect, useState, useMemo } from 'react';
import { UserContext } from '../../context/UserContext';
import { AdminContext } from '../../context/AdminContext';
import ProductCard from '../product/ProductCard';
import CountdownTimer from '../common/CountdownTimer';
import Carousel from '../common/Carousel';
import { settingsAPI } from '../../services/api';
import { loadFromLocalStorage, saveToLocalStorage } from '../../utils/helpers';
import { useProducts } from '../../hooks/useProducts';

const HomePage = ({ onNavigate }) => {
  const { categories, loading } = useContext(AdminContext);
  const { toggleFavorite, isFavorite, favorites } = useContext(UserContext);
  const { featuredProducts } = useProducts();

  // Create a favorites lookup map to avoid calling isFavorite in render
  const favoritesMap = useMemo(() => {
    const map = {};
    featuredProducts.forEach(product => {
      map[product.id] = isFavorite(product.id);
    });
    return map;
  }, [featuredProducts, favorites, isFavorite]);

  // Show loading state if no data yet
  if (loading && (!categories || categories.length === 0)) {
    return (
      <div className="pb-20 px-4 pt-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading store...</p>
        </div>
      </div>
    );
  }

  // Load cached settings immediately for instant display
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

  return (
    <div className="pb-20">
      {/* Hero Banner Carousel - Only show if there are enabled banners */}
      <Carousel banners={banners} autoSlideInterval={5000} />

      {/* Countdown Timer - Only show if timer is enabled */}
      {saleTimer && saleTimer.enabled && saleEndDate && (
        <div className="bg-white shadow-md py-6 px-4 mb-6">
          <h3 className="text-center font-semibold text-gray-700 mb-3">Sale Ends In</h3>
          <CountdownTimer endDate={saleEndDate} />
        </div>
      )}

      {/* Categories */}
      <div className="px-4 mb-6 pt-6">
        <h3 className="text-xl font-bold mb-4">Shop by Category</h3>
        <div className="grid grid-cols-2 gap-4">
          {categories && categories.length > 0 ? categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                onNavigate('shop', { category: category.name });
              }}
              className="relative h-32 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{category.name}</span>
              </div>
            </button>
          )) : (
            <div className="col-span-2 text-center py-8">
              <p className="text-gray-500 mb-4">Loading categories...</p>
              <button
                onClick={() => onNavigate('shop')}
                className="bg-accent text-white px-6 py-2 rounded-lg font-semibold"
              >
                Browse All Products
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Featured Products */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Best Sellers</h3>
          <button
            onClick={() => onNavigate('shop')}
            className="text-accent font-semibold hover:underline"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={(id) => onNavigate('product', { productId: id })}
              isFavorite={favoritesMap[product.id]}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
