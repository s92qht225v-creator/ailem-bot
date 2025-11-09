import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { t } from "../../utils/translation-fallback";
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/helpers';
import { getVolumePricedUnit, calculateItemTotal } from '../../utils/volumePricing';
import { getVariantStock } from '../../utils/variants';

const CartPage = ({ onNavigate }) => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen pb-20 pt-16 px-4">
        <ShoppingBag className="w-24 h-24 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t('cart.empty')}</h2>
        <p className="text-gray-500 mb-6 text-center">
          {t('cart.continueShopping')}
        </p>
        <button
          onClick={() => onNavigate('shop')}
          className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          {t('home.shopNow')}
        </button>
      </div>
    );
  }

  const subtotal = getCartTotal();

  return (
    <div className="pb-40 pt-16">
      <div className="px-4 py-4">
        {/* Cart Items */}
        <div className="space-y-4 mb-6">
          {cartItems.map((item) => (
            <div key={item.cartItemId} className="bg-white rounded-lg shadow-md p-4">
              {/* Clickable Product Area */}
              <div
                className="flex gap-4 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                onClick={() => onNavigate('product', { productId: item.id })}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">{item.name}</h3>
                  {item.selectedColor && (
                    <p className="text-sm text-gray-600">{t('product.colors')}: {item.selectedColor}</p>
                  )}
                  {item.selectedSize && (
                    <p className="text-sm text-gray-600">{t('product.sizes')}: {item.selectedSize}</p>
                  )}
                  <div className="mt-2">
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(item.price)}
                    </p>
                    {item.volume_pricing && item.volume_pricing.length > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        💰 Hajm bo'yicha chegirma mavjud
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-semibold w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(() => {
                      // Calculate current available stock for THIS specific variant
                      const hasVariants = item.variants && item.variants.length > 0;

                      // If product has variants and user selected a specific variant
                      if (hasVariants && item.selectedColor && item.selectedSize) {
                        const currentStock = getVariantStock(item.variants, item.selectedColor, item.selectedSize);
                        return item.quantity >= currentStock;
                      }

                      // For products without variants or no selection, use regular stock
                      return item.quantity >= (item.stock || 0);
                    })()}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.cartItemId)}
                  className="text-error hover:bg-red-50 p-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Stock limit indicator */}
              {(() => {
                const hasVariants = item.variants && item.variants.length > 0;

                // Get stock for the specific variant selected
                let currentStock;
                if (hasVariants && item.selectedColor && item.selectedSize) {
                  currentStock = getVariantStock(item.variants, item.selectedColor, item.selectedSize);
                } else {
                  currentStock = item.stock || 0;
                }

                if (item.quantity >= currentStock) {
                  return (
                    <div className="mt-2 text-xs text-warning flex items-center gap-1">
                      <span>⚠️ Omborda {currentStock} dona mavjud</span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="mt-3 pt-3 border-t border-gray-200">
                {(() => {
                  const effectivePrice = getVolumePricedUnit(item.quantity, item.price, item.volume_pricing);
                  const itemTotal = calculateItemTotal(item.quantity, item.price, item.volume_pricing);
                  const hasDiscount = effectivePrice < item.price;

                  return (
                    <>
                      {hasDiscount && (
                        <div className="mb-2 bg-green-50 border border-green-200 rounded p-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-700">
                              Narx har biri ({item.quantity} dona):
                            </span>
                            <span className="font-bold text-green-800">
                              {formatPrice(effectivePrice)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-green-700">
                              Tejashingiz:
                            </span>
                            <span className="font-bold text-green-800">
                              {formatPrice((item.price - effectivePrice) * item.quantity)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('cart.subtotal')}:</span>
                        <div className="text-right">
                          <span className="text-lg font-bold">
                            {formatPrice(itemTotal)}
                          </span>
                          {hasDiscount && (
                            <div className="text-xs text-gray-500 line-through">
                              {formatPrice(item.price * item.quantity)}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Bottom Section */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-mobile mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">{t('cart.subtotal')}:</span>
            <span className="text-2xl font-bold text-primary">
              {formatPrice(subtotal)}
            </span>
          </div>
          <button
            onClick={() => onNavigate('checkout')}
            className="w-full bg-accent text-white py-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            {t('cart.checkout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
