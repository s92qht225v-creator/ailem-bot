import { useEffect, useMemo, useContext, useState, useRef } from 'react';
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

  // Extract unique materials and colors from all products
  const availableMaterials = useMemo(() => {
    const materials = new Set();
    allProducts.forEach(product => {
      if (product.material) {
        materials.add(product.material);
      }
    });
    return ['All', ...Array.from(materials).sort()];
  }, [allProducts]);

  const availableColors = useMemo(() => {
    const colors = new Set();
    allProducts.forEach(product => {
      if (product.colors) {
        product.colors.forEach(color => colors.add(color));
      }
    });
    return ['All', ...Array.from(colors).sort()];
  }, [allProducts]);

  const availableSizes = useMemo(() => {
    const sizes = new Set();
    allProducts.forEach(product => {
      if (product.sizes) {
        product.sizes.forEach(size => sizes.add(size));
      }
    });
    return ['All', ...Array.from(sizes)];
  }, [allProducts]);

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
      allProducts.forEach(product => {
        // Match product name
        if (product.name.toLowerCase().includes(query)) {
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

        // Match category
        if (product.category && product.category.toLowerCase().includes(query)) {
          suggestions.add(product.category);
        }

        // Match material
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
    categories?.map(c => c.name) || [],
    [categories]
  );

  return (
    <div className="pb-20">
      <div className="px-4 py-4 space-y-4">
        {/* Search Bar with Autocomplete */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products, tags, categories..."
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="flex gap-3 pb-2">
            {/* Material Dropdown */}
            <div className="flex-1 min-w-[140px] relative z-10">
              <CustomDropdown
                value={selectedMaterial}
                onChange={setSelectedMaterial}
                options={availableMaterials}
                placeholder="Material"
              />
            </div>

            {/* Colors Dropdown */}
            <div className="flex-1 min-w-[120px] relative z-10">
              <CustomDropdown
                value={selectedColor}
                onChange={setSelectedColor}
                options={availableColors}
                placeholder="Colors"
              />
            </div>

            {/* Size Dropdown */}
            <div className="flex-1 min-w-[110px] relative z-10">
              <CustomDropdown
                value={selectedSize}
                onChange={setSelectedSize}
                options={availableSizes}
                placeholder="Size"
              />
            </div>
          </div>
        </div>

        {/* Sort By Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sort by</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('newest')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sortBy === 'newest'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              New Arrivals
            </button>
            <button
              onClick={() => setSortBy('cheapest')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sortBy === 'cheapest'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              Cheapest
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sortBy === 'popular'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              Most Popular
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {products.length} product{products.length !== 1 ? 's' : ''} found
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
