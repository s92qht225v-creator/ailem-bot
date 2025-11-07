import { Star, Heart } from 'lucide-react';
import { t } from "../../utils/translation-fallback";
import { formatPrice, calculateDiscountPercentage } from '../../utils/helpers';
import { getTotalVariantStock } from '../../utils/variants';
import { memo } from 'react';

const ProductCard = memo(({ product, onView, isFavorite, onToggleFavorite }) => {
  const discount = calculateDiscountPercentage(product.originalPrice, product.price);

  // Calculate actual approved reviews count
  const approvedReviewsCount = product.reviews?.filter(r => r.approved).length || 0;

  // Calculate average rating from approved reviews
  const calculateAverageRating = () => {
    if (approvedReviewsCount === 0) return 0;
    const totalRating = product.reviews
      ?.filter(r => r.approved)
      .reduce((sum, r) => sum + r.rating, 0) || 0;
    return (totalRating / approvedReviewsCount).toFixed(1);
  };

  const averageRating = calculateAverageRating();

  // Check if product is out of stock (considering variants)
  const hasVariants = product.variants && product.variants.length > 0;
  const currentStock = hasVariants
    ? getTotalVariantStock(product.variants)
    : (product.stock || 0);
  const isOutOfStock = currentStock === 0;

  return (
    <div
      onClick={() => onView(product.id)}
      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
        isOutOfStock ? 'opacity-90' : ''
      }`}
    >
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-48 object-cover transition-opacity ${
            isOutOfStock ? 'opacity-60' : ''
          }`}
          loading="lazy"
          onError={(e) => {
            console.error('Failed to load image:', product.image);
            e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
          }}
        />
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-lg">
              {t('shop.outOfStock') || 'Out of Stock'}
            </span>
          </div>
        )}
        {product.badge && !isOutOfStock && (
          <span className="absolute top-2 left-2 bg-accent text-white text-xs font-semibold px-2 py-1 rounded">
            {t(`badges.${product.badge}`) || product.badge}
          </span>
        )}
        {discount > 0 && !isOutOfStock && (
          <span className="absolute top-2 right-2 bg-error text-white text-xs font-semibold px-2 py-1 rounded">
            -{discount}%
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:scale-110 transition-transform"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-5 h-5 ${isFavorite ? 'fill-error text-error' : 'text-gray-400'}`}
          />
        </button>
      </div>

      <div className="p-3 flex flex-col">
        <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2 h-12">
          {product.name}
        </h3>

        <div className="h-6 mb-2">
          {approvedReviewsCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="text-sm font-semibold">{averageRating}</span>
              <span className="text-sm text-gray-500">({approvedReviewsCount})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
