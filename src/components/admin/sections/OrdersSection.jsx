import { useState, useContext, useMemo } from 'react';
import {
  X, Users as UsersIcon, Truck, Image, ShoppingBag, DollarSign,
  Download, FileDown, RotateCw, Package, Printer
} from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { formatPrice, formatDate, loadFromLocalStorage } from '../../../utils/helpers';
import { exportOrders, exportOrderItems } from '../../../utils/csvExport';
import { notifyUserOrderStatus, notifyReferrerReward } from '../../../services/telegram';
import { printShippingLabel, printMultipleLabels } from '../../../utils/shippingLabel';
import { printPackingSlip, printMultiplePackingSlips } from '../../../utils/packingSlip';
import { usersAPI } from '../../../services/api';

const OrdersSection = ({ onImageClick }) => {
  const { orders, approveOrder, rejectOrder, updateOrderStatus, loadAllData, updateUserBonusPoints } = useContext(AdminContext);
  const toast = useToast();
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'online', 'cash'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Bulk operation loading state
  const [bulkProgress, setBulkProgress] = useState({ isProcessing: false, current: 0, total: 0, action: '' });
  // Date range filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      // Source filter (online vs cash)
      const isCashOrder = order.paymentMethod === 'cash';
      const matchesSource = sourceFilter === 'all' ||
        (sourceFilter === 'cash' && isCashOrder) ||
        (sourceFilter === 'online' && !isCashOrder);

      // Date filter
      const orderDate = new Date(order.createdAt || order.date);
      const matchesDateFrom = !dateFrom || orderDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || orderDate <= new Date(dateTo + 'T23:59:59');

      return matchesStatus && matchesSource && matchesDateFrom && matchesDateTo;
    });
  }, [orders, statusFilter, sourceFilter, dateFrom, dateTo]);

  // Count orders by source
  const cashOrdersCount = orders.filter(o => o.paymentMethod === 'cash').length;
  const onlineOrdersCount = orders.filter(o => o.paymentMethod !== 'cash').length;

  const handleApprove = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const confirmed = await confirm({
      title: 'Buyurtmani tasdiqlash',
      message: 'Buyurtmani tasdiqlamoqchimisiz? Ombordagi mahsulotlar kamaytiriladi va bonus ballar beriladi.',
      type: 'success',
      confirmText: 'Tasdiqlash',
      cancelText: 'Bekor qilish'
    });

    if (confirmed) {
      try {
        await approveOrder(orderId);
        toast.success('Buyurtma muvaffaqiyatli tasdiqlandi');

        if (order.userId) {
          try {
            const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 3, referralCommission: 10 });
            const purchaseBonusPercentage = bonusConfig?.purchaseBonus || 3;
            const purchaseBonusPoints = Math.round((order.total * purchaseBonusPercentage) / 100);

            await updateUserBonusPoints(order.userId, purchaseBonusPoints);

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
        toast.error('Buyurtmani tasdiqlashda xatolik. Qayta urinib ko\'ring.');
      }
    }
  };

  const handleReject = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const confirmed = await confirm({
      title: 'Buyurtmani rad etish',
      message: 'Buyurtmani rad etmoqchimisiz? Agar avval tasdiqlangan bo\'lsa, mahsulotlar qaytariladi va bonus ballar olib tashlanadi.',
      type: 'danger',
      confirmText: 'Rad etish',
      cancelText: 'Bekor qilish'
    });

    if (confirmed) {
      try {
        const wasApproved = order.status === 'approved';
        const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 3 });
        const bonusPercentage = bonusConfig?.purchaseBonus || 3;
        const earnedPoints = Math.round(((order.subtotal || order.total) * bonusPercentage) / 100);

        await rejectOrder(orderId, async (rejectedOrder) => {
          if (wasApproved && rejectedOrder.userId && earnedPoints > 0) {
            try {
              await updateUserBonusPoints(rejectedOrder.userId, -earnedPoints);
            } catch (err) {
              console.error('Failed to refund bonus points:', err);
            }
          }
        });

        await notifyUserOrderStatus(order, 'rejected');
        toast.success('Buyurtma rad etildi');
      } catch (error) {
        console.error('❌ Failed to reject order:', error);
        toast.error('Buyurtmani rad etishda xatolik. Qayta urinib ko\'ring.');
      }
    }
  };

  const handleMarkShipped = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const confirmed = await confirm({
      title: 'Jo\'natildi deb belgilash',
      message: 'Buyurtmani jo\'natildi deb belgilamoqchimisiz? Mijozga xabar yuboriladi.',
      type: 'info',
      confirmText: 'Jo\'natildi',
      cancelText: 'Bekor qilish'
    });

    if (confirmed) {
      try {
        await updateOrderStatus(orderId, 'shipped');
        await notifyUserOrderStatus(order, 'shipped');
        toast.success('Buyurtma jo\'natildi deb belgilandi');
      } catch (error) {
        console.error('❌ Failed to mark as shipped:', error);
        toast.error('Holatni yangilashda xatolik. Qayta urinib ko\'ring.');
      }
    }
  };

  const handleMarkDelivered = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const confirmed = await confirm({
      title: 'Yetkazildi deb belgilash',
      message: 'Buyurtmani yetkazildi deb belgilamoqchimisiz? Mijozga xabar yuboriladi.',
      type: 'success',
      confirmText: 'Yetkazildi',
      cancelText: 'Bekor qilish'
    });

    if (confirmed) {
      try {
        await updateOrderStatus(orderId, 'delivered');
        await notifyUserOrderStatus(order, 'delivered');
        toast.success('Buyurtma yetkazildi deb belgilandi');
      } catch (error) {
        console.error('❌ Failed to mark as delivered:', error);
        toast.error('Holatni yangilashda xatolik. Qayta urinib ko\'ring.');
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
      toast.warning('Iltimos, buyurtmalar va amalni tanlang');
      return;
    }

    const action = bulkAction;
    const count = selectedOrders.length;

    const actionLabels = {
      'Approve': 'Tasdiqlash',
      'Mark as Shipped': 'Jo\'natildi',
      'Mark as Delivered': 'Yetkazildi',
      'Reject': 'Rad etish'
    };

    const confirmed = await confirm({
      title: 'Ommaviy amal',
      message: `${count} ta buyurtmani "${actionLabels[action] || action}" qilmoqchimisiz?`,
      type: action === 'Reject' ? 'danger' : 'info',
      confirmText: actionLabels[action] || action,
      cancelText: 'Bekor qilish'
    });

    if (!confirmed) return;

    // Start bulk progress tracking
    setBulkProgress({ isProcessing: true, current: 0, total: count, action: actionLabels[action] || action });
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < selectedOrders.length; i++) {
        const orderId = selectedOrders[i];
        const order = orders.find(o => o.id === orderId);

        // Update progress
        setBulkProgress(prev => ({ ...prev, current: i + 1 }));

        if (!order) {
          failCount++;
          continue;
        }

        try {
          switch (action) {
            case 'Approve':
              if (order.status === 'pending') {
                await approveOrder(orderId);
                successCount++;
              }
              break;
            case 'Mark as Shipped':
              if (order.status === 'approved') {
                await updateOrderStatus(orderId, 'shipped');
                successCount++;
              }
              break;
            case 'Mark as Delivered':
              if (order.status === 'shipped') {
                await updateOrderStatus(orderId, 'delivered');
                successCount++;
              }
              break;
            case 'Reject':
              if (order.status === 'pending') {
                await rejectOrder(orderId);
                successCount++;
              }
              break;
          }
        } catch (err) {
          console.error(`Failed to ${action} order ${orderId}:`, err);
          failCount++;
        }
      }

      setSelectedOrders([]);
      setBulkAction('');

      if (failCount > 0) {
        toast.warning(`Yakunlandi: ${successCount} ta muvaffaqiyatli, ${failCount} ta xato`);
      } else {
        toast.success(`${successCount} ta buyurtma muvaffaqiyatli yangilandi`);
      }
    } catch (error) {
      console.error('❌ Bulk action failed:', error);
      toast.error('Ommaviy amal bajarilmadi. Qayta urinib ko\'ring.');
    } finally {
      setBulkProgress({ isProcessing: false, current: 0, total: 0, action: '' });
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
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All Orders ({orders.length})</option>
              <option value="online">Online ({onlineOrdersCount})</option>
              <option value="cash">Cash/POS ({cashOrdersCount})</option>
            </select>

            <select
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending ({orders.filter(o => o.status === 'pending').length})</option>
              <option value="approved">Approved ({orders.filter(o => o.status === 'approved').length})</option>
              <option value="shipped">Shipped ({orders.filter(o => o.status === 'shipped').length})</option>
              <option value="delivered">Delivered ({orders.filter(o => o.status === 'delivered').length})</option>
              <option value="completed">Completed ({orders.filter(o => o.status === 'completed').length})</option>
              <option value="rejected">Rejected ({orders.filter(o => o.status === 'rejected').length})</option>
            </select>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Date Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="From"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="To"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              Clear dates
            </button>
          )}
          <span className="ml-auto text-sm text-gray-500">
            Showing {filteredOrders.length} of {orders.length} orders
          </span>
        </div>

        {/* Bulk Operation Progress */}
        {bulkProgress.isProcessing && (
          <div className="p-4 bg-red-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-900">
                {bulkProgress.action}: {bulkProgress.current} / {bulkProgress.total}
              </span>
              <span className="text-sm text-blue-700">
                {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5">
              <div
                className="bg-accent h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-2">Please wait while processing orders...</p>
          </div>
        )}

        {selectedOrders.length > 0 && !bulkProgress.isProcessing && (
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-blue-200">
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
              disabled={!bulkAction || bulkProgress.isProcessing}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProgress.isProcessing ? 'Processing...' : 'Apply'}
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
                <tr key={order.id} className={`hover:bg-gray-50 ${selectedOrders.includes(order.id) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      #{order.id}
                      {order.paymentMethod === 'cash' && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                          POS
                        </span>
                      )}
                    </div>
                  </td>
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
                        className="text-accent hover:text-red-800 font-medium whitespace-nowrap"
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
                            className="text-accent hover:text-red-800 font-medium whitespace-nowrap"
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

                  {/* Cash Payment Details */}
                  {selectedOrder.paymentMethod === 'cash' && (
                    <div className="border-t border-gray-300 pt-2 mt-2 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium text-green-700">Cash (POS)</span>
                      </div>
                      {selectedOrder.cashReceived > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cash Received:</span>
                          <span className="font-medium text-gray-900">{formatPrice(selectedOrder.cashReceived)}</span>
                        </div>
                      )}
                      {selectedOrder.changeGiven > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Change Given:</span>
                          <span className="font-medium text-gray-900">{formatPrice(selectedOrder.changeGiven)}</span>
                        </div>
                      )}
                      {selectedOrder.cashierName && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cashier:</span>
                          <span className="font-medium text-gray-900">{selectedOrder.cashierName}</span>
                        </div>
                      )}
                    </div>
                  )}
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
