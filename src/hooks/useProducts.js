import { useContext, useState, useMemo, useEffect } from 'react';
import { AdminContext } from '../context/AdminContext';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';
import { getTotalVariantStock } from '../utils/variants';
import { t } from '../utils/translation-fallback';

export const useProducts = () => {
  const { products, orders } = useContext(AdminContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return loadFromLocalStorage('selectedCategory', t('shop.all'));
  });
  const [selectedPriceRange, setSelectedPriceRange] = useState(t('shop.all'));
  const [selectedMaterial, setSelectedMaterial] = useState(t('shop.all'));
  const [selectedColor, setSelectedColor] = useState(t('shop.all'));
  const [selectedSize, setSelectedSize] = useState(t('shop.all'));
  const [sortBy, setSortBy] = useState('newest');

  // Save category to localStorage whenever it changes
  useEffect(() => {
    saveToLocalStorage('selectedCategory', selectedCategory);
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Helper function to get stock for a product (considering variants)
    const getProductStock = (product) => {
      const hasVariants = product.variants && product.variants.length > 0;
      return hasVariants ? getTotalVariantStock(product.variants) : (product.stock || 0);
    };

    // Filter out hidden products (only show visible products to customers)
    filtered = filtered.filter(product => product.visible !== false);

    // Filter by category
    if (selectedCategory !== t('shop.all')) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by price range
    if (selectedPriceRange !== t('shop.all')) {
      filtered = filtered.filter(product => {
        const price = product.price;
        switch (selectedPriceRange) {
          case 'under-50000':
            return price < 50000;
          case '50000-100000':
            return price >= 50000 && price < 100000;
          case '100000-200000':
            return price >= 100000 && price < 200000;
          case '200000-300000':
            return price >= 200000 && price < 300000;
          case 'over-300000':
            return price >= 300000;
          default:
            return true;
        }
      });
    }

    // Filter by material
    if (selectedMaterial !== t('shop.all')) {
      filtered = filtered.filter(product =>
        product.material && product.material.toLowerCase() === selectedMaterial.toLowerCase()
      );
    }

    // Filter by color
    if (selectedColor !== t('shop.all')) {
      filtered = filtered.filter(product =>
        product.colors && product.colors.includes(selectedColor)
      );
    }

    // Filter by size
    if (selectedSize !== t('shop.all')) {
      filtered = filtered.filter(product =>
        product.sizes && product.sizes.includes(selectedSize)
      );
    }

    // Filter by search query - ONLY searches tags
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.tags && product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort products
    switch (sortBy) {
      case 'cheapest':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'expensive':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'newest':
      default:
        // Newest first (assuming higher IDs are newer)
        filtered.sort((a, b) => b.id - a.id);
        break;
    }

    // Always move out-of-stock products to the end while preserving sort order
    filtered.sort((a, b) => {
      const aStock = getProductStock(a);
      const bStock = getProductStock(b);

      // If both in stock or both out of stock, maintain current order
      if ((aStock > 0 && bStock > 0) || (aStock === 0 && bStock === 0)) {
        return 0;
      }

      // Move out-of-stock to end
      return aStock === 0 ? 1 : -1;
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedPriceRange, selectedMaterial, selectedColor, selectedSize, sortBy]);

  const getProductById = (id) => {
    // Handle both numeric IDs (legacy) and UUID strings (Supabase)
    return products.find(product => product.id === id || product.id === parseInt(id));
  };

  // Calculate best sellers based on actual order data
  const featuredProducts = useMemo(() => {
    // Helper to get stock
    const getProductStock = (product) => {
      const hasVariants = product.variants && product.variants.length > 0;
      return hasVariants ? getTotalVariantStock(product.variants) : (product.stock || 0);
    };

    // Only count completed/delivered orders (exclude cancelled)
    const validOrders = (orders || []).filter(order =>
      order.status !== 'cancelled' && order.status !== 'refunded'
    );

    // Count total quantity sold per product
    const salesCount = {};
    validOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.productId || item.id;
          if (productId) {
            salesCount[productId] = (salesCount[productId] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    // Sort products by sales count
    const productsWithSales = products
      .filter(product => getProductStock(product) > 0) // Only in-stock products
      .map(product => ({
        ...product,
        totalSold: salesCount[product.id] || 0
      }))
      .sort((a, b) => b.totalSold - a.totalSold);

    // If we have sales data, return top sellers
    const topSellers = productsWithSales.filter(p => p.totalSold > 0).slice(0, 6);

    // Fallback: if no sales data, show products with BEST SELLER badge or newest products
    if (topSellers.length === 0) {
      const badgedProducts = products
        .filter(p => p.badge === 'BEST SELLER' && getProductStock(p) > 0)
        .slice(0, 6);

      if (badgedProducts.length > 0) {
        return badgedProducts;
      }

      // Last fallback: show newest in-stock products
      return products
        .filter(p => getProductStock(p) > 0)
        .slice(0, 6);
    }

    return topSellers;
  }, [products, orders]);

  const getFeaturedProducts = () => featuredProducts;

  return {
    products: filteredProducts,
    allProducts: products,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedPriceRange,
    setSelectedPriceRange,
    selectedMaterial,
    setSelectedMaterial,
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    sortBy,
    setSortBy,
    getProductById,
    getFeaturedProducts,
    featuredProducts
  };
};
