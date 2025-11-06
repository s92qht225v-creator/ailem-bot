import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { t } from "../../utils/translation-fallback";
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/helpers';

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
                  <p className="text-lg font-bold text-primary mt-2">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-semibold w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"
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

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('cart.subtotal')}:</span>
                  <span className="text-lg font-bold">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
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
