import { useState, useEffect } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import { ordersAPI } from '../../services/api';

const PaymentStatusPage = ({ orderId, paymentMethod, onNavigate }) => {
  const [status, setStatus] = useState('checking'); // checking, success, failed, timeout
  const [order, setOrder] = useState(null);
  const [checkCount, setCheckCount] = useState(0);
  const maxChecks = 3; // Only check 3 times total

  const checkOrderStatus = async () => {
    try {
      const orderData = await ordersAPI.getById(orderId);

      if (orderData.status === 'approved') {
        setStatus('success');
        setOrder(orderData);

        // Auto-redirect to order details page after 2 seconds
        setTimeout(() => {
          onNavigate('orderDetails', { orderId });
        }, 2000);
        return true; // Payment confirmed
      } else if (orderData.status === 'rejected' || orderData.status === 'failed') {
        setStatus('failed');
        setOrder(orderData);
        return true; // Payment failed
      }

      return false; // Still pending
    } catch (error) {
      console.error('Failed to check order status:', error);
      return false;
    }
  };

  const resetAndRetry = () => {
    setStatus('checking');
    setCheckCount(0);
  };

  useEffect(() => {
    if (status !== 'checking') return;

    let cancelled = false;
    const timeouts = [];

    // Check immediately on mount
    const checkNow = async () => {
      if (cancelled) return;
      const isComplete = await checkOrderStatus();
      if (cancelled || isComplete) return;

      setCheckCount(1);

      // Check again after 2 seconds
      const timeout1 = setTimeout(async () => {
        if (cancelled) return;
        const isComplete = await checkOrderStatus();
        if (cancelled || isComplete) return;

        setCheckCount(2);

        // Final check after 4 seconds
        const timeout2 = setTimeout(async () => {
          if (cancelled) return;
          const isComplete = await checkOrderStatus();
          if (!cancelled && !isComplete) {
            // After 3 checks, show timeout message
            setStatus('timeout');
          }
        }, 2000);

        timeouts.push(timeout2);
      }, 2000);

      timeouts.push(timeout1);
    };

    checkNow();

    // Cleanup function
    return () => {
      cancelled = true;
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [orderId]); // Remove status from deps to prevent re-triggering

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
        <Loader className="w-16 h-16 text-accent animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Checking payment status...
        </h2>
        <p className="text-gray-600 text-center mb-4">
          Please wait while we confirm your {paymentMethod === 'payme' ? 'Payme' : 'Click'} payment
        </p>
        <p className="text-sm text-gray-500">
          Check {checkCount} of {maxChecks}
        </p>
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
              Payment Failed
            </h2>
          </div>
          <p className="text-gray-700 mb-4 text-center">
            Your payment was cancelled or declined.
          </p>
          {order && (
            <div className="bg-white rounded-lg p-4 mb-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Order:</span>
                <span className="font-semibold">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{order.total} so'm</span>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('payment', { checkoutData: order })}
              className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Back to Home
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
          Payment Successful!
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Your order has been confirmed
        </p>
        {order && (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-semibold">{order.orderNumber || order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold capitalize">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{order.total} so'm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-semibold">Approved</span>
              </div>
            </div>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-6">
          Redirecting to order details...
        </p>
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
              <strong>📱 Check your Telegram messages!</strong>
            </p>
            <p className="text-sm text-gray-600">
              You'll receive a notification when your payment is confirmed.
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-6 text-center">
            Your order will be updated automatically. You can also check your orders page anytime.
          </p>
          <div className="space-y-3">
            <button
              onClick={resetAndRetry}
              className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
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
