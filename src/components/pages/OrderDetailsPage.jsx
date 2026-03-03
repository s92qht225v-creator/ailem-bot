import { useOrders } from '../../hooks/useOrders';
import { t } from '../../utils/translation-fallback';
import { formatPrice, formatDate, getStatusColor } from '../../utils/helpers';
import { useBackButton } from '../../hooks/useBackButton';

const OrderDetailsPage = ({ orderId, onNavigate }) => {
  const { getOrderById, orders } = useOrders();
  const order = getOrderById(orderId);

  // Use native Telegram BackButton
  useBackButton(() => onNavigate('profile'));

  // Helper to format courier/delivery method
  const formatDeliveryMethod = () => {
    // Translate common duration values
    const translateDuration = (duration) => {
      if (!duration) return '';
      const translations = {
        'Home Delivery': t('orderDetails.homeDelivery'),
        'Pickup': t('orderDetails.pickup'),
      };
      return translations[duration] || duration;
    };

    // Helper to parse and format courier data
    const formatCourier = (courier) => {
      if (!courier) return null;

      // If it's a string, try to parse as JSON
      let parsed = courier;
      if (typeof courier === 'string') {
        // Check if it looks like JSON
        if (courier.startsWith('{')) {
          try {
            parsed = JSON.parse(courier);
          } catch {
            return courier; // Return as-is if not valid JSON
          }
        } else {
          return courier; // Plain string
        }
      }

      // Now format the parsed object
      if (parsed?.name) {
        const translatedDuration = translateDuration(parsed.duration);
        return translatedDuration
          ? `${parsed.name} - ${translatedDuration}`
          : parsed.name;
      }
      return null;
    };

    // Check order.courier first
    const courierResult = formatCourier(order.courier);
    if (courierResult) return courierResult;

    // Check deliveryInfo.courier
    const diCourierResult = formatCourier(order.deliveryInfo?.courier);
    if (diCourierResult) return diCourierResult;

    return 'N/A';
  };

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-gray-500 mb-4">{t('orderDetails.notFound')}</p>
        <button
          onClick={() => onNavigate('profile')}
          className="text-accent font-semibold hover:underline"
        >
          {t('orderDetails.backToProfile')}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8 pt-16 bg-gray-50 min-h-screen">
      <div className="p-4 lg:flex lg:gap-8 lg:items-start">
        <div className="lg:flex-1 space-y-4">
        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{t('orderDetails.title')}</h2>
              <p className="text-sm text-gray-500 mt-1">{formatDate(order.date)}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
              {t(`orders.${order.status}`)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('orders.orderNumber')}</span>
              <span className="font-semibold">{order.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('orderDetails.items')}</span>
              <span className="font-semibold">{order.items.length}</span>
            </div>
          </div>
        </div>

        </div>{/* end left column */}

        <div className="lg:w-96 lg:flex-shrink-0 space-y-4 mt-4 lg:mt-0">
        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 lg:mb-0">
          <h3 className="font-semibold text-gray-800 mb-3">{t('orderDetails.orderItems')}</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.productName}</p>
                  {item.color && (
                    <p className="text-sm text-gray-600">{t('orderDetails.color')}: {item.color}</p>
                  )}
                  {item.size && (
                    <p className="text-sm text-gray-600">{t('orderDetails.size')}: {item.size}</p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-gray-600">{t('orderDetails.qty')}: {item.quantity}</p>
                    <p className="font-semibold text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Information */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t('checkout.deliveryInfo')}</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">{t('orderDetails.name')}:</span>
              <p className="font-medium">{order.deliveryInfo.fullName}</p>
            </div>
            <div>
              <span className="text-gray-600">{t('orderDetails.phone')}:</span>
              <p className="font-medium">{order.deliveryInfo.phone}</p>
            </div>
            <div>
              <span className="text-gray-600">{t('orderDetails.address')}:</span>
              <p className="font-medium">{order.deliveryInfo.address}</p>
            </div>
            <div>
              <span className="text-gray-600">{t('orderDetails.city')}:</span>
              <p className="font-medium">{order.deliveryInfo.city}</p>
            </div>
            <div>
              <span className="text-gray-600">{t('checkout.deliveryMethod')}:</span>
              <p className="font-medium">{formatDeliveryMethod()}</p>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t('orderDetails.paymentSummary')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('checkout.subtotal')}:</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>

            {order.bonusDiscount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>{t('checkout.bonusDiscount')}:</span>
                <span>-{formatPrice(order.bonusDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('checkout.deliveryFee')}:</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </div>

            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-lg">{t('checkout.total')}:</span>
                <span className="font-bold text-xl text-primary">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>

          {order.bonusPointsUsed > 0 && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{t('orderDetails.bonusPointsUsed')}:</span> {order.bonusPointsUsed} {t('profile.earnings')}
              </p>
            </div>
          )}
        </div>

        {/* Order Status Info */}
        <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
          <h3 className="font-semibold text-gray-800 mb-2">{t('orderDetails.orderStatus')}</h3>
          {order.status === 'pending' && (
            <p className="text-sm text-gray-600">
              {t('orderDetails.statusPending')}
            </p>
          )}
          {order.status === 'approved' && (
            <p className="text-sm text-success font-medium">
              {t('orderDetails.statusApproved')}
            </p>
          )}
          {order.status === 'shipped' && (
            <p className="text-sm text-accent font-medium">
              {t('orderDetails.statusShipped')}
            </p>
          )}
          {order.status === 'delivered' && (
            <p className="text-sm text-success font-medium">
              {t('orderDetails.statusDelivered')}
            </p>
          )}
          {order.status === 'rejected' && (
            <p className="text-sm text-error font-medium">
              {t('orderDetails.statusRejected')}
            </p>
          )}
        </div>
        </div>{/* end right column */}
      </div>
    </div>
  );
};

export default OrderDetailsPage;
