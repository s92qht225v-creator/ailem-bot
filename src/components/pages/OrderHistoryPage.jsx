import { useContext } from 'react';
import { Package, ChevronLeft } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { formatPrice, formatDate, getStatusColor } from '../../utils/helpers';

const OrderHistoryPage = ({ onNavigate }) => {
  const { getUserOrders } = useOrders();
  const userOrders = getUserOrders();

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('profile')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Order History</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {userOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No orders yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              Start shopping to see your orders here
            </p>
            <button
              onClick={() => onNavigate('shop')}
              className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {userOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={() => onNavigate('orderDetails', { orderId: order.id })}
                onWriteReview={() => onNavigate('myReviews')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const OrderCard = ({ order, onViewDetails, onWriteReview }) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-gray-900">Order {order.id}</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.date)}</p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(
            order.status
          )}`}
        >
          {order.status.toUpperCase()}
        </span>
      </div>

      {/* Items Preview */}
      <div className="mb-3">
        {order.items.slice(0, 2).map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 py-2"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </p>
              <p className="text-xs text-gray-500">
                Qty: {item.quantity}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatPrice(item.price * item.quantity)}
            </p>
          </div>
        ))}
        {order.items.length > 2 && (
          <p className="text-xs text-gray-500 mt-2">
            +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
            <p className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</p>
          </div>
          <button
            onClick={onViewDetails}
            className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            View Details
          </button>
        </div>

        {/* Review Button for Delivered Orders */}
        {order.status === 'delivered' && (
          <button
            onClick={onWriteReview}
            className="w-full bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryPage;
