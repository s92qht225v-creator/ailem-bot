import { useState, useContext, useMemo } from 'react';
import {
  X, Users as UsersIcon, Truck, ShoppingBag, DollarSign,
  Download, FileDown, RotateCw, Package, Printer
} from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { formatPrice, formatDate, loadFromLocalStorage, getStatusLabel } from '../../../utils/helpers';
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

  const pillClass = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'approved' || s === 'delivered' || s === 'completed') return 'a-pill-ok';
    if (s === 'pending') return 'a-pill-warn';
    if (s === 'rejected') return 'a-pill-danger';
    return 'a-pill-info';
  };

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
            const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 1, referralCommission: 3 });
            const purchaseBonusPercentage = bonusConfig?.purchaseBonus || 1;
            const purchaseBonusPoints = Math.round(((order.subtotal || order.total) * purchaseBonusPercentage) / 100);

            // Deduct bonus points that were used in this order
            if (order.bonusPointsUsed > 0) {
              await updateUserBonusPoints(order.userId, -order.bonusPointsUsed);
            }

            await updateUserBonusPoints(order.userId, purchaseBonusPoints);

            const customer = await usersAPI.getById(order.userId);
            if (customer && customer.referred_by) {
              const referrer = await usersAPI.getByReferralCode(customer.referred_by);
              if (referrer) {
                const commissionPercentage = bonusConfig?.referralCommission || 3;
                const commissionAmount = Math.round(((order.subtotal || order.total) * commissionPercentage) / 100);
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
        const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 1 });
        const bonusPercentage = bonusConfig?.purchaseBonus || 1;
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
                const wasApproved = order.status === 'approved';
                const bConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 1 });
                const bPercentage = bConfig?.purchaseBonus || 1;
                const earned = Math.round(((order.subtotal || order.total) * bPercentage) / 100);
                await rejectOrder(orderId, async (rejectedOrder) => {
                  if (wasApproved && rejectedOrder.userId && earned > 0) {
                    try {
                      await updateUserBonusPoints(rejectedOrder.userId, -earned);
                    } catch (err) {
                      console.error('Failed to refund bonus points in bulk reject:', err);
                    }
                  }
                });
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
    <div className="a-card">
      <div className="a-card-h" style={{ flexWrap: 'wrap', gap: 12 }}>
        <h3>Buyurtmalarni boshqarish</h3>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="a-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Yangilash
          </button>

          <div className="relative group">
            <button className="a-btn">
              <Download className="w-4 h-4" />
              CSV yuklab olish
            </button>
            <div className="a-card absolute right-0 mt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10" style={{ overflow: 'hidden' }}>
              <button
                onClick={() => exportOrders(filteredOrders, `orders_${statusFilter}`)}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text)' }}
              >
                <FileDown className="w-4 h-4" />
                Buyurtmalar hisoboti
              </button>
              <button
                onClick={() => exportOrderItems(filteredOrders, `order_items_${statusFilter}`)}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
              >
                <FileDown className="w-4 h-4" />
                Buyurtma tafsilotlari
              </button>
            </div>
          </div>

          <select
            className="a-input"
            style={{ width: 'auto' }}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">Barcha buyurtmalar ({orders.length})</option>
            <option value="online">Onlayn ({onlineOrdersCount})</option>
            <option value="cash">Naqd/POS ({cashOrdersCount})</option>
          </select>

          <select
            className="a-input"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Barcha holatlar</option>
            <option value="pending">Kutilmoqda ({orders.filter(o => o.status === 'pending').length})</option>
            <option value="approved">Tasdiqlangan ({orders.filter(o => o.status === 'approved').length})</option>
            <option value="shipped">Jo'natilgan ({orders.filter(o => o.status === 'shipped').length})</option>
            <option value="delivered">Yetkazilgan ({orders.filter(o => o.status === 'delivered').length})</option>
            <option value="completed">Bajarilgan ({orders.filter(o => o.status === 'completed').length})</option>
            <option value="rejected">Rad etilgan ({orders.filter(o => o.status === 'rejected').length})</option>
          </select>
        </div>
      </div>

      <div className="p-4 space-y-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium a-muted">Sana oralig'i:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="a-input"
              style={{ width: 'auto' }}
              placeholder="Dan"
            />
            <span className="a-faint">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="a-input"
              style={{ width: 'auto' }}
              placeholder="Gacha"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="a-btn"
              style={{ padding: '4px 9px', fontSize: 11 }}
            >
              Sanalarni tozalash
            </button>
          )}
          <span className="ml-auto text-sm a-faint">
            {orders.length} tadan {filteredOrders.length} ta ko'rsatilmoqda
          </span>
        </div>

        {/* Bulk Operation Progress */}
        {bulkProgress.isProcessing && (
          <div className="p-4 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {bulkProgress.action}: {bulkProgress.current} / {bulkProgress.total}
              </span>
              <span className="text-sm a-num a-muted">
                {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full rounded-full h-2.5" style={{ background: 'var(--border)' }}>
              <div
                className="h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, background: 'var(--accent)' }}
              />
            </div>
            <p className="text-xs mt-2 a-muted">Buyurtmalar qayta ishlanmoqda, iltimos kuting...</p>
          </div>
        )}

        {selectedOrders.length > 0 && !bulkProgress.isProcessing && (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {selectedOrders.length} ta buyurtma tanlandi
            </span>
            <button
              onClick={() => {
                const ordersToPrint = orders.filter(o => selectedOrders.includes(o.id));
                printMultiplePackingSlips(ordersToPrint);
              }}
              className="a-btn"
            >
              <Package className="w-4 h-4" />
              Qadoqlash {selectedOrders.length}
            </button>
            <button
              onClick={() => {
                const ordersToPrint = orders.filter(o => selectedOrders.includes(o.id));
                printMultipleLabels(ordersToPrint);
              }}
              className="a-btn"
            >
              <Printer className="w-4 h-4" />
              Yorliq {selectedOrders.length}
            </button>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="a-input"
              style={{ width: 'auto' }}
            >
              <option value="">Amalni tanlang</option>
              <option value="Approve">Tasdiqlash</option>
              <option value="Mark as Shipped">Jo'natildi deb belgilash</option>
              <option value="Mark as Delivered">Yetkazildi deb belgilash</option>
              <option value="Reject">Rad etish</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction || bulkProgress.isProcessing}
              className="a-btn a-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProgress.isProcessing ? 'Bajarilmoqda...' : 'Qo\'llash'}
            </button>
            <button
              onClick={() => setSelectedOrders([])}
              className="a-btn"
            >
              Tozalash
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="a-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent)' }}
                />
              </th>
              <th>Buyurtma ID</th>
              <th>Mijoz</th>
              <th>Sana</th>
              <th>Jami</th>
              <th>Holat</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center a-faint" style={{ padding: '48px 24px' }}>
                  Tanlangan filtr uchun buyurtma topilmadi
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} style={selectedOrders.includes(order.id) ? { background: 'var(--accent-weak)' } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </td>
                  <td className="a-num" style={{ fontWeight: 500, color: 'var(--text)' }}>
                    <div className="flex items-center gap-2">
                      #{order.id}
                      {order.paymentMethod === 'cash' && (
                        <span className="a-pill a-pill-ok">
                          POS
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text)' }}>{order.userName}</td>
                  <td className="a-muted">{formatDate(order.createdAt || order.date)}</td>
                  <td className="a-num" style={{ fontWeight: 500, color: 'var(--text)' }}>{formatPrice(order.total)}</td>
                  <td>
                    <span className={`a-pill ${pillClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2 flex-wrap items-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="font-medium whitespace-nowrap"
                        style={{ color: 'var(--accent-ink)' }}
                      >
                        Ko'rish
                      </button>
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(order.id)}
                            className="font-medium whitespace-nowrap"
                            style={{ color: 'var(--ok)' }}
                          >
                            Tasdiqlash
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            className="font-medium whitespace-nowrap"
                            style={{ color: 'var(--danger)' }}
                          >
                            Rad etish
                          </button>
                        </>
                      )}
                      {order.status === 'approved' && (
                        <>
                          <button
                            onClick={() => printPackingSlip(order)}
                            className="font-medium whitespace-nowrap flex items-center gap-1"
                            style={{ color: 'var(--warn)' }}
                          >
                            <Package className="w-4 h-4" />
                            Qadoqlash
                          </button>
                          <button
                            onClick={() => printShippingLabel(order)}
                            className="font-medium whitespace-nowrap flex items-center gap-1"
                            style={{ color: 'var(--ok)' }}
                          >
                            <Printer className="w-4 h-4" />
                            Yorliq
                          </button>
                          <button
                            onClick={() => handleMarkShipped(order.id)}
                            className="font-medium whitespace-nowrap"
                            style={{ color: 'var(--accent-ink)' }}
                          >
                            Jo'natildi
                          </button>
                        </>
                      )}
                      {order.status === 'shipped' && (
                        <>
                          <button
                            onClick={() => printShippingLabel(order)}
                            className="font-medium whitespace-nowrap flex items-center gap-1"
                            style={{ color: 'var(--ok)' }}
                          >
                            <Printer className="w-4 h-4" />
                            Yorliq
                          </button>
                          <button
                            onClick={() => handleMarkDelivered(order.id)}
                            className="font-medium whitespace-nowrap"
                            style={{ color: 'var(--info)' }}
                          >
                            Yetkazildi
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
          <div className="a-card max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="a-card-h">
              <h3 style={{ fontSize: 18 }}>Buyurtma #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="a-faint hover:text-[var(--text)]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div>
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <UsersIcon className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
                  Mijoz ma'lumotlari
                </h4>
                <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex justify-between">
                    <span className="text-sm a-muted">Ism:</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedOrder.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm a-muted">Telefon:</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedOrder.userPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm a-muted">Foydalanuvchi ID:</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedOrder.userId}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              {selectedOrder.deliveryInfo && (
                <div>
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Truck className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
                    Yetkazib berish tafsilotlari
                  </h4>
                  <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {selectedOrder.deliveryInfo.fullName && (
                      <div className="flex justify-between">
                        <span className="text-sm a-muted">Qabul qiluvchi:</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedOrder.deliveryInfo.fullName}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryInfo.phone && (
                      <div className="flex justify-between">
                        <span className="text-sm a-muted">Aloqa:</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedOrder.deliveryInfo.phone}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryInfo.city && (
                      <div className="flex justify-between">
                        <span className="text-sm a-muted">Shahar:</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedOrder.deliveryInfo.city}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryInfo.address && (
                      <div>
                        <span className="text-sm a-muted block mb-1">Manzil:</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{selectedOrder.deliveryInfo.address}</span>
                      </div>
                    )}
                    {selectedOrder.courier && (
                      <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex justify-between">
                          <span className="text-sm a-muted">Kuryer xizmati:</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
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
                        <span className="text-sm a-muted">Yetkazib berish narxi:</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{formatPrice(selectedOrder.deliveryFee)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <ShoppingBag className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
                  Buyurtma tarkibi
                </h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.productName || item.name}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: 'var(--text)' }}>
                          {item.productName || item.name || 'Noma\'lum mahsulot'}
                        </p>
                        {(item.color || item.size) && (
                          <p className="text-xs a-faint mt-1">
                            {item.color && <span>{item.color}</span>}
                            {item.color && item.size && <span> • </span>}
                            {item.size && <span>{item.size}</span>}
                          </p>
                        )}
                        <p className="text-sm a-muted mt-1">Soni: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold a-num" style={{ color: 'var(--text)' }}>
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <p className="text-xs a-faint a-num">
                          {formatPrice(item.price)} / dona
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <DollarSign className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
                  Buyurtma hisoboti
                </h4>
                <div className="space-y-2">
                  {selectedOrder.subtotal && (
                    <div className="flex justify-between text-sm">
                      <span className="a-muted">Oraliq summa:</span>
                      <span className="font-medium a-num" style={{ color: 'var(--text)' }}>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                  )}
                  {selectedOrder.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="a-muted">Yetkazib berish narxi:</span>
                      <span className="font-medium a-num" style={{ color: 'var(--text)' }}>{formatPrice(selectedOrder.deliveryFee)}</span>
                    </div>
                  )}
                  {selectedOrder.bonusDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--ok)' }}>Bonus chegirma:</span>
                      <span className="font-medium a-num" style={{ color: 'var(--ok)' }}>-{formatPrice(selectedOrder.bonusDiscount)}</span>
                    </div>
                  )}
                  {selectedOrder.bonusPointsUsed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="a-muted">Ishlatilgan bonus:</span>
                      <span className="font-medium a-num" style={{ color: 'var(--text)' }}>{selectedOrder.bonusPointsUsed} ball</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-strong)' }}>
                    <div className="flex justify-between">
                      <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>Jami:</span>
                      <span className="text-lg font-bold a-num" style={{ color: 'var(--accent-ink)' }}>{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>

                  {/* Cash Payment Details */}
                  {selectedOrder.paymentMethod === 'cash' && (
                    <div className="pt-2 mt-2 space-y-2" style={{ borderTop: '1px solid var(--border-strong)' }}>
                      <div className="flex justify-between text-sm">
                        <span className="a-muted">To'lov usuli:</span>
                        <span className="font-medium" style={{ color: 'var(--ok)' }}>Naqd (POS)</span>
                      </div>
                      {selectedOrder.cashReceived > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="a-muted">Qabul qilingan naqd:</span>
                          <span className="font-medium a-num" style={{ color: 'var(--text)' }}>{formatPrice(selectedOrder.cashReceived)}</span>
                        </div>
                      )}
                      {selectedOrder.changeGiven > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="a-muted">Qaytim:</span>
                          <span className="font-medium a-num" style={{ color: 'var(--text)' }}>{formatPrice(selectedOrder.changeGiven)}</span>
                        </div>
                      )}
                      {selectedOrder.cashierName && (
                        <div className="flex justify-between text-sm">
                          <span className="a-muted">Kassir:</span>
                          <span className="font-medium" style={{ color: 'var(--text)' }}>{selectedOrder.cashierName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Status & Date */}
              <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm a-muted">Buyurtma holati</p>
                  <span className={`a-pill ${pillClass(selectedOrder.status)}`} style={{ marginTop: 4 }}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm a-muted">Buyurtma sanasi</p>
                  <p className="text-sm font-medium mt-1" style={{ color: 'var(--text)' }}>{formatDate(selectedOrder.createdAt || selectedOrder.date)}</p>
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
