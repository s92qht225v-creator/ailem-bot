import { useState, useEffect, useContext } from 'react';
import CountdownTimer from '../common/CountdownTimer';
import ProductCard from '../product/ProductCard';
import { AdminContext } from '../../context/AdminContext';
import { useProducts } from '../../hooks/useProducts';

const HomePage = ({ onNavigate }) => {
  const { categories } = useContext(AdminContext);
  const { getFeaturedProducts } = useProducts();
  const featuredProducts = getFeaturedProducts();

  // Load sale banner settings from localStorage (managed in Admin Settings)
  const [saleBanner, setSaleBanner] = useState(() => {
    const saved = localStorage.getItem('saleBanner');
    return saved ? JSON.parse(saved) : {
      title: 'Summer Sale',
      subtitle: 'Up to 50% Off on Selected Items',
      imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=400&fit=crop',
      enabled: true
    };
  });

  // Load sale timer from localStorage (managed in Admin Settings)
  const [saleTimer, setSaleTimer] = useState(() => {
    const saved = localStorage.getItem('saleTimer');
    return saved ? JSON.parse(saved) : {
      endDate: '2025-12-31T23:59:59',
      enabled: true
    };
  });

  // Listen for changes to settings
  useEffect(() => {
    const handleStorageChange = () => {
      const savedBanner = localStorage.getItem('saleBanner');
      const savedTimer = localStorage.getItem('saleTimer');

      if (savedBanner) {
        setSaleBanner(JSON.parse(savedBanner));
      }
      if (savedTimer) {
        setSaleTimer(JSON.parse(savedTimer));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saleEndDate = new Date(saleTimer.endDate);

  return (
    <div className="pb-20">
      {/* Hero Banner - Only show if enabled in settings */}
      {saleBanner.enabled && (
        <div className="relative h-64 bg-gradient-to-r from-primary to-gray-700">
          <img
            src={saleBanner.imageUrl}
            alt="Hero Banner"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
            <h2 className="text-3xl font-bold mb-2 text-center">{saleBanner.title}</h2>
            <p className="text-lg mb-4">{saleBanner.subtitle}</p>
          </div>
        </div>
      )}

      {/* Countdown Timer - Only show if timer is enabled */}
      {saleTimer.enabled && (
        <div className="bg-white shadow-md py-6 px-4 mb-6">
          <h3 className="text-center font-semibold text-gray-700 mb-3">Sale Ends In</h3>
          <CountdownTimer endDate={saleEndDate} />
        </div>
      )}

      {/* Categories */}
      <div className="px-4 mb-6">
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
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{category.name}</span>
              </div>
            </button>
          )) : (
            <div className="col-span-2 text-center text-gray-500 py-8">
              No categories available
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
        <div className="grid grid-cols-2 gap-4">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={(id) => onNavigate('product', { productId: id })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
