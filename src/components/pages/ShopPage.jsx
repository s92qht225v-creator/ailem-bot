import { useEffect, useMemo, useContext, useState, useRef } from 'react';
import { t } from "../../utils/translation-fallback";
import { Search, X } from 'lucide-react';
import CategoryFilter from '../common/CategoryFilter';
import ProductCard from '../product/ProductCard';
import CustomDropdown from '../common/CustomDropdown';
import { useProducts } from '../../hooks/useProducts';
import { AdminContext } from '../../context/AdminContext';
import { UserContext } from '../../context/UserContext';

const ShopPage = ({ onNavigate, initialCategory }) => {
  const { categories } = useContext(AdminContext);
  const { toggleFavorite, isFavorite, favorites } = useContext(UserContext);

  const {
    products,
    allProducts,
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
    setSortBy
  } = useProducts();

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Create a favorites lookup map to avoid calling isFavorite in render
  const favoritesMap = useMemo(() => {
    const map = {};
    products.forEach(product => {
      map[product.id] = isFavorite(product.id);
    });
    return map;
  }, [products, favorites, isFavorite]);

  // Extract unique materials, colors, and sizes from products matching current filters
  // This ensures we only show filter options that have available products
  const getFilteredProductsForOptions = () => {
    let filtered = [...allProducts];

    // Filter out hidden products (only show visible products)
    filtered = filtered.filter(product => product.visible !== false);

    // Apply category filter
    if (selectedCategory !== t('shop.all')) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    return filtered;
  };

  const availableMaterials = useMemo(() => {
    const materials = new Set();
    const filteredProducts = getFilteredProductsForOptions();

    filteredProducts.forEach(product => {
      if (product.material) {
        materials.add(product.material);
      }
    });

    return materials.size > 0 ? [t('shop.all'), ...Array.from(materials).sort()] : [t('shop.all')];
  }, [allProducts, selectedCategory]);

  const availableColors = useMemo(() => {
    const colors = new Set();
    const filteredProducts = getFilteredProductsForOptions();

    // Also apply material filter for colors
    let productsForColors = filteredProducts;
    if (selectedMaterial !== t('shop.all')) {
      productsForColors = productsForColors.filter(product =>
        product.material && product.material.toLowerCase() === selectedMaterial.toLowerCase()
      );
    }

    productsForColors.forEach(product => {
      if (product.colors) {
        product.colors.forEach(color => colors.add(color));
      }
    });

    return colors.size > 0 ? [t('shop.all'), ...Array.from(colors).sort()] : [t('shop.all')];
  }, [allProducts, selectedCategory, selectedMaterial]);

  const availableSizes = useMemo(() => {
    const sizes = new Set();
    const filteredProducts = getFilteredProductsForOptions();

    // Apply material and color filters for sizes
    let productsForSizes = filteredProducts;
    if (selectedMaterial !== t('shop.all')) {
      productsForSizes = productsForSizes.filter(product =>
        product.material && product.material.toLowerCase() === selectedMaterial.toLowerCase()
      );
    }
    if (selectedColor !== t('shop.all')) {
      productsForSizes = productsForSizes.filter(product =>
        product.colors && product.colors.includes(selectedColor)
      );
    }

    productsForSizes.forEach(product => {
      if (product.sizes) {
        product.sizes.forEach(size => sizes.add(size));
      }
    });

    return sizes.size > 0 ? [t('shop.all'), ...Array.from(sizes)] : [t('shop.all')];
  }, [allProducts, selectedCategory, selectedMaterial, selectedColor]);

  // Generate autocomplete suggestions based on search query
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const suggestions = new Set();

      // Extract matching tags, product names, and categories
      // Note: products are already localized by AdminContext based on current language
      allProducts.forEach(product => {
        // Match product name (already localized by API)
        if (product.name && product.name.toLowerCase().includes(query)) {
          suggestions.add(product.name);
        }

        // Match tags
        if (product.tags) {
          product.tags.forEach(tag => {
            if (tag.toLowerCase().includes(query)) {
              suggestions.add(tag);
            }
          });
        }

        // Match category (already localized by API)
        if (product.category && product.category.toLowerCase().includes(query)) {
          suggestions.add(product.category);
        }

        // Match material (already localized by API)
        if (product.material && product.material.toLowerCase().includes(query)) {
          suggestions.add(product.material);
        }
      });

      const sortedSuggestions = Array.from(suggestions)
        .slice(0, 8) // Limit to 8 suggestions
        .sort((a, b) => {
          // Prioritize exact matches
          const aStarts = a.toLowerCase().startsWith(query);
          const bStarts = b.toLowerCase().startsWith(query);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.localeCompare(b);
        });

      setAutocompleteSuggestions(sortedSuggestions);
      setShowAutocomplete(sortedSuggestions.length > 0);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allProducts]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory, setSelectedCategory]);

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowAutocomplete(false);
    searchInputRef.current?.blur();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowAutocomplete(false);
  };

  const categoryNames = useMemo(() =>
    categories?.filter(c => c.visible !== false).map(c => c.name) || [],
    [categories]
  );

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-4 py-4 space-y-4">
        {/* Search Bar with Autocomplete */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('header.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (autocompleteSuggestions.length > 0) {
                setShowAutocomplete(true);
              }
            }}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div
              ref={autocompleteRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {autocompleteSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">
                      {suggestion.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <strong key={i} className="text-accent font-semibold">{part}</strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Filter */}
        <CategoryFilter
          categories={categoryNames}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Filters Section - Horizontal Scroll */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('shop.filters')}</h3>
          <div className="flex gap-3 pb-2 pt-1 px-1 -ml-1 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-visible">
            {/* Material Dropdown */}
            <div className="flex-1 min-w-[140px]">
              <CustomDropdown
                value={selectedMaterial}
                onChange={setSelectedMaterial}
                options={availableMaterials}
                placeholder={t('product.material')}
              />
            </div>

            {/* Colors Dropdown */}
            <div className="flex-1 min-w-[120px]">
              <CustomDropdown
                value={selectedColor}
                onChange={setSelectedColor}
                options={availableColors}
                placeholder={t('product.colors')}
              />
            </div>

            {/* Size Dropdown */}
            <div className="flex-1 min-w-[110px]">
              <CustomDropdown
                value={selectedSize}
                onChange={setSelectedSize}
                options={availableSizes}
                placeholder={t('product.sizes')}
              />
            </div>
          </div>
        </div>

        {/* Sort By Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('shop.sortBy')}</h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-visible pb-2">
            <button
              onClick={() => setSortBy('newest')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                sortBy === 'newest'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {t('shop.sortNewest')}
            </button>
            <button
              onClick={() => setSortBy('cheapest')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                sortBy === 'cheapest'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {t('shop.sortPriceLow')}
            </button>
            <button
              onClick={() => setSortBy('expensive')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                sortBy === 'expensive'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {t('shop.sortPriceHigh')}
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                sortBy === 'popular'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {t('shop.sortPopular')}
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {t('shop.productsFound', { count: products.length })}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('shop.noProducts')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('shop.noResults')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={(id) => onNavigate('product', { productId: id })}
                isFavorite={favoritesMap[product.id]}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
