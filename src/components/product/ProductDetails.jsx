import { useState, useEffect, useContext, useRef } from 'react';
import { t } from "../../utils/translation-fallback";
import { Star, Minus, Plus, ShoppingCart, ChevronLeft, ChevronRight, Share2, Bell, BellOff } from 'lucide-react';
import { formatPrice } from '../../utils/helpers';
import { getVariantStock, getVariantPrice, getAvailableColors, getAvailableSizesForColor, getTotalVariantStock, findVariant, getVariantPriceRange, hasVariantPricing } from '../../utils/variants';
import { UserContext } from '../../context/UserContext';
import { getTelegramWebApp } from '../../utils/telegram';
import { stockNotificationsAPI } from '../../services/api';
import APlusContent from './APlusContent';

const ProductDetails = ({ product, onAddToCart }) => {
  const { user } = useContext(UserContext);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || null);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Inline pinch-to-zoom states (using refs for smooth performance)
  const imageRef = useRef(null);
  const scaleRef = useRef(1);
  const posXRef = useRef(0);
  const posYRef = useRef(0);
  const initialDistanceRef = useRef(0);
  const initialScaleRef = useRef(1);
  const isPinchingRef = useRef(false);
  const lastTouchPosRef = useRef({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const swipeStartXRef = useRef(0);

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

  // Get current price based on variant selection
  const getCurrentPrice = () => {
    const basePrice = product.price;

    if (!hasVariants) {
      return basePrice;
    }

    if (selectedColor && selectedSize) {
      return getVariantPrice(product.variants, selectedColor, selectedSize, basePrice);
    }

    return basePrice;
  };

  const currentPrice = getCurrentPrice();

  // Check if product has variant-specific pricing
  const hasVarPricing = hasVariantPricing(product.variants);

  // Get price range for display when no variant is selected
  const priceRange = hasVariants ? getVariantPriceRange(product.variants, product.price) : null;

  // Get available colors (those with stock)
  const availableColors = hasVariants ? getAvailableColors(product.variants) : (product.colors || []);

  // Get available sizes for selected color
  const availableSizes = hasVariants && selectedColor
    ? getAvailableSizesForColor(product.variants, selectedColor)
    : (product.sizes || []);

  // Reset selected color/size when product changes
  useEffect(() => {
    if (hasVariants && availableColors.length > 0) {
      setSelectedColor(availableColors[0]);
      // Reset size too since available sizes depend on selected color
      const sizesForColor = getAvailableSizesForColor(product.variants, availableColors[0]);
      setSelectedSize(sizesForColor[0] || null);
    } else {
      setSelectedColor(product.colors?.[0] || null);
      setSelectedSize(product.sizes?.[0] || null);
    }
  }, [product.id]);

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

  const resetZoom = () => {
    scaleRef.current = 1;
    posXRef.current = 0;
    posYRef.current = 0;
    updateTransform(true); // smooth transition
  };

  const handleNextImage = () => {
    resetZoom();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    resetZoom();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Helper to constrain pan within image bounds
  const constrainPosition = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const container = img.parentElement;

    // Get the displayed size of the image
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Get base displayed size (without our transform)
    const baseWidth = imgRect.width / scaleRef.current;
    const baseHeight = imgRect.height / scaleRef.current;

    // Calculate scaled image size
    const scaledWidth = baseWidth * scaleRef.current;
    const scaledHeight = baseHeight * scaleRef.current;

    // Calculate max pan distance
    const maxPanX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerRect.height) / 2);

    // Constrain position
    posXRef.current = Math.max(-maxPanX, Math.min(maxPanX, posXRef.current));
    posYRef.current = Math.max(-maxPanY, Math.min(maxPanY, posYRef.current));
  };

  // Helper to update transform directly on DOM (60fps smooth)
  const updateTransform = (smooth = false) => {
    if (imageRef.current) {
      constrainPosition();
      imageRef.current.style.transition = smooth ? 'transform 0.3s ease-out' : 'none';
      imageRef.current.style.transform = `translate(${posXRef.current}px, ${posYRef.current}px) scale(${scaleRef.current})`;
    }
  };

  // Get distance between two touch points
  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch gesture started
      isPinchingRef.current = true;
      initialDistanceRef.current = getDistance(e.touches);
      initialScaleRef.current = scaleRef.current;
      e.preventDefault();
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];

      // Prevent Telegram swipe-down when zoomed
      if (scaleRef.current > 1) {
        e.preventDefault();
      }

      // Store position for both panning and swipe detection
      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
      swipeStartXRef.current = touch.clientX;

      // Check for double tap
      const now = Date.now();
      if (now - lastTap < 300) {
        // Double tap detected - toggle zoom
        e.preventDefault();
        if (scaleRef.current === 1) {
          scaleRef.current = 2.5;
        } else {
          scaleRef.current = 1;
          posXRef.current = 0;
          posYRef.current = 0;
        }
        updateTransform(true); // smooth zoom animation
      }
      setLastTap(now);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPinchingRef.current) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const newScale = (currentDistance / initialDistanceRef.current) * initialScaleRef.current;
      scaleRef.current = Math.min(Math.max(1, newScale), 4); // Min 1x, Max 4x
      updateTransform();
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      // Pan when zoomed in
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouchPosRef.current.x;
      const deltaY = touch.clientY - lastTouchPosRef.current.y;

      posXRef.current += deltaX;
      posYRef.current += deltaY;

      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
      updateTransform();
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      isPinchingRef.current = false;
    }

    // Handle swipe navigation only if not zoomed
    if (scaleRef.current === 1 && swipeStartXRef.current !== 0) {
      const touchEndX = e.changedTouches[0]?.clientX || 0;
      const distance = swipeStartXRef.current - touchEndX;
      const minSwipeDistance = 50;

      if (Math.abs(distance) > minSwipeDistance) {
        if (distance > 0) {
          handleNextImage();
        } else {
          handlePrevImage();
        }
      }
    }

    swipeStartXRef.current = 0;
  };


  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= currentStock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    // Pass variant price if available
    const variantPrice = currentVariant?.price || null;
    onAddToCart(product, quantity, selectedColor, selectedSize, variantPrice);
  };

  // Check if user is subscribed to stock notifications
  useEffect(() => {
    const checkSubscription = async () => {
      if (user?.id && user.id !== 'demo-1' && currentStock === 0) {
        try {
          const subscribed = await stockNotificationsAPI.isSubscribed(
            user.id,
            product.id,
            selectedColor,
            selectedSize
          );
          setIsSubscribed(subscribed);
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      } else {
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [user?.id, product.id, selectedColor, selectedSize, currentStock]);

  // Handle stock notification subscription
  const handleNotifyMe = async () => {
    if (!user?.id || user.id === 'demo-1') {
      alert('Iltimos, Telegram orqali kiring');
      return;
    }

    setIsSubscribing(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        await stockNotificationsAPI.unsubscribe(user.id, product.id, selectedColor, selectedSize);
        setIsSubscribed(false);
        alert('Bildirishnoma bekor qilindi');
      } else {
        // Subscribe
        const result = await stockNotificationsAPI.subscribe(user.id, product.id, selectedColor, selectedSize);
        setIsSubscribed(true);
        if (!result.alreadySubscribed) {
          alert('✅ Mahsulot omborda bo\'lganda xabar beramiz!');
        }
      }
    } catch (error) {
      console.error('Error toggling notification:', error);
      alert('Xatolik yuz berdi. Qayta urinib ko\'ring.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleShare = () => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'ailemuz_bot';
    
    if (!user || !user.referralCode) {
      const tg = getTelegramWebApp();
      tg?.showAlert('Xatolik: Foydalanuvchi topilmadi');
      return;
    }

    // Build share URL manually without double encoding
    const referralLink = `https://t.me/${botUsername}?start=ref_${user.referralCode}`;
    const message = `🛍️ ${product.name}\n\n💰 ${formatPrice(product.price)}\n\nBu mahsulotni ko'ring va bonus oling!`;
    
    const tg = getTelegramWebApp();
    if (tg) {
      // Encode only the text message, keep URL unencoded
      const shareUrl = `https://t.me/share/url?url=${referralLink}&text=${encodeURIComponent(message)}`;
      tg.openTelegramLink(shareUrl);
    } else if (navigator.share) {
      navigator.share({
        title: product.name,
        text: message,
        url: referralLink
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(referralLink);
      alert('Mahsulot havolasi nusxalandi!');
    }
  };

  const totalPrice = currentPrice * quantity;

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
          ref={imageRef}
          className="relative aspect-[4/5] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${images[currentImageIndex]})`,
            touchAction: 'none',
            willChange: 'transform',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          role="img"
          aria-label={product.name}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
        >

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
          <div className="p-3 bg-white">
            <div className="flex gap-3 overflow-x-auto pb-2 px-2 pt-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    currentImageIndex === index
                      ? 'border-accent shadow-lg scale-105 ring-2 ring-accent ring-offset-2'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={`${product.name} - ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`${product.name} - ${index + 1}`}
                    className="w-full h-full object-contain bg-gray-50"
                    draggable="false"
                  />
                  {/* Selection indicator */}
                  {currentImageIndex === index && (
                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                      <div className="bg-accent rounded-full p-1">
                        <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    </div>
                  )}
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
              {(() => {
                const translated = t(`badges.${product.badge}`);
                return translated.startsWith('badges.') ? product.badge : translated;
              })()}
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
            {/* Show variant price if selected, or price range if variants have different prices */}
            {hasVarPricing && priceRange && priceRange.min !== priceRange.max && (!selectedColor || !selectedSize) ? (
              <span className="text-3xl font-bold text-primary">
                {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
              </span>
            ) : (
              <>
                <span className="text-3xl font-bold text-primary">
                  {formatPrice(currentPrice)}
                </span>
                {/* Show original price if discounted (not variant price, but product original price) */}
                {product.originalPrice && currentPrice < product.originalPrice && (
                  <span className="text-xl text-gray-500 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {/* Show base price crossed out if variant has different price */}
                {hasVarPricing && currentVariant?.price && currentVariant.price !== product.price && (
                  <span className="text-sm text-gray-400">
                    (variant narxi)
                  </span>
                )}
              </>
            )}
          </div>

          {/* Volume Pricing Display */}
          {product.volume_pricing && product.volume_pricing.length > 0 && (
            <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-green-900">
                  💰 Ulgurji xarid uchun chegirma
                </span>
              </div>
              <div className="space-y-1">
                {product.volume_pricing
                  .sort((a, b) => a.min_qty - b.min_qty)
                  .map((tier, idx) => (
                  <div key={idx} className="text-sm text-green-800 flex items-center gap-2">
                    <span className="font-medium">
                      {tier.min_qty}{tier.max_qty ? `-${tier.max_qty}` : '+'} dona:
                    </span>
                    <span className="font-bold text-green-900">
                      har biri {formatPrice(tier.price)}
                    </span>
                    {tier.price < product.price && (
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                        {formatPrice(product.price - tier.price)} tejang
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
        </div>

        {/* Color Selection */}
        {product.colors && product.colors.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('product.selectColor')}: {selectedColor}
            </label>
            <div className="flex gap-2 flex-wrap">
              {product.colors.map((color) => {
                // Check if this color has stock in ANY size
                const isAvailable = !hasVariants || product.variants.some(v => {
                  const matchesColor = v.color?.toLowerCase() === color.toLowerCase();
                  return matchesColor && v.stock > 0;
                });
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

        {/* Product Description */}
        {product.description && (
          <div
            className="text-gray-600 mb-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        )}

        {/* Add to Cart or Notify Me Button */}
        {currentStock === 0 ? (
          // Out of Stock - Show Notify Me button
          <button
            onClick={handleNotifyMe}
            disabled={isSubscribing}
            className={`w-full py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mb-3 ${
              isSubscribed
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-accent text-white hover:bg-red-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubscribing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Yuklanmoqda...
              </>
            ) : isSubscribed ? (
              <>
                <BellOff className="w-5 h-5" />
                ✓ Xabar berishni bekor qilish
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                Omborda bo'lganda xabar bering
              </>
            )}
          </button>
        ) : (
          // In Stock - Show Add to Cart button
          <button
            onClick={handleAddToCart}
            className="w-full bg-accent text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <ShoppingCart className="w-5 h-5" />
            {`${t('product.addToCart')} - ${formatPrice(totalPrice)}`}
          </button>
        )}

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full bg-white border-2 border-purple-500 text-purple-600 py-3 rounded-lg font-medium hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Ulashing va bonus oling 🎁
        </button>

        {/* A+ Content */}
        {product.aPlusContent && (
          <APlusContent content={product.aPlusContent} />
        )}
      </div>

    </div>
  );
};

export default ProductDetails;
