import { useState, useContext, useEffect } from 'react';
import { t } from "../../utils/translation-fallback";
import { CheckCircle, CreditCard } from 'lucide-react';
import { formatPrice, generateOrderNumber, saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from '../../utils/helpers';
import { useCart } from '../../hooks/useCart';
import { UserContext } from '../../context/UserContext';
import { AdminContext } from '../../context/AdminContext';
import { useBackButton } from '../../hooks/useBackButton';
import { useMainButton } from '../../hooks/useMainButton';
import { generatePaymeLink } from '../../services/payme';
import { generateClickLink } from '../../services/click';

const PaymentPage = ({ checkoutData, onNavigate }) => {
  const { cartItems, clearCart } = useCart();
  const { user, updateBonusPoints } = useContext(UserContext);
  const { addOrder } = useContext(AdminContext);

  // Use native Telegram BackButton
  useBackButton(() => onNavigate('checkout'));

  // Check if user just returned from a payment and redirect to status page
  useEffect(() => {
    const pendingPayment = loadFromLocalStorage('pendingPayment');

    if (pendingPayment && cartItems.length === 0) {
      const { orderId, paymentMethod, timestamp } = pendingPayment;

      // Only redirect if payment was initiated recently (within 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (timestamp > oneHourAgo) {
        console.log('💳 Returning from payment, redirecting to status page:', {
          orderId,
          paymentMethod
        });

        // Clear the pending payment flag
        removeFromLocalStorage('pendingPayment');

        // Navigate to payment status page
        onNavigate('paymentStatus', { orderId, paymentMethod });
      } else {
        // Payment too old, clear it
        removeFromLocalStorage('pendingPayment');
      }
    }
  }, [cartItems.length, onNavigate]);

  const [paymentMethod, setPaymentMethod] = useState('telegram'); // 'telegram' or 'click'
  const [processingPayment, setProcessingPayment] = useState(false);

  // Handler for Payme payment
  const handlePaymePayment = async () => {
    try {
      setProcessingPayment(true);

      const orderId = generateOrderNumber();
      const paymeOrderId = `${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;

      console.log('💳 Creating order and generating payment link...', {
        orderId,
        paymeOrderId
      });
      
      // Create pending order first
      const order = {
        id: orderId,
        paymeOrderId: paymeOrderId, // Payme numeric order ID for webhook
        userId: user.id, // API will map to snake_case for database
        userTelegramId: user.telegramId || user.id,
        userName: user.name,
        userPhone: user.phone || checkoutData.phone,
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          price: item.price,
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
          payme_order_id: paymeOrderId // Also store for webhook compatibility
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
        status: 'pending', // Will be approved by webhook
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      // Save order
      await addOrder(order);
      console.log('✅ Order created:', orderId);

      // Deduct bonus points from user if they used any
      if (checkoutData.bonusPointsUsed > 0) {
        try {
          // updateBonusPoints takes a delta (negative value to deduct)
          await updateBonusPoints(-checkoutData.bonusPointsUsed);
          console.log(`✅ Deducted ${checkoutData.bonusPointsUsed} bonus points from user`);
        } catch (err) {
          console.error('❌ Failed to deduct bonus points:', err);
          // Don't fail the order creation if bonus deduction fails
        }
      }

      // Build return URL that redirects to payment status page
      // Using app URL with hash navigation for compatibility
      const appUrl = import.meta.env.VITE_APP_URL || 'https://www.ailem.uz';
      const returnUrl = `${appUrl}/#paymentStatus?order=${orderId}&method=payme`;

      // Generate Payme payment link using numeric order ID
      const paymentUrl = generatePaymeLink({
        orderId: paymeOrderId,
        amount: checkoutData.total,
        description: `Order #${orderId} - ${cartItems.length} items`,
        account: {
          order_id: paymeOrderId
        },
        returnUrl: returnUrl
      });

      // Extract and decode the base64 parameters for debugging
      const base64Params = paymentUrl.split('/').pop();
      const decodedParams = atob(base64Params);

      console.log('═══════════════════════════════════════════════');
      console.log('🔗 PAYME PAYMENT DEBUG');
      console.log('═══════════════════════════════════════════════');
      console.log('Order Number:', orderId);
      console.log('Payme Order ID:', paymeOrderId);
      console.log('Amount (UZS):', checkoutData.total);
      console.log('Amount (tiyin):', checkoutData.total * 100);
      console.log('');
      console.log('Payment URL:', paymentUrl);
      console.log('');
      console.log('Base64 Params:', base64Params);
      console.log('');
      console.log('Decoded Params:', decodedParams);
      console.log('═══════════════════════════════════════════════');
      console.log('💡 Copy the decoded params above to verify:');
      console.log('   m=<merchant_id>');
      console.log('   ac.order_id=<numeric_id>');
      console.log('   a=<amount_in_tiyin>');
      console.log('═══════════════════════════════════════════════');

      // Clear cart immediately
      clearCart();

      // Store pending payment info for status check when user returns
      saveToLocalStorage('pendingPayment', {
        orderId,
        paymentMethod: 'payme',
        timestamp: Date.now()
      });
      
      // Open payment in Telegram WebView or external browser
      if (window.Telegram?.WebApp) {
        console.log('📱 Opening Payme in Telegram WebApp');
        window.Telegram.WebApp.openLink(paymentUrl);
      } else {
        console.log('🌐 Opening Payme in browser');
        window.location.href = paymentUrl;
      }
    } catch (error) {
      console.error('❌ Payment failed:', error);
      alert(`Failed to create order: ${error.message || 'Please try again.'}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handler for Click payment
  const handleClickPayment = async () => {
    try {
      setProcessingPayment(true);

      const orderId = generateOrderNumber();
      const clickOrderId = `${Date.now()}`; // Use timestamp as Click order ID

      console.log('💳 Creating order for Click payment...', {
        orderId,
        clickOrderId
      });

      // Create pending order first
      const order = {
        id: orderId,
        clickOrderId: clickOrderId, // Click order ID for webhook lookup
        userId: user.id, // API will map to snake_case for database
        userTelegramId: user.telegramId || user.id,
        userName: user.name,
        userPhone: user.phone || checkoutData.phone,
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          color: item.selectedColor,
          size: item.selectedSize,
          image: item.image
        })),
        deliveryInfo: {
          fullName: checkoutData.fullName,
          phone: checkoutData.phone,
          address: checkoutData.address,
          city: checkoutData.city
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
        paymentMethod: 'click',
        status: 'pending', // Will be approved by webhook
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      // Save order
      await addOrder(order);
      console.log('✅ Order created:', orderId);

      // Deduct bonus points from user if they used any
      if (checkoutData.bonusPointsUsed > 0) {
        try {
          // updateBonusPoints takes a delta (negative value to deduct)
          await updateBonusPoints(-checkoutData.bonusPointsUsed);
          console.log(`✅ Deducted ${checkoutData.bonusPointsUsed} bonus points from user`);
        } catch (err) {
          console.error('❌ Failed to deduct bonus points:', err);
          // Don't fail the order creation if bonus deduction fails
        }
      }

      // Build return URL that redirects to payment status page
      const appUrl = import.meta.env.VITE_APP_URL || 'https://www.ailem.uz';
      const returnUrl = `${appUrl}/#paymentStatus?order=${orderId}&method=click`;

      // Generate Click payment link
      const paymentUrl = generateClickLink({
        orderId: clickOrderId,
        amount: checkoutData.total,
        description: `Order #${orderId} - ${cartItems.length} items`,
        returnUrl: returnUrl
      });

      console.log('═══════════════════════════════════════════════');
      console.log('🔗 CLICK PAYMENT DEBUG');
      console.log('═══════════════════════════════════════════════');
      console.log('Order Number:', orderId);
      console.log('Click Order ID:', clickOrderId);
      console.log('Amount (UZS):', checkoutData.total);
      console.log('Payment URL:', paymentUrl);
      console.log('═══════════════════════════════════════════════');

      // Clear cart immediately
      clearCart();

      // Store pending payment info for status check when user returns
      saveToLocalStorage('pendingPayment', {
        orderId,
        paymentMethod: 'click',
        timestamp: Date.now()
      });

      // Open payment in Telegram WebView or external browser
      if (window.Telegram?.WebApp) {
        console.log('📱 Opening in Telegram WebApp');
        window.Telegram.WebApp.openLink(paymentUrl);
      } else {
        console.log('🌐 Opening in browser');
        window.location.href = paymentUrl;
      }
    } catch (error) {
      console.error('❌ Click payment failed:', error);
      alert(`Failed to create order: ${error.message || 'Please try again.'}`);
    } finally {
      setProcessingPayment(false);
    }
  };


  // Use MainButton for payment methods
  const getButtonText = () => {
    if (paymentMethod === 'telegram') return 'Pay with Payme';
    if (paymentMethod === 'click') return 'Pay with Click';
    return 'Continue';
  };

  const getButtonHandler = () => {
    if (paymentMethod === 'telegram') return handlePaymePayment;
    if (paymentMethod === 'click') return handleClickPayment;
    return () => {};
  };

  useMainButton(
    getButtonText(),
    getButtonHandler(),
    {
      enabled: true,
      progress: processingPayment,
    }
  );

  if (!checkoutData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-gray-500 mb-4">No checkout data found</p>
        <button
          onClick={() => onNavigate('cart')}
          className="text-accent font-semibold hover:underline"
        >
          Back to Cart
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-16">
      <div className="p-4 space-y-6">
        <h2 className="text-2xl font-bold">Payment</h2>

        {/* Order Total */}
        <div className="bg-gradient-to-r from-accent to-blue-600 text-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-sm mb-2">Total Amount</p>
          <p className="text-4xl font-bold">{formatPrice(checkoutData.total)}</p>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Select Payment Method</h3>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('telegram')}
              className={`w-full p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                paymentMethod === 'telegram'
                  ? 'border-accent bg-blue-50'
                  : 'border-gray-300 hover:border-accent'
              }`}
            >
              <CreditCard className="w-6 h-6 text-accent" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Payme Payment</p>
                <p className="text-sm text-gray-600">Pay securely with Payme</p>
              </div>
              {paymentMethod === 'telegram' && (
                <CheckCircle className="w-5 h-5 text-accent" />
              )}
            </button>
            <button
              onClick={() => setPaymentMethod('click')}
              className={`w-full p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                paymentMethod === 'click'
                  ? 'border-accent bg-blue-50'
                  : 'border-gray-300 hover:border-accent'
              }`}
            >
              <CreditCard className="w-6 h-6 text-accent" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Click Payment</p>
                <p className="text-sm text-gray-600">Pay securely with Click</p>
              </div>
              {paymentMethod === 'click' && (
                <CheckCircle className="w-5 h-5 text-accent" />
              )}
            </button>
          </div>
        </div>


        {/* Payme Payment Info */}
        {paymentMethod === 'telegram' && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-3">Payme Payment</h3>
            <div className="bg-blue-50 border-l-4 border-accent p-4 rounded">
              <p className="text-sm text-gray-700 mb-2">
                <strong className="text-accent">✅ Secure Payment</strong>
              </p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Powered by Payme</li>
                <li>Supports Uzcard, HUMO, and Payme app</li>
                <li>Secure payment gateway</li>
                <li>Opens in Telegram browser</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                Click the <strong>"Pay with Payme"</strong> button below to proceed
              </p>
            </div>
          </div>
        )}

        {/* Click Payment Info */}
        {paymentMethod === 'click' && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-3">Click Payment</h3>
            <div className="bg-blue-50 border-l-4 border-accent p-4 rounded">
              <p className="text-sm text-gray-700 mb-2">
                <strong className="text-accent">✅ Secure Payment</strong>
              </p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Powered by Click.uz</li>
                <li>Supports Uzcard, HUMO, Visa, and Mastercard</li>
                <li>Secure payment gateway</li>
                <li>Fast and reliable</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                Click the <strong>"Pay with Click"</strong> button below to proceed
              </p>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPrice(checkoutData.subtotal)}</span>
            </div>

            {checkoutData.bonusDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>Bonus Discount</span>
                <span>-{formatPrice(checkoutData.bonusDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Delivery ({checkoutData.courier})</span>
              <span>{formatPrice(checkoutData.deliveryFee)}</span>
            </div>

            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(checkoutData.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
