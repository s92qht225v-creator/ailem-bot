import { useContext, useState, useMemo, useEffect } from 'react';
import { AdminContext } from '../context/AdminContext';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';

export const useProducts = () => {
  const { products } = useContext(AdminContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return loadFromLocalStorage('selectedCategory', 'All');
  });
  const [selectedPriceRange, setSelectedPriceRange] = useState('All');
  const [selectedMaterial, setSelectedMaterial] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [selectedSize, setSelectedSize] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Save category to localStorage whenever it changes
  useEffect(() => {
    saveToLocalStorage('selectedCategory', selectedCategory);
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by price range
    if (selectedPriceRange !== 'All') {
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
    if (selectedMaterial !== 'All') {
      filtered = filtered.filter(product =>
        product.material && product.material.toLowerCase() === selectedMaterial.toLowerCase()
      );
    }

    // Filter by color
    if (selectedColor !== 'All') {
      filtered = filtered.filter(product =>
        product.colors && product.colors.includes(selectedColor)
      );
    }

    // Filter by size
    if (selectedSize !== 'All') {
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

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedPriceRange, selectedMaterial, selectedColor, selectedSize, sortBy]);

  const getProductById = (id) => {
    // Handle both numeric IDs (legacy) and UUID strings (Supabase)
    return products.find(product => product.id === id || product.id === parseInt(id));
  };

  const featuredProducts = useMemo(() => {
    return products.filter(product => product.badge === 'BEST SELLER').slice(0, 6);
  }, [products]);

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
