import { Star, Heart, ShoppingCart, ExternalLink } from 'lucide-react';
import { t } from "../../utils/translation-fallback";
import { formatPrice, calculateDiscountPercentage, getColorHex } from '../../utils/helpers';
import { getTotalVariantStock } from '../../utils/variants';
import { memo, useRef, useState, useEffect } from 'react';

const ProductCard = memo(({ product, onView, isFavorite, onToggleFavorite, onQuickAddToCart }) => {
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

  // Lazy load image via IntersectionObserver (background-image doesn't support loading="lazy")
  const imgRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      onClick={() => onView(product.id)}
      className={`bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
        isOutOfStock ? 'opacity-90' : ''
      }`}
    >
      <div className="relative">
        <div
          ref={imgRef}
          className={`relative w-full aspect-[4/5] bg-cover bg-center bg-no-repeat ${
            isOutOfStock ? 'opacity-60' : ''
          }`}
          style={{
            backgroundImage: isVisible ? `url(${product.image})` : 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          role="img"
          aria-label={product.name}
          onContextMenu={(e) => e.preventDefault()}
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
            {(() => {
              const translated = t(`badges.${product.badge}`);
              return translated.startsWith('badges.') ? product.badge : translated;
            })()}
          </span>
        )}
        {discount > 0 && !isOutOfStock && (
          <span className="absolute top-10 right-2 bg-error text-white text-xs font-semibold px-2 py-1 rounded">
            -{discount}%
          </span>
        )}
        {/* Favorites Heart — top-right of image */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm hover:scale-110 transition-transform"
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

        {/* Color Swatches */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex gap-1 mb-1 flex-wrap">
            {product.colors.slice(0, 5).map((color, idx) => (
              <span
                key={idx}
                className="w-3.5 h-3.5 rounded-full border border-gray-300"
                style={{ backgroundColor: getColorHex(color) }}
                title={color}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-xs text-gray-400">+{product.colors.length - 5}</span>
            )}
          </div>
        )}

        <div className="h-6 mb-1">
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

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          {/* UZUM Marketplace Link */}
          {product.uzumUrl && (
            <a
              href={product.uzumUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1 bg-[#7B68EE] text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-[#6A5ACD] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>UZUM</span>
            </a>
          )}

          {/* Quick Add to Cart */}
          {onQuickAddToCart && !isOutOfStock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAddToCart(product);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 bg-accent text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t('product.addToCart')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
