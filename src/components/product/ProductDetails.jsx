import { useState, useEffect, useRef } from 'react';
import { Star, Minus, Plus, ShoppingCart, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { formatPrice } from '../../utils/helpers';
import { getVariantStock, getAvailableColors, getAvailableSizesForColor, getTotalVariantStock, findVariant } from '../../utils/variants';
import { useTranslation } from '../../hooks/useTranslation';

const ProductDetails = ({ product, onAddToCart }) => {
  const { t, language } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || null);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Check if product uses variant tracking (must be declared first)
  const hasVariants = product.variants && product.variants.length > 0;

  // Get current variant if both color and size are selected
  const currentVariant = hasVariants && selectedColor && selectedSize
    ? findVariant(product.variants, selectedColor, selectedSize)
    : null;

  // Use variant image if available, otherwise use product images
  const images = currentVariant?.image 
    ? [currentVariant.image, ...(product.images || [product.image])]
    : (product.images || [product.image]);

  // Get current stock based on variant selection or total stock
  const getCurrentStock = () => {
    if (!hasVariants) {
      return product.stock || 0;
    }

    if (selectedColor && selectedSize) {
      return getVariantStock(product.variants, selectedColor, selectedSize);
    }

    // If variants exist but no selection yet, return total variant stock
    return getTotalVariantStock(product.variants);
  };

  const currentStock = getCurrentStock();

  // Get available colors (those with stock) - in current language
  const availableColors = hasVariants ? getAvailableColors(product.variants, language) : (product.colors || []);

  // Get available sizes for selected color - in current language
  const availableSizes = hasVariants && selectedColor
    ? getAvailableSizesForColor(product.variants, selectedColor, language)
    : (product.sizes || []);

  // Reset to first image when variant changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedColor, selectedSize]);

  // Reset quantity if it exceeds current stock
  useEffect(() => {
    if (quantity > currentStock) {
      setQuantity(Math.max(1, Math.min(quantity, currentStock)));
    }
  }, [currentStock, quantity]);

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe left - next image
      handleNextImage();
    } else if (distance < -minSwipeDistance) {
      // Swipe right - previous image
      handlePrevImage();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };


  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= currentStock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, quantity, selectedColor, selectedSize);
  };

  const totalPrice = product.price * quantity;

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

  return (
    <div className="bg-white">
      {/* Image Gallery */}
      <div className="bg-gray-50">
        {/* Main Image */}
        <div
          className="relative cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => setIsZoomed(true)}
        >
          <img
            src={images[currentImageIndex]}
            alt={product.name}
            className="w-full h-80 object-cover"
            onError={(e) => {
              console.error('Failed to load image:', images[currentImageIndex]);
              e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found';
            }}
          />

          {/* Zoom Icon Indicator */}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white p-2 rounded-full backdrop-blur-sm">
            <ZoomIn className="w-5 h-5" />
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="p-2 bg-white">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    currentImageIndex === index
                      ? 'border-accent shadow-lg scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} - ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/100x100?text=Img';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Product Info */}
        <div className="mb-4">
          {product.badge && (
            <span className="inline-block bg-accent text-white text-xs font-semibold px-2 py-1 rounded mb-2">
              {product.badge}
            </span>
          )}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>

          <div className="flex items-center gap-2 mb-3">
            {approvedReviewsCount > 0 ? (
              <>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-warning text-warning" />
                  <span className="font-semibold">{averageRating}</span>
                </div>
                <span className="text-gray-500">({approvedReviewsCount} {t('product.reviews')})</span>
              </>
            ) : (
              <span className="text-gray-500">{t('reviews.noReviews')}</span>
            )}
          </div>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xl text-gray-500 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          <div className="mb-4">
            {hasVariants && selectedColor && selectedSize ? (
              <div className="space-y-1">
                <span
                  className={`text-sm font-semibold ${
                  currentStock > 10 ? 'text-success' : currentStock > 0 ? 'text-warning' : 'text-error'
                  }`}
                >
                  {currentStock > 0 ? t('product.inStock', { count: currentStock }) : t('shop.outOfStock')}
                </span>
                <p className="text-xs text-gray-500">
                  {selectedColor} • {selectedSize}
                </p>
              </div>
            ) : (
              <span
                className={`text-sm font-semibold ${
                  currentStock > 10 ? 'text-success' : currentStock > 0 ? 'text-warning' : 'text-error'
                }`}
              >
                {currentStock > 0 ? t('product.inStock', { count: currentStock }) : t('shop.outOfStock')}
              </span>
            )}
          </div>

          <p className="text-gray-600 mb-4">{product.description}</p>
        </div>

        {/* Color Selection */}
        {product.colors && product.colors.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('product.selectColor')}: {selectedColor}
            </label>
            <div className="flex gap-2 flex-wrap">
              {product.colors.map((color) => {
                const isAvailable = !hasVariants || availableColors.includes(color);
                return (
                  <button
                    key={color}
                    onClick={() => isAvailable && setSelectedColor(color)}
                    disabled={!isAvailable}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedColor === color
                        ? 'border-accent bg-accent/10 text-accent font-semibold'
                        : !isAvailable
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size Selection */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('product.selectSize')}: {selectedSize}
            </label>
            <div className="flex gap-2 flex-wrap">
              {product.sizes.map((size) => {
                const isAvailable = !hasVariants || availableSizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => isAvailable && setSelectedSize(size)}
                    disabled={!isAvailable}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedSize === size
                        ? 'border-accent bg-accent/10 text-accent font-semibold'
                        : !isAvailable
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('product.quantity')}
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= currentStock}
              className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={currentStock === 0}
          className="w-full bg-accent text-white py-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          {currentStock === 0 ? t('shop.outOfStock') : `${t('product.addToCart')} - ${formatPrice(totalPrice)}`}
        </button>
      </div>

      {/* Zoomed Image Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center"
          onClick={() => setIsZoomed(false)}
        >
          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm">
              <span>{currentImageIndex + 1} / {images.length}</span>
            </div>
          )}

          {/* Close Button - Below image in center */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full transition-colors z-10 backdrop-blur-sm flex items-center gap-2 font-medium"
          >
            <X className="w-5 h-5" />
            <span>Close</span>
          </button>

          {/* Zoomed Image Container */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[currentImageIndex]}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                console.error('Failed to load zoomed image:', images[currentImageIndex]);
                e.target.src = 'https://via.placeholder.com/800x800?text=Image+Not+Found';
              }}
            />

            {/* Navigation Arrows for Zoomed View */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors backdrop-blur-sm"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors backdrop-blur-sm"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
