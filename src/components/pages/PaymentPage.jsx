import { useState, useContext } from 'react';
import { Copy, Upload, CheckCircle, CreditCard } from 'lucide-react';
import { formatPrice, copyToClipboard, generateOrderNumber, calculateBonusPoints } from '../../utils/helpers';
import { useCart } from '../../hooks/useCart';
import { UserContext } from '../../context/UserContext';
import { AdminContext } from '../../context/AdminContext';
import { storageAPI } from '../../services/api';
import { notifyAdminNewOrder, notifyUserNewOrder } from '../../services/telegram';
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

  const [paymentMethod, setPaymentMethod] = useState('telegram'); // 'telegram' or 'manual'
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Always show Payme as primary payment method
  const paymeEnabled = true;

  const adminCardNumber = '4532 1234 5678 9012';

  const handleCopyCardNumber = async () => {
    const success = await copyToClipboard(adminCardNumber);
    if (success) {
      alert('Card number copied to clipboard!');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }
      setUploading(true);
      // Simulate upload delay
      setTimeout(() => {
        setScreenshot(file);
        setUploading(false);
      }, 1000);
    }
  };

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
        userId: user.id,
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
        courier: checkoutData.courier,
        subtotal: checkoutData.subtotal,
        bonusDiscount: checkoutData.bonusDiscount,
        bonusPointsUsed: checkoutData.bonusPointsUsed,
        deliveryFee: checkoutData.deliveryFee,
        total: checkoutData.total,
        paymentMethod: 'payme',
        status: 'pending', // Will be approved by webhook
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      // Save order
      await addOrder(order);
      console.log('✅ Order created:', orderId);

      // Generate Payme payment link using numeric order ID
      const paymentUrl = generatePaymeLink({
        orderId: paymeOrderId,
        amount: checkoutData.total,
        description: `Order #${orderId} - ${cartItems.length} items`,
        account: {
          order_id: paymeOrderId
        }
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

      // Clear cart immediately before redirect
      // Order is already saved, user can't lose it
      clearCart();
      
      // Redirect to payment page
      window.location.href = paymentUrl;
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
        userId: user.id,
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
        courier: checkoutData.courier,
        subtotal: checkoutData.subtotal,
        bonusDiscount: checkoutData.bonusDiscount,
        bonusPointsUsed: checkoutData.bonusPointsUsed,
        deliveryFee: checkoutData.deliveryFee,
        total: checkoutData.total,
        paymentMethod: 'click',
        status: 'pending', // Will be approved by webhook
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      // Save order
      await addOrder(order);
      console.log('✅ Order created:', orderId);

      // Generate Click payment link
      const paymentUrl = generateClickLink({
        orderId: clickOrderId,
        amount: checkoutData.total,
        description: `Order #${orderId} - ${cartItems.length} items`
      });

      console.log('═══════════════════════════════════════════════');
      console.log('🔗 CLICK PAYMENT DEBUG');
      console.log('═══════════════════════════════════════════════');
      console.log('Order Number:', orderId);
      console.log('Click Order ID:', clickOrderId);
      console.log('Amount (UZS):', checkoutData.total);
      console.log('Payment URL:', paymentUrl);
      console.log('═══════════════════════════════════════════════');

      // Clear cart immediately before redirect
      // Order is already saved, user can't lose it
      clearCart();

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

  // Handler for manual payment (screenshot upload)
  const handleSubmitOrder = async () => {
    if (!screenshot) {
      alert('Please upload payment screenshot');
      return;
    }

    try {
      setUploading(true);

      // Upload payment screenshot to PRIVATE Supabase Storage bucket
      console.log('📤 Uploading payment screenshot to secure private bucket...');
      const uploadResult = await storageAPI.uploadPaymentScreenshot(screenshot);
      console.log('✅ Payment screenshot uploaded securely:', uploadResult.url);

      // Create order with permanent screenshot URL
      const order = {
        id: generateOrderNumber(),
        userId: user.id,
        userTelegramId: user.telegramId || user.id, // Include Telegram ID for notifications
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
        courier: checkoutData.courier,
        subtotal: checkoutData.subtotal,
        bonusDiscount: checkoutData.bonusDiscount,
        bonusPointsUsed: checkoutData.bonusPointsUsed,
        deliveryFee: checkoutData.deliveryFee,
        total: checkoutData.total,
        paymentScreenshot: uploadResult.url, // Use permanent Supabase URL
        paymentMethod: 'manual',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      console.log('📦 Submitting order:', order);

      // Add order to admin context (AWAIT this!)
      await addOrder(order);

      console.log('✅ Order saved to Supabase');

      // Send notifications about new order
      console.log('📤 Sending notifications...');
      await Promise.all([
        notifyAdminNewOrder(order),
        notifyUserNewOrder(order)
      ]);
      console.log('✅ Admin and customer notified about new order');

      // Update user bonus points
      if (checkoutData.useBonusPoints && checkoutData.bonusPointsUsed > 0) {
        await updateBonusPoints(-checkoutData.bonusPointsUsed);
      }

      // Calculate and add bonus points for this purchase (10% of total)
      const earnedPoints = calculateBonusPoints(checkoutData.total);
      await updateBonusPoints(earnedPoints);

      // Clear cart
      clearCart();

      // Navigate to profile with success message
      alert(`Order submitted successfully! You earned ${earnedPoints} bonus points.\n\nOrder ID: ${order.id}\n\nYour order is pending approval.`);
      onNavigate('profile');
    } catch (error) {
      console.error('❌ Failed to submit order:', error);
      alert(`Failed to submit order: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setUploading(false);
    }
  };

  // Use MainButton for payment methods
  const getButtonText = () => {
    if (paymentMethod === 'telegram') return 'Pay with Payme';
    if (paymentMethod === 'click') return 'Pay with Click';
    return 'Submit Order';
  };

  const getButtonHandler = () => {
    if (paymentMethod === 'telegram') return handlePaymePayment;
    if (paymentMethod === 'click') return handleClickPayment;
    return handleSubmitOrder;
  };

  useMainButton(
    getButtonText(),
    getButtonHandler(),
    {
      enabled: paymentMethod === 'telegram' || paymentMethod === 'click' || screenshot !== null,
      progress: processingPayment || uploading,
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
    <div className="pb-20">
      <div className="p-4 space-y-6">
        <h2 className="text-2xl font-bold">Payment</h2>

        {/* Order Total */}
        <div className="bg-gradient-to-r from-accent to-blue-600 text-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-sm mb-2">Total Amount</p>
          <p className="text-4xl font-bold">{formatPrice(checkoutData.total)}</p>
        </div>

        {/* Payment Method Selection */}
        {paymeEnabled && (
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
              <button
                onClick={() => setPaymentMethod('manual')}
                className={`w-full p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                  paymentMethod === 'manual'
                    ? 'border-accent bg-blue-50'
                    : 'border-gray-300 hover:border-accent'
                }`}
              >
                <Upload className="w-6 h-6 text-accent" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Manual Payment</p>
                  <p className="text-sm text-gray-600">Pay via bank transfer</p>
                </div>
                {paymentMethod === 'manual' && (
                  <CheckCircle className="w-5 h-5 text-accent" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Manual Payment Instructions */}
        {paymentMethod === 'manual' && (
          <>
            {/* Admin Card Number */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4">Payment Details</h3>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Card Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={adminCardNumber}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <button
                onClick={handleCopyCardNumber}
                className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-accent p-4 rounded">
            <p className="text-sm text-gray-700 font-semibold mb-2">Payment Instructions:</p>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Copy the card number above</li>
              <li>Open your banking app and make the payment</li>
              <li>Take a screenshot of the successful transaction</li>
              <li>Upload the screenshot below</li>
            </ol>
          </div>
        </div>

            {/* Screenshot Upload */}
            <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Upload Payment Screenshot</h3>

          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="screenshot-upload"
            />
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                screenshot
                  ? 'border-success bg-green-50'
                  : 'border-gray-300 hover:border-accent hover:bg-gray-50'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-3"></div>
                  <p className="text-gray-600">Uploading...</p>
                </div>
              ) : screenshot ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className="w-12 h-12 text-success mb-3" />
                  <p className="text-success font-semibold mb-1">Screenshot Uploaded</p>
                  <p className="text-sm text-gray-600 mb-3">{screenshot.name}</p>
                  <img
                    src={URL.createObjectURL(screenshot)}
                    alt="Payment screenshot"
                    className="max-h-48 rounded-lg shadow-md mb-3"
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="text-accent font-semibold hover:underline cursor-pointer"
                  >
                    Change Screenshot
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-700 font-semibold mb-1">
                    Click to upload screenshot
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              )}
            </div>
            </label>
            </div>
          </>
        )}

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
