import { ArrowLeft } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { formatPrice, formatDate, getStatusColor } from '../../utils/helpers';

const OrderDetailsPage = ({ orderId, onNavigate }) => {
  const { getOrderById } = useOrders();
  const order = getOrderById(orderId);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-gray-500 mb-4">Order not found</p>
        <button
          onClick={() => onNavigate('profile')}
          className="text-accent font-semibold hover:underline"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <button
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Back to Profile</span>
        </button>
      </div>

      <div className="p-4">
        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
              <p className="text-sm text-gray-500 mt-1">{formatDate(order.date)}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
              {order.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-semibold">{order.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items:</span>
              <span className="font-semibold">{order.items.length}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3">Order Items</h3>
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
                    <p className="text-sm text-gray-600">Color: {item.color}</p>
                  )}
                  {item.size && (
                    <p className="text-sm text-gray-600">Size: {item.size}</p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
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
          <h3 className="font-semibold text-gray-800 mb-3">Delivery Information</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <p className="font-medium">{order.deliveryInfo.fullName}</p>
            </div>
            <div>
              <span className="text-gray-600">Phone:</span>
              <p className="font-medium">{order.deliveryInfo.phone}</p>
            </div>
            <div>
              <span className="text-gray-600">Address:</span>
              <p className="font-medium">{order.deliveryInfo.address}</p>
            </div>
            <div>
              <span className="text-gray-600">City:</span>
              <p className="font-medium">{order.deliveryInfo.city}</p>
            </div>
            <div>
              <span className="text-gray-600">Delivery Method:</span>
              <p className="font-medium">
                {order.courier.name} - {order.courier.duration}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Payment Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>

            {order.bonusDiscount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Bonus Discount:</span>
                <span>-{formatPrice(order.bonusDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Fee:</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </div>

            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-lg">Total:</span>
                <span className="font-bold text-xl text-primary">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>

          {order.bonusPointsUsed > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Bonus Points Used:</span> {order.bonusPointsUsed} points
              </p>
            </div>
          )}
        </div>

        {/* Order Status Info */}
        <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
          <h3 className="font-semibold text-gray-800 mb-2">Order Status</h3>
          {order.status === 'pending' && (
            <p className="text-sm text-gray-600">
              Your order is being reviewed by our team. You'll be notified once it's approved.
            </p>
          )}
          {order.status === 'approved' && (
            <p className="text-sm text-success font-medium">
              Your order has been approved and will be shipped soon!
            </p>
          )}
          {order.status === 'rejected' && (
            <p className="text-sm text-error font-medium">
              Unfortunately, your order was rejected. Please contact support for more information.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
