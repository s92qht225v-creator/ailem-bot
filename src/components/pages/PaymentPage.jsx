import { useState, useContext, useEffect } from 'react';
import { t } from "../../utils/translation-fallback";
import { CreditCard, ArrowLeft, Loader } from 'lucide-react';
import { formatPrice, generateOrderNumber, saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from '../../utils/helpers';
import { useCart } from '../../hooks/useCart';
import { UserContext } from '../../context/UserContext';
import { AdminContext } from '../../context/AdminContext';

import { generatePaymeLink } from '../../services/payme';

const PaymentPage = ({ checkoutData, onNavigate }) => {
  const { cartItems } = useCart();
  const { user } = useContext(UserContext);
  const { addOrder } = useContext(AdminContext);

  // Check if user just returned from a payment and redirect to status page
  useEffect(() => {
    const pendingPayment = loadFromLocalStorage('pendingPayment');

    if (pendingPayment && cartItems.length === 0) {
      const { orderId, paymentMethod, timestamp } = pendingPayment;

      // Only redirect if payment was initiated recently (within 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (timestamp > oneHourAgo) {
        removeFromLocalStorage('pendingPayment');
        onNavigate('paymentStatus', { orderId, paymentMethod });
      } else {
        removeFromLocalStorage('pendingPayment');
      }
    }
  }, [cartItems.length, onNavigate]);

  const [processingPayment, setProcessingPayment] = useState(false);

  // Handler for Payme payment
  const handlePaymePayment = async () => {
    try {
      setProcessingPayment(true);

      const orderId = generateOrderNumber();
      const paymeOrderId = `${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;

      // Create pending order first
      const order = {
        id: orderId,
        paymeOrderId: paymeOrderId,
        userId: user.id,
        userTelegramId: user.telegramId || user.id,
        userName: user.name,
        userPhone: user.phone || checkoutData.phone,
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          price: item.price,
          basePrice: item.basePrice || item.price,
          variantPrice: item.variantPrice || null,
          quantity: item.quantity,
          color: item.selectedColor,
          size: item.selectedSize,
          image: item.image
        })),
        deliveryInfo: {
          fullName: checkoutData.fullName,
          phone: checkoutData.phone,
          address: checkoutData.address,
          city: checkoutData.city,
          payme_order_id: paymeOrderId
        },
        courier: {
          name: checkoutData.courier || 'N/A',
          duration: checkoutData.type === 'home_delivery' ? 'Home Delivery' : 'Pickup'
        },
        subtotal: checkoutData.subtotal,
        bonusDiscount: checkoutData.bonusDiscount,
        bonusPointsUsed: checkoutData.bonusPointsUsed,
        deliveryFee: checkoutData.deliveryFee,
        total: checkoutData.total,
        shippingPaymentType: checkoutData.shippingPaymentType || 'prepaid',
        paymentMethod: 'payme',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      await addOrder(order);

      // Build return URL using pathname routing
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ailem.uz';
      const returnUrl = `${appUrl}/payment/status?order=${orderId}&method=payme`;

      const paymentUrl = generatePaymeLink({
        orderId: paymeOrderId,
        amount: checkoutData.total,
        description: `Order #${orderId} - ${cartItems.length} items`,
        account: {
          order_id: paymeOrderId
        },
        returnUrl: returnUrl
      });

      // Store pending payment info
      saveToLocalStorage('pendingPayment', {
        orderId,
        paymentMethod: 'payme',
        timestamp: Date.now()
      });

      // Redirect to payment
      window.location.href = paymentUrl;
    } catch (error) {
      console.error('Payment failed:', error);
      alert(`Failed to create order: ${error.message || 'Please try again.'}`);
    } finally {
      setProcessingPayment(false);
    }
  };


  if (!checkoutData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-gray-500 mb-4">{t('payment.noCheckoutData')}</p>
        <button
          onClick={() => onNavigate('cart')}
          className="text-accent font-semibold hover:underline"
        >
          {t('payment.backToCart')}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32 pt-4">
      {/* Back button */}
      <div className="p-4 pb-0">
        <button
          onClick={() => onNavigate('checkout')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Orqaga</span>
        </button>
      </div>

      <div className="p-4 space-y-6">
        <h2 className="text-2xl font-bold">{t('payment.title')}</h2>

        {/* Order Total */}
        <div className="bg-gradient-to-r from-accent to-red-700 text-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-sm mb-2">{t('payment.totalAmount')}</p>
          <p className="text-4xl font-bold">{formatPrice(checkoutData.total)}</p>
        </div>

        {/* Payme Payment Info */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            {t('payment.payme')}
          </h3>
          <div className="bg-red-50 border-l-4 border-accent p-4 rounded">
            <p className="text-sm text-gray-700 mb-2">
              <strong className="text-accent">✅ {t('payment.securePayment')}</strong>
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>{t('payment.poweredByPayme')}</li>
              <li>{t('payment.supportsPayme')}</li>
              <li>{t('payment.secureGateway')}</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3" dangerouslySetInnerHTML={{ __html: t('payment.clickButtonPayme') }} />
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">{t('payment.orderSummary')}</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.subtotal')}</span>
              <span>{formatPrice(checkoutData.subtotal)}</span>
            </div>

            {checkoutData.bonusDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>{t('payment.bonusDiscount')}</span>
                <span>-{formatPrice(checkoutData.bonusDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.delivery')} ({checkoutData.courier})</span>
              <span>{formatPrice(checkoutData.deliveryFee)}</span>
            </div>

            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>{t('payment.total')}</span>
                <span className="text-primary">{formatPrice(checkoutData.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom payment button (replaces Telegram MainButton) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handlePaymePayment}
            disabled={processingPayment}
            className="w-full bg-accent text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {processingPayment ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-5 h-5 animate-spin" />
                Yuklanmoqda...
              </span>
            ) : t('payment.payWithPayme')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
