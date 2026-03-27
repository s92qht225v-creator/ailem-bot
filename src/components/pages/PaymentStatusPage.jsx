import { useState, useEffect, useCallback, useContext } from 'react';
import { t } from "../../utils/translation-fallback";
import { CheckCircle, Loader, LogIn } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useCart } from '../../hooks/useCart';
import { UserContext } from '../../context/UserContext';

const PaymentStatusPage = ({ orderId, paymentMethod, onNavigate }) => {
  const { clearCart } = useCart();
  const { user, updateBonusPoints } = useContext(UserContext);
  const [status, setStatus] = useState('checking'); // checking, success, failed, timeout, error
  const [order, setOrder] = useState(null);
  const [checkCount, setCheckCount] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const maxChecks = 6; // Check 6 times over ~20 seconds

  // Log when component mounts
  useEffect(() => {
    console.log('💳 PaymentStatusPage mounted:', { orderId, paymentMethod });
  }, []);

  // Safety check - if no orderId provided, show error
  if (!orderId) {
    console.error('❌ PaymentStatusPage: No orderId provided');

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-center mb-4">
            <div className="text-6xl mb-2">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Invalid Payment Link
            </h2>
          </div>
          <p className="text-gray-700 mb-4 text-center">
            No order ID found. Please check your payment link or try again.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const checkOrderStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking order status for:', orderId);
      const orderData = await ordersAPI.getById(orderId);
      console.log('📦 Order data received:', {
        id: orderData.id,
        status: orderData.status,
        paymentMethod: orderData.paymentMethod
      });

      if (orderData.status === 'approved') {
        console.log('✅ Payment successful!');
        clearCart();

        // Deduct bonus points if used in this order
        if (orderData.bonusPointsUsed > 0) {
          try {
            await updateBonusPoints(-orderData.bonusPointsUsed);
            console.log(`✅ Deducted ${orderData.bonusPointsUsed} bonus points`);
          } catch (err) {
            console.error('❌ Failed to deduct bonus points:', err);
          }
        }

        setStatus('success');
        setOrder(orderData);

        // Auto-redirect to order details page after 4 seconds (only for logged-in users)
        // Guest users see a login prompt instead
        if (!user?.isGuest) {
          setTimeout(() => {
            onNavigate('orderDetails', { orderId });
          }, 4000);
        }
        return true; // Payment confirmed
      } else if (orderData.status === 'rejected' || orderData.status === 'failed') {
        console.log('❌ Payment failed/rejected');
        setStatus('failed');
        setOrder(orderData);
        return true; // Payment failed
      }

      console.log('⏳ Payment still pending...');
      return false; // Still pending
    } catch (error) {
      console.error('❌ Failed to check order status:', error);
      setNetworkError(true);
      return false;
    }
  }, [orderId, onNavigate]);

  const resetAndRetry = () => {
    setStatus('checking');
    setCheckCount(0);
    setNetworkError(false);
  };

  useEffect(() => {
    if (status !== 'checking') return;

    let cancelled = false;
    const timeouts = [];

    // Check immediately on mount, then every 3 seconds up to 6 times (18 seconds total)
    const checkNow = async () => {
      if (cancelled) return;

      // First check immediately
      const isComplete = await checkOrderStatus();
      if (cancelled || isComplete) return;
      setCheckCount(1);

      // Schedule remaining checks
      for (let i = 1; i < maxChecks; i++) {
        const timeout = setTimeout(async () => {
          if (cancelled) return;
          const isComplete = await checkOrderStatus();
          if (cancelled || isComplete) return;

          setCheckCount(i + 1);

          // If this was the last check, show timeout
          if (i === maxChecks - 1) {
            setStatus('timeout');
          }
        }, i * 3000); // 3 seconds, 6 seconds, 9 seconds, etc.

        timeouts.push(timeout);
      }
    };

    checkNow();

    // Cleanup function
    return () => {
      cancelled = true;
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [status, checkOrderStatus]); // Only depend on status and memoized checkOrderStatus

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
        <Loader className="w-16 h-16 text-accent animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('payment.checkingStatus')}
        </h2>
        <p className="text-gray-600 text-center mb-4">
          {t('payment.pleaseWait')}
        </p>
        <p className="text-sm text-gray-500">
          {checkCount} / {maxChecks}
        </p>
        {networkError && (
          <p className="text-sm text-orange-500 mt-2">
            Tarmoq xatosi. Qayta urinish...
          </p>
        )}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-center mb-4">
            <div className="text-6xl mb-2">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t('payment.failed')}
            </h2>
          </div>
          <p className="text-gray-700 mb-4 text-center">
            {t('payment.paymentCancelled')}
          </p>
          {order && (
            <div className="bg-white rounded-lg p-4 mb-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('payment.orderNumber')}:</span>
                <span className="font-semibold">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.amount')}:</span>
                <span className="font-semibold">{order.total} so'm</span>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('payment', { checkoutData: order })}
              className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              {t('payment.tryAgain')}
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              {t('payment.backToHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-50 to-white">
        <div className="bg-white rounded-full p-6 shadow-lg mb-6">
          <CheckCircle className="w-24 h-24 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {t('payment.successful')}
        </h2>
        <p className="text-gray-600 text-center mb-6">
          {t('payment.orderConfirmed')}
        </p>
        {order && (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.orderNumber')}:</span>
                <span className="font-semibold">{order.orderNumber || order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.paymentMethod')}:</span>
                <span className="font-semibold capitalize">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.amount')}:</span>
                <span className="font-semibold">{order.total} so'm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.status')}:</span>
                <span className="text-green-600 font-semibold">{t('payment.approved')}</span>
              </div>
            </div>
          </div>
        )}
        {user?.isGuest && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 max-w-md w-full">
            <h3 className="font-semibold text-blue-800 mb-2">Buyurtmani saqlang!</h3>
            <p className="text-sm text-blue-700 mb-3">
              Telegram orqali kiring va buyurtma tarixini ko'ring, bonus ball to'plang.
            </p>
            <button
              onClick={() => onNavigate('login', { returnTo: 'orderHistory' })}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition w-full"
            >
              <LogIn className="w-4 h-4" />
              Kirish
            </button>
          </div>
        )}
        {!user?.isGuest && (
          <p className="text-sm text-gray-500 mt-6">
            {t('payment.redirecting')}
          </p>
        )}
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <div className="text-center mb-4">
            <div className="text-6xl mb-2">⏳</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Payment Being Processed
            </h2>
          </div>
          <p className="text-gray-700 mb-4 text-center">
            Your payment is taking longer than usual to confirm.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>📱 To'lov tasdiqlanishi kutilmoqda</strong>
            </p>
            <p className="text-sm text-gray-600">
              To'lov tasdiqlanganda bildirishnoma olasiz.
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-6 text-center">
            Your order will be updated automatically. You can also check your orders page anytime.
          </p>
          <div className="space-y-3">
            <button
              onClick={resetAndRetry}
              className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              🔄 Check Again
            </button>
            <button
              onClick={() => onNavigate('orderHistory')}
              className="w-full bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              View My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentStatusPage;
