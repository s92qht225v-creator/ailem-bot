import { useEffect, useMemo, useContext } from 'react';
import { Search } from 'lucide-react';
import CategoryFilter from '../common/CategoryFilter';
import ProductCard from '../product/ProductCard';
import CustomDropdown from '../common/CustomDropdown';
import { useProducts } from '../../hooks/useProducts';
import { AdminContext } from '../../context/AdminContext';
import { UserContext } from '../../context/UserContext';

const ShopPage = ({ onNavigate, initialCategory }) => {
  const { categories } = useContext(AdminContext);
  const { toggleFavorite, isFavorite } = useContext(UserContext);

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

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory, setSelectedCategory]);

  const categoryNames = useMemo(() =>
    categories?.map(c => c.name) || [],
    [categories]
  );

  return (
    <div className="pb-20">
      <div className="px-4 py-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by tags (e.g., towel, cotton, luxury)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
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
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={(id) => onNavigate('product', { productId: id })}
                isFavorite={isFavorite(product.id)}
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
