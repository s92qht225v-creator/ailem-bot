import { useContext } from 'react';
import { Heart, ArrowLeft, ShoppingCart } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { CartContext } from '../../context/CartContext';
import { useProducts } from '../../hooks/useProducts';
import { formatPrice, calculateDiscountedPrice } from '../../utils/helpers';

const FavoritesPage = ({ onNavigate }) => {
  const { favorites, toggleFavorite } = useContext(UserContext);
  const { addToCart } = useContext(CartContext);
  const { products } = useProducts();

  // Get favorite products with null checks
  const favoriteProducts = products?.filter(product =>
    favorites?.includes(product?.id)
  ) || [];

  const handleAddToCart = (product) => {
    if (!product) return;

    // Get default color and size if available
    const defaultColor = product.colors?.[0];
    const defaultSize = product.sizes?.[0];

    addToCart(product, 1, defaultColor, defaultSize);
  };

  // Show loading state if products not loaded
  if (!products) {
    return (
      <div className="pb-20 bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-mobile mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('profile')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Favorites</h1>
            </div>
          </div>
        </div>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-mobile mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('profile')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Favorites</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {favoriteProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No favorites yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Start adding products you love to your favorites
            </p>
            <button
              onClick={() => onNavigate('shop')}
              className="bg-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favoriteProducts.map((product) => {
              const discountedPrice = calculateDiscountedPrice(
                product.price,
                product.discount
              );

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
                >
                  {/* Product Image */}
                  <div
                    className="relative aspect-square cursor-pointer"
                    onClick={() => onNavigate('product', { productId: product.id })}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Discount Badge */}
                    {product.discount > 0 && (
                      <span className="absolute top-2 right-2 bg-error text-white text-xs font-bold px-2 py-1 rounded">
                        -{product.discount}%
                      </span>
                    )}

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      className="absolute top-2 left-2 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                    >
                      <Heart
                        className="w-4 h-4 text-error fill-error"
                      />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="p-3 flex flex-col h-full">
                    <h3
                      className="font-semibold text-sm mb-1 line-clamp-2 h-10 cursor-pointer hover:text-accent"
                      onClick={() => onNavigate('product', { productId: product.id })}
                    >
                      {product.name}
                    </h3>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-3">
                      {product.discount > 0 ? (
                        <>
                          <span className="text-primary font-bold">
                            {formatPrice(discountedPrice)}
                          </span>
                          <span className="text-gray-400 text-xs line-through">
                            {formatPrice(product.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-primary font-bold">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2 rounded-lg font-semibold hover:bg-accent/90 transition-colors text-sm mt-auto"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
