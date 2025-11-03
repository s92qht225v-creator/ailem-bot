import { useContext, useMemo } from 'react';
import { AdminContext } from '../../context/AdminContext';
import { UserContext } from '../../context/UserContext';
import ProductCard from './ProductCard';
import { getSmartRecommendations } from '../../utils/recommendations';
import { useTranslation } from '../../hooks/useTranslation';

const RelatedProducts = ({ currentProduct, onNavigate }) => {
  const { t } = useTranslation();
  const { products } = useContext(AdminContext);
  const { toggleFavorite, isFavorite } = useContext(UserContext);

  // Get related products using recommendation engine
  const relatedProducts = useMemo(() => {
    // Safety check: ensure all required data is available
    if (!currentProduct || !products || products.length === 0) {
      return [];
    }
    return getSmartRecommendations(currentProduct, products, 6);
  }, [currentProduct, products]);

  // Don't render if no recommendations
  if (!relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-6 bg-gray-50">
      <h3 className="text-xl font-bold mb-4">{t('product.relatedProducts') || 'You May Also Like'}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {relatedProducts.map((product) => (
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
  );
};

export default RelatedProducts;
