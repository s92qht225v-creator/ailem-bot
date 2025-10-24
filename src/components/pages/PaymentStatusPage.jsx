import { useState, useEffect } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import { ordersAPI } from '../../services/api';

const PaymentStatusPage = ({ orderId, paymentMethod, onNavigate }) => {
  const [status, setStatus] = useState('checking'); // checking, success, timeout
  const [order, setOrder] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 30; // 30 attempts = 30 seconds

  useEffect(() => {
    // Poll for order status every 1 second
    const interval = setInterval(async () => {
      try {
        const orderData = await ordersAPI.getById(orderId);
        
        if (orderData.status === 'approved') {
          setStatus('success');
          setOrder(orderData);
          clearInterval(interval);
          
          // Auto-redirect to orders page after 2 seconds
          setTimeout(() => {
            onNavigate('orders');
          }, 2000);
        } else if (attempts >= maxAttempts) {
          setStatus('timeout');
          clearInterval(interval);
        } else {
          setAttempts(prev => prev + 1);
        }
      } catch (error) {
        console.error('Failed to check order status:', error);
        if (attempts >= maxAttempts) {
          setStatus('timeout');
          clearInterval(interval);
        } else {
          setAttempts(prev => prev + 1);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orderId, attempts, maxAttempts, onNavigate]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
        <Loader className="w-16 h-16 text-accent animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Checking payment status...
        </h2>
        <p className="text-gray-600 text-center mb-4">
          Please wait while we confirm your payment
        </p>
        <p className="text-sm text-gray-500">
          Attempt {attempts} of {maxAttempts}
        </p>
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
          Redirecting to your orders...
        </p>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Payment Confirmation Pending
          </h2>
          <p className="text-gray-700 mb-4">
            We're still waiting for payment confirmation. This can take a few moments.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Your order will be updated automatically. You can check your orders page to see the status.
          </p>
          <button
            onClick={() => onNavigate('orders')}
            className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            View My Orders
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentStatusPage;
