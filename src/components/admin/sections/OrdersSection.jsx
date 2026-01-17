import { useState, useContext, useMemo } from 'react';
import {
  X, Users as UsersIcon, Truck, Image, ShoppingBag, DollarSign,
  Download, FileDown, RotateCw, Package, Printer
} from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { formatPrice, formatDate, loadFromLocalStorage } from '../../../utils/helpers';
import { exportOrders, exportOrderItems } from '../../../utils/csvExport';
import { notifyUserOrderStatus, notifyReferrerReward } from '../../../services/telegram';
import { printShippingLabel, printMultipleLabels } from '../../../utils/shippingLabel';
import { printPackingSlip, printMultiplePackingSlips } from '../../../utils/packingSlip';
import { usersAPI } from '../../../services/api';

const OrdersSection = ({ onImageClick }) => {
  const { orders, approveOrder, rejectOrder, updateOrderStatus, loadAllData, updateUserBonusPoints } = useContext(AdminContext);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredOrders = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? orders
      : orders.filter(order => order.status === statusFilter);
    return filtered;
  }, [orders, statusFilter]);

  const handleApprove = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirm('Approve this order? This will deduct stock from inventory and award bonus points.')) {
      try {
        await approveOrder(orderId);
        console.log('✅ Order approved');

        if (order.userId) {
          try {
            const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 3, referralCommission: 10 });
            const purchaseBonusPercentage = bonusConfig?.purchaseBonus || 3;
            const purchaseBonusPoints = Math.round((order.total * purchaseBonusPercentage) / 100);

            await updateUserBonusPoints(order.userId, purchaseBonusPoints);
            console.log(`💰 Purchase bonus: Customer earned ${purchaseBonusPoints} points`);

            const customer = await usersAPI.getById(order.userId);
            if (customer && customer.referred_by) {
              const referrer = await usersAPI.getByReferralCode(customer.referred_by);
              if (referrer) {
                const commissionPercentage = bonusConfig?.referralCommission || 10;
                const commissionAmount = Math.round((order.total * commissionPercentage) / 100);
                const newReferrals = (referrer.referrals || 0) + 1;
                const newBonusPoints = (referrer.bonus_points || 0) + commissionAmount;

                await usersAPI.update(referrer.id, {
                  referrals: newReferrals,
                  bonus_points: newBonusPoints
                });

                await notifyReferrerReward(referrer, commissionAmount, newReferrals);
              }
            }
          } catch (bonusError) {
            console.error('❌ Failed to award bonus points:', bonusError);
          }
        }

        await notifyUserOrderStatus(order, 'approved');
      } catch (error) {
        console.error('❌ Failed to approve order:', error);
        alert('Failed to approve order. Please try again.');
      }
    }
  };

  const handleReject = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirm('Reject this order? If previously approved, stock will be restored and bonus points refunded.')) {
      try {
        const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 3 });
        const bonusPercentage = bonusConfig?.purchaseBonus || 3;
        const earnedPoints = Math.round((order.total * bonusPercentage) / 100);

        await rejectOrder(orderId, async (rejectedOrder) => {
          if (rejectedOrder.userId && earnedPoints > 0) {
            try {
              await updateUserBonusPoints(rejectedOrder.userId, -earnedPoints);
            } catch (err) {
              console.error('Failed to refund bonus points:', err);
            }
          }
        });

        await notifyUserOrderStatus(order, 'rejected');
      } catch (error) {
        console.error('❌ Failed to reject order:', error);
        alert('Failed to reject order. Please try again.');
      }
    }
  };

  const handleMarkShipped = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirm('Mark this order as shipped? Customer will be notified.')) {
      try {
        await updateOrderStatus(orderId, 'shipped');
        await notifyUserOrderStatus(order, 'shipped');
      } catch (error) {
        console.error('❌ Failed to mark as shipped:', error);
        alert('Failed to update order status. Please try again.');
      }
    }
  };

  const handleMarkDelivered = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirm('Mark this order as delivered? Customer will be notified.')) {
      try {
        await updateOrderStatus(orderId, 'delivered');
        await notifyUserOrderStatus(order, 'delivered');
      } catch (error) {
        console.error('❌ Failed to mark as delivered:', error);
        alert('Failed to update order status. Please try again.');
      }
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAllData();
    } catch (error) {
      console.error('❌ Failed to refresh orders:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.length === 0) {
      alert('Please select orders and an action');
      return;
    }

    const action = bulkAction;
    const count = selectedOrders.length;

    if (!confirm(`${action} ${count} order(s)?`)) return;

    try {
      for (const orderId of selectedOrders) {
        const order = orders.find(o => o.id === orderId);
        if (!order) continue;

        switch (action) {
          case 'Approve':
            if (order.status === 'pending') await approveOrder(orderId);
            break;
          case 'Mark as Shipped':
            if (order.status === 'approved') await updateOrderStatus(orderId, 'shipped');
            break;
          case 'Mark as Delivered':
            if (order.status === 'shipped') await updateOrderStatus(orderId, 'delivered');
            break;
          case 'Reject':
            if (order.status === 'pending') await rejectOrder(orderId);
            break;
        }
      }

      setSelectedOrders([]);
      setBulkAction('');
      alert(`Successfully ${action.toLowerCase()}d ${count} order(s)`);
    } catch (error) {
      console.error('❌ Bulk action failed:', error);
      alert('Some orders failed to update. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Orders Management</h3>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <div className="relative group">
              <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => exportOrders(filteredOrders, `orders_${statusFilter}`)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Orders Summary
                </button>
                <button
                  onClick={() => exportOrderItems(filteredOrders, `order_items_${statusFilter}`)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-t"
                >
                  <FileDown className="w-4 h-4" />
                  Order Items Detail
                </button>
              </div>
            </div>

            <select
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status ({orders.length})</option>
              <option value="pending">Pending ({orders.filter(o => o.status === 'pending').length})</option>
              <option value="approved">Approved ({orders.filter(o => o.status === 'approved').length})</option>
              <option value="shipped">Shipped ({orders.filter(o => o.status === 'shipped').length})</option>
              <option value="delivered">Delivered ({orders.filter(o => o.status === 'delivered').length})</option>
              <option value="rejected">Rejected ({orders.filter(o => o.status === 'rejected').length})</option>
            </select>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-semibold text-blue-900">
              {selectedOrders.length} order(s) selected
            </span>
            <button
              onClick={() => {
                const ordersToPrint = orders.filter(o => selectedOrders.includes(o.id));
                printMultiplePackingSlips(ordersToPrint);
              }}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-1.5"
            >
              <Package className="w-4 h-4" />
              Pack {selectedOrders.length}
            </button>
            <button
              onClick={() => {
                const ordersToPrint = orders.filter(o => selectedOrders.includes(o.id));
                printMultipleLabels(ordersToPrint);
              }}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Label {selectedOrders.length}
            </button>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-accent"
            >
              <option value="">Select Action</option>
              <option value="Approve">Approve</option>
              <option value="Mark as Shipped">Mark as Shipped</option>
              <option value="Mark as Delivered">Mark as Delivered</option>
              <option value="Reject">Reject</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedOrders([])}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  No orders found for selected filter
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className={`hover:bg-gray-50 ${selectedOrders.includes(order.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{order.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.userName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.createdAt || order.date)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatPrice(order.total)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'approved' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                      >
                        View
                      </button>
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(order.id)}
                            className="text-green-600 hover:text-green-800 font-medium whitespace-nowrap"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            className="text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {order.status === 'approved' && (
                        <>
                          <button
                            onClick={() => printPackingSlip(order)}
                            className="text-orange-600 hover:text-orange-800 font-medium whitespace-nowrap flex items-center gap-1"
                          >
                            <Package className="w-4 h-4" />
                            Pack
                          </button>
                          <button
                            onClick={() => printShippingLabel(order)}
                            className="text-green-600 hover:text-green-800 font-medium whitespace-nowrap flex items-center gap-1"
                          >
                            <Printer className="w-4 h-4" />
                            Label
                          </button>
                          <button
                            onClick={() => handleMarkShipped(order.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                          >
                            Mark Shipped
                          </button>
                        </>
                      )}
                      {order.status === 'shipped' && (
                        <>
                          <button
                            onClick={() => printShippingLabel(order)}
                            className="text-green-600 hover:text-green-800 font-medium whitespace-nowrap flex items-center gap-1"
                          >
                            <Printer className="w-4 h-4" />
                            Label
                          </button>
                          <button
                            onClick={() => handleMarkDelivered(order.id)}
                            className="text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap"
                          >
                            Mark Delivered
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Order #{selectedOrder.id}</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div>
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-primary" />
                  Customer Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedOrder.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedOrder.userPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">User ID:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedOrder.userId}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              {selectedOrder.deliveryInfo && (
                <div>
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Delivery Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedOrder.deliveryInfo.fullName && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Recipient:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedOrder.deliveryInfo.fullName}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryInfo.phone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Contact:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedOrder.deliveryInfo.phone}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryInfo.city && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">City:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedOrder.deliveryInfo.city}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryInfo.address && (
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Address:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedOrder.deliveryInfo.address}</span>
                      </div>
                    )}
                    {selectedOrder.courier && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Courier Service:</span>
                          <span className="text-sm font-semibold text-primary">
                            {typeof selectedOrder.courier === 'string' && selectedOrder.courier.startsWith('{')
                              ? JSON.parse(selectedOrder.courier).name
                              : typeof selectedOrder.courier === 'object'
                              ? selectedOrder.courier.name
                              : selectedOrder.courier}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedOrder.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Delivery Fee:</span>
                        <span className="text-sm font-medium text-gray-900">{formatPrice(selectedOrder.deliveryFee)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Information */}
              {selectedOrder.paymentScreenshot && (
                <div>
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Image className="w-5 h-5 text-primary" />
                    Payment Screenshot
                  </h4>
                  <div
                    onClick={() => onImageClick && onImageClick(selectedOrder.paymentScreenshot)}
                    className="block cursor-pointer"
                  >
                    <img
                      src={selectedOrder.paymentScreenshot}
                      alt="Payment screenshot"
                      className="w-full max-h-64 object-contain rounded-lg border-2 border-gray-200 hover:border-primary transition-colors"
                    />
                    <p className="text-xs text-center text-gray-500 mt-2">Click to view full size</p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  Order Items
                </h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.productName || item.name}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.productName || item.name || 'Unknown Product'}
                        </p>
                        {(item.color || item.size) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.color && <span>{item.color}</span>}
                            {item.color && item.size && <span> • </span>}
                            {item.size && <span>{item.size}</span>}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPrice(item.price)} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Order Summary
                </h4>
                <div className="space-y-2">
                  {selectedOrder.subtotal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                  )}
                  {selectedOrder.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Fee:</span>
                      <span className="font-medium text-gray-900">{formatPrice(selectedOrder.deliveryFee)}</span>
                    </div>
                  )}
                  {selectedOrder.bonusDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Bonus Discount:</span>
                      <span className="font-medium text-green-600">-{formatPrice(selectedOrder.bonusDiscount)}</span>
                    </div>
                  )}
                  {selectedOrder.bonusPointsUsed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bonus Points Used:</span>
                      <span className="font-medium text-gray-900">{selectedOrder.bonusPointsUsed} pts</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-primary">{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Status & Date */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Order Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 text-sm font-semibold rounded-full ${
                    selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedOrder.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    selectedOrder.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                    selectedOrder.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedOrder.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(selectedOrder.createdAt || selectedOrder.date)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersSection;
