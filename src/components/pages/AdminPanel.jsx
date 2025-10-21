import { useState, useContext, useEffect } from 'react';
import { Shield, Package, Star, Users as UsersIcon, CheckCircle, XCircle, Edit, Trash2, Plus, ChevronRight, Edit2, ShoppingBag, Truck, Gift, Image, MapPin, Clock, Phone, Copy, DollarSign, LayoutGrid, Upload, TrendingUp, TrendingDown, BarChart3, Calendar, AlertTriangle } from 'lucide-react';
import { AdminContext } from '../../context/AdminContext';
import { PickupPointsContext } from '../../context/PickupPointsContext';
import { ShippingRatesContext } from '../../context/ShippingRatesContext';
import { formatPrice, formatDate, loadFromLocalStorage, saveToLocalStorage } from '../../utils/helpers';
import { calculateAnalytics, getRevenueChartData } from '../../utils/analytics';
import { generateVariants, updateVariantStock, getTotalVariantStock, getLowStockVariants, getOutOfStockVariants } from '../../utils/variants';
import ImageModal from '../common/ImageModal';
import { storageAPI, usersAPI } from '../../services/api';
import { notifyUserOrderStatus, notifyReferrerReward, notifyAdminLowStock } from '../../services/telegram';

const AdminPanel = () => {
  const [activeSection, setActiveSection] = useState(null);
  const { products, categories, orders, reviews } = useContext(AdminContext);

  // Calculate order counts by status
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const approvedOrders = orders.filter(o => o.status === 'approved').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;
  const rejectedOrders = orders.filter(o => o.status === 'rejected').length;

  // Calculate review counts
  const pendingReviews = reviews?.filter(r => !r.approved).length || 0;
  const approvedReviews = reviews?.filter(r => r.approved).length || 0;

  const handleBackToMenu = () => {
    setActiveSection(null);
  };

  const handleActionClick = (action) => {
    setActiveSection(action);
  };

  if (activeSection) {
    return (
      <div className="pb-20 md:pb-0 bg-gray-50 min-h-screen">
        {/* Header with Back Button */}
        <div className="bg-gradient-to-r from-primary to-gray-700 text-white p-4 md:p-6 sticky top-0 z-10 shadow-md">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={handleBackToMenu}
              className="flex items-center gap-2 text-white mb-2 hover:opacity-80 transition-opacity"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 transform rotate-180" />
              <span className="text-sm md:text-base">Back to Menu</span>
            </button>
            <h2 className="text-xl md:text-3xl font-bold capitalize">{activeSection?.replace('-', ' ')}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {activeSection === 'analytics' && <AnalyticsTab />}
          {activeSection === 'orders-pending' && <OrdersTab statusFilter="pending" />}
          {activeSection === 'orders-approved' && <OrdersTab statusFilter="approved" />}
          {activeSection === 'orders-shipped' && <OrdersTab statusFilter="shipped" />}
          {activeSection === 'orders-delivered' && <OrdersTab statusFilter="delivered" />}
          {activeSection === 'orders-rejected' && <OrdersTab statusFilter="rejected" />}
          {activeSection === 'products-manage' && <ProductsTab />}
          {activeSection === 'products-add' && <ProductsTab initialFormOpen={true} />}
          {activeSection === 'categories-manage' && <CategoriesTab />}
          {activeSection === 'categories-add' && <CategoriesTab initialFormOpen={true} />}
          {activeSection === 'promotions-upload' && <AppSettingsTab />}
          {activeSection === 'users-manage' && <UsersTab />}
          {activeSection === 'users-referrals' && <BonusSettingsTab />}
          {activeSection === 'reviews-pending' && <ReviewsTab statusFilter="pending" />}
          {activeSection === 'reviews-approved' && <ReviewsTab statusFilter="approved" />}
          {activeSection === 'pickup-points' && <PickupPointsTab />}
          {activeSection === 'shipping-rates' && <ShippingRatesTab />}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-gray-700 text-white p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 md:w-10 md:h-10" />
            <div>
              <h2 className="text-2xl md:text-4xl font-bold">Admin Panel</h2>
              <p className="text-sm md:text-base opacity-90">Manage your store</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Analytics Section */}
        <div className="mb-6">
          <button
            onClick={() => handleActionClick('analytics')}
            className="w-full md:max-w-3xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg p-6 md:p-8 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-bold">Sales Analytics</h3>
                <p className="text-sm opacity-90">View business insights</p>
              </div>
              <ChevronRight className="w-6 h-6 text-white/80" />
            </div>
          </button>
        </div>

        {/* Products Section */}
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 px-1">Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleActionClick('products-manage')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Edit2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Manage Products</h3>
                <p className="text-sm text-gray-500">{products.length} items</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => handleActionClick('products-add')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Add Product</h3>
                <p className="text-sm text-gray-500">Add new product</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 px-1">Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleActionClick('categories-manage')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <LayoutGrid className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Manage Categories</h3>
                <p className="text-sm text-gray-500">{categories.length} categories</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => handleActionClick('categories-add')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Add Category</h3>
                <p className="text-sm text-gray-500">Create new category</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Promotions Section */}
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 px-1">Promotions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleActionClick('promotions-upload')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                <Image className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Upload Banner</h3>
                <p className="text-sm text-gray-500">Upload new banner</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Delivery Section */}
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 px-1">Delivery</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleActionClick('pickup-points')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Pickup Points</h3>
                <p className="text-sm text-gray-500">Manage pickup locations</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => handleActionClick('shipping-rates')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Shipping Rates</h3>
                <p className="text-sm text-gray-500">Manage courier rates</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Orders Section */}
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 px-1">Orders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => handleActionClick('orders-pending')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Approve Orders</h3>
                <p className="text-sm text-gray-500">{pendingOrders} pending orders</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => handleActionClick('orders-approved')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Ship Orders</h3>
                <p className="text-sm text-gray-500">{approvedOrders} orders to ship</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => handleActionClick('orders-shipped')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Deliver Orders</h3>
                <p className="text-sm text-gray-500">{shippedOrders} orders to deliver</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => handleActionClick('orders-rejected')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Cancel Orders</h3>
                <p className="text-sm text-gray-500">{rejectedOrders} cancelled orders</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 px-1">Reviews</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleActionClick('reviews-pending')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                <Star className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Approve Reviews</h3>
                <p className="text-sm text-gray-500">{pendingReviews} pending reviews</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => handleActionClick('reviews-approved')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Approved Reviews</h3>
                <p className="text-sm text-gray-500">{approvedReviews} approved reviews</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Users Section */}
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 px-1">Users</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleActionClick('users-manage')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <UsersIcon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Manage Users</h3>
                <p className="text-sm text-gray-500">Manage user accounts</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => handleActionClick('users-referrals')}
              className="w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-800">Referrals & Bonuses</h3>
                <p className="text-sm text-gray-500">Manage referral system</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Orders Tab Component
const OrdersTab = ({ statusFilter = 'all' }) => {
  const { orders, approveOrder, rejectOrder, deleteOrder, updateOrderStatus, updateUserBonusPoints } = useContext(AdminContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Handle order approval with notification
  const handleApproveOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Approve the order
    await approveOrder(orderId);

    // Check if this user was referred by someone and reward the referrer
    if (order.userId) {
      try {
        const customer = await usersAPI.getById(order.userId);

        console.log('🔍 Checking referral for customer:', customer);

        if (customer && customer.referred_by) {
          console.log('🎁 Customer was referred by:', customer.referred_by);

          // Find the referrer by referral code
          const referrer = await usersAPI.getByReferralCode(customer.referred_by);

          if (referrer) {
            console.log('✅ Found referrer:', referrer.name);

            // Calculate referral commission (10% of order total)
            const bonusConfig = loadFromLocalStorage('bonusConfig', { referralCommission: 10 });
            const commissionPercentage = bonusConfig?.referralCommission || 10;
            const commissionAmount = Math.round((order.total * commissionPercentage) / 100);

            // Reward the referrer
            const newReferrals = (referrer.referrals || 0) + 1;
            const newBonusPoints = (referrer.bonus_points || 0) + commissionAmount;

            await usersAPI.update(referrer.id, {
              referrals: newReferrals,
              bonus_points: newBonusPoints
            });

            console.log(`🎉 Referral reward: ${referrer.name} earned ${commissionAmount} points (${commissionPercentage}% of ${order.total})`);

            // Send notification to referrer
            await notifyReferrerReward(referrer, commissionAmount, newReferrals);
            console.log('✅ Referrer notification sent');
          } else {
            console.log('⚠️ Referrer not found with code:', customer.referred_by);
          }
        } else {
          console.log('ℹ️ Customer was not referred by anyone');
        }
      } catch (err) {
        console.error('❌ Failed to process referral reward:', err);
      }
    }

    // Send notification to user
    console.log('📤 Sending user notification: Order approved');
    await notifyUserOrderStatus(order, 'approved');
    console.log('✅ User notified: Order approved');
  };

  // Handle order status update with notification
  const handleUpdateOrderStatus = async (orderId, status) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Update the order status
    await updateOrderStatus(orderId, status);

    // Send notification to user
    console.log(`📤 Sending user notification: Order ${status}`);
    await notifyUserOrderStatus(order, status);
    console.log(`✅ User notified: Order ${status}`);
  };

  // Handle bonus refund when order is rejected
  const handleRejectOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Calculate bonus points that were awarded (10% of total)
    const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 10 });
    const bonusPercentage = bonusConfig?.purchaseBonus || 10;
    const earnedPoints = Math.round((order.total * bonusPercentage) / 100);

    // Reject the order and refund bonus points
    await rejectOrder(orderId, async (rejectedOrder) => {
      if (rejectedOrder.userId && earnedPoints > 0) {
        // Deduct the bonus points that were awarded
        try {
          await updateUserBonusPoints(rejectedOrder.userId, -earnedPoints);
          console.log(`✅ Refunded ${earnedPoints} bonus points to user ${rejectedOrder.userId}`);
        } catch (err) {
          console.error('Failed to refund bonus points:', err);
        }
      }
    });

    // Send notification to user
    console.log('📤 Sending user notification: Order rejected');
    await notifyUserOrderStatus(order, 'rejected');
    console.log('✅ User notified: Order rejected');
  };

  // Bulk Operations
  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    setSelectedOrders(sortedOrders.map(o => o.id));
  };

  const deselectAllOrders = () => {
    setSelectedOrders([]);
  };

  const handleBulkApprove = async () => {
    if (selectedOrders.length === 0) return;

    if (!confirm(`Approve ${selectedOrders.length} order(s)?`)) return;

    setIsBulkProcessing(true);
    let successCount = 0;

    for (const orderId of selectedOrders) {
      try {
        await handleApproveOrder(orderId);
        successCount++;
      } catch (err) {
        console.error(`Failed to approve order ${orderId}:`, err);
      }
    }

    setIsBulkProcessing(false);
    setSelectedOrders([]);
    alert(`Successfully approved ${successCount} of ${selectedOrders.length} order(s)`);
  };

  const handleBulkReject = async () => {
    if (selectedOrders.length === 0) return;

    if (!confirm(`Reject ${selectedOrders.length} order(s)?`)) return;

    setIsBulkProcessing(true);
    let successCount = 0;

    for (const orderId of selectedOrders) {
      try {
        await handleRejectOrder(orderId);
        successCount++;
      } catch (err) {
        console.error(`Failed to reject order ${orderId}:`, err);
      }
    }

    setIsBulkProcessing(false);
    setSelectedOrders([]);
    alert(`Successfully rejected ${successCount} of ${selectedOrders.length} order(s)`);
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedOrders.length === 0) return;

    if (!confirm(`Mark ${selectedOrders.length} order(s) as ${status}?`)) return;

    setIsBulkProcessing(true);
    let successCount = 0;

    for (const orderId of selectedOrders) {
      try {
        await handleUpdateOrderStatus(orderId, status);
        successCount++;
      } catch (err) {
        console.error(`Failed to update order ${orderId}:`, err);
      }
    }

    setIsBulkProcessing(false);
    setSelectedOrders([]);
    alert(`Successfully updated ${successCount} of ${selectedOrders.length} order(s)`);
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return;

    if (!confirm(`Delete ${selectedOrders.length} order(s)? This cannot be undone.`)) return;

    setIsBulkProcessing(true);
    let successCount = 0;

    for (const orderId of selectedOrders) {
      try {
        await deleteOrder(orderId);
        successCount++;
      } catch (err) {
        console.error(`Failed to delete order ${orderId}:`, err);
      }
    }

    setIsBulkProcessing(false);
    setSelectedOrders([]);
    alert(`Successfully deleted ${successCount} of ${selectedOrders.length} order(s)`);
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(order => order.status === statusFilter);

  const sortedOrders = [...filteredOrders].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div>
      {sortedOrders.length > 0 ? (
        <>
          {/* Bulk Operations Toolbar */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">
                  {selectedOrders.length} selected
                </span>
                {sortedOrders.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllOrders}
                      className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      disabled={isBulkProcessing}
                    >
                      Select All
                    </button>
                    {selectedOrders.length > 0 && (
                      <button
                        onClick={deselectAllOrders}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        disabled={isBulkProcessing}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Action Buttons */}
            {selectedOrders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {statusFilter === 'pending' && (
                  <>
                    <button
                      onClick={handleBulkApprove}
                      disabled={isBulkProcessing}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isBulkProcessing ? 'Processing...' : `Approve (${selectedOrders.length})`}
                    </button>
                    <button
                      onClick={handleBulkReject}
                      disabled={isBulkProcessing}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      {isBulkProcessing ? 'Processing...' : `Reject (${selectedOrders.length})`}
                    </button>
                  </>
                )}

                {statusFilter === 'approved' && (
                  <button
                    onClick={() => handleBulkStatusUpdate('shipped')}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    <Truck className="w-4 h-4" />
                    {isBulkProcessing ? 'Processing...' : `Ship (${selectedOrders.length})`}
                  </button>
                )}

                {statusFilter === 'shipped' && (
                  <button
                    onClick={() => handleBulkStatusUpdate('delivered')}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isBulkProcessing ? 'Processing...' : `Deliver (${selectedOrders.length})`}
                  </button>
                )}

                {(statusFilter === 'delivered' || statusFilter === 'rejected') && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isBulkProcessing ? 'Deleting...' : `Delete (${selectedOrders.length})`}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {sortedOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start gap-3 mb-3">
                  {/* Checkbox for selection */}
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={() => toggleOrderSelection(order.id)}
                    className="mt-1 w-5 h-5 text-accent rounded focus:ring-2 focus:ring-accent cursor-pointer"
                    disabled={isBulkProcessing}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-800">Order #{order.id}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'approved' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(order.createdAt)} at {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>User:</strong> {order.userName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Phone:</strong> {order.userPhone || order.deliveryInfo?.phone || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Address:</strong> {order.deliveryInfo?.address || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>City:</strong> {order.deliveryInfo?.city || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>State/Region:</strong> {order.deliveryInfo?.state || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Courier:</strong> {order.courier || 'N/A'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="w-full mb-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                {expandedOrder === order.id ? 'Hide' : 'Show'} Items ({order.items.length})
              </button>

              {expandedOrder === order.id && (
                <div className="mb-3 space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={item.image || item.imageUrl}
                        alt={item.productName || item.name}
                        className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(item.image || item.imageUrl)}
                        onError={(e) => {
                          console.error('Failed to load item image:', item.image || item.imageUrl);
                          e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.productName || item.name}</h4>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        <p className="text-sm font-bold text-accent">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Screenshot */}
              {order.paymentScreenshot && (
                <div className="mb-3 pb-3 border-b">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Payment Screenshot:</p>
                  <img
                    src={order.paymentScreenshot}
                    alt="Payment Screenshot"
                    className="w-full max-w-xs rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(order.paymentScreenshot)}
                    onError={(e) => {
                      console.error('Failed to load payment screenshot:', order.paymentScreenshot);
                      e.target.src = 'https://via.placeholder.com/400x300?text=Screenshot+Not+Found';
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Click to view full size</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-3 pt-3 border-t">
                <span className="font-bold text-gray-700">Total:</span>
                <span className="font-bold text-lg text-accent">{formatPrice(order.total)}</span>
              </div>

              {/* Action Buttons based on Status */}
              {order.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveOrder(order.id)}
                    className="flex-1 bg-success text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectOrder(order.id)}
                    className="flex-1 bg-error text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

              {order.status === 'approved' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    Mark as Shipped
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this order?')) {
                        deleteOrder(order.id);
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {order.status === 'shipped' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                    className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Delivered
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this order?')) {
                        deleteOrder(order.id);
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(order.status === 'delivered' || order.status === 'rejected') && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this order?')) {
                      deleteOrder(order.id);
                    }
                  }}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No orders found</p>
        </div>
      )}

      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

// Products Tab Component
const ProductsTab = ({ initialFormOpen = false }) => {
  const { products, categories, addProduct, updateProduct, deleteProduct } = useContext(AdminContext);
  const [showForm, setShowForm] = useState(initialFormOpen);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    imageUrl: '',
    additionalImages: '',
    category: '',
    weight: '',
    stock: '',
    badge: '',
    material: '',
    colors: '',
    sizes: '',
    tags: '',
    inStock: true,
    variants: []
  });

  const handleImageUpload = async (e, isMainImage = true) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploadingImage(true);

    try {
      const result = await storageAPI.uploadImage(file, 'products');

      if (isMainImage) {
        setFormData({ ...formData, imageUrl: result.url });
        alert('Main image uploaded successfully!');
      } else {
        // Add to additional images
        const currentImages = formData.additionalImages ? formData.additionalImages.split(',').map(s => s.trim()) : [];
        currentImages.push(result.url);
        setFormData({ ...formData, additionalImages: currentImages.join(', ') });
        alert('Additional image uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.imageUrl || !formData.weight || !formData.stock) {
      alert('Please fill in all required fields');
      return;
    }

    const colors = formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
    const sizes = formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
      originalPrice: formData.salePrice ? parseFloat(formData.price) : null,
      weight: parseFloat(formData.weight),
      stock: parseInt(formData.stock),
      images: formData.additionalImages
        ? [formData.imageUrl, ...formData.additionalImages.split(',').map(url => url.trim()).filter(url => url)]
        : [formData.imageUrl],
      colors,
      sizes,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [],
      badge: formData.badge || undefined,
      material: formData.material || undefined,
      variants: formData.variants
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);

      // Check for low stock alerts
      if (productData.variants && productData.variants.length > 0) {
        // Check variant-specific low stock
        const lowStockVariants = getLowStockVariants(productData.variants, 10);
        const outOfStockVariants = getOutOfStockVariants(productData.variants);

        if (outOfStockVariants.length > 0 || lowStockVariants.length > 0) {
          // Send notification for each out of stock variant
          for (const variant of outOfStockVariants) {
            await notifyAdminLowStock({
              ...productData,
              name: `${productData.name} (${variant.color} • ${variant.size})`,
              stock: 0
            });
            console.log(`⚠️ Out of stock alert sent for: ${productData.name} - ${variant.color} • ${variant.size}`);
          }

          // Send notification for low stock variants
          for (const variant of lowStockVariants) {
            await notifyAdminLowStock({
              ...productData,
              name: `${productData.name} (${variant.color} • ${variant.size})`,
              stock: variant.stock
            });
            console.log(`⚠️ Low stock alert sent for: ${productData.name} - ${variant.color} • ${variant.size} (${variant.stock} left)`);
          }
        }
      } else {
        // Check regular stock
        const oldStock = editingProduct.stock || 0;
        const newStock = productData.stock;

        if (newStock < 10 && newStock !== oldStock) {
          await notifyAdminLowStock({ ...productData, name: productData.name });
          console.log(`⚠️ Low stock notification sent for: ${productData.name}`);
        }
      }
    } else {
      await addProduct(productData);

      // Check for low stock alerts on new product
      if (productData.variants && productData.variants.length > 0) {
        const lowStockVariants = getLowStockVariants(productData.variants, 10);
        const outOfStockVariants = getOutOfStockVariants(productData.variants);

        if (outOfStockVariants.length > 0 || lowStockVariants.length > 0) {
          for (const variant of [...outOfStockVariants, ...lowStockVariants]) {
            await notifyAdminLowStock({
              ...productData,
              name: `${productData.name} (${variant.color} • ${variant.size})`,
              stock: variant.stock
            });
            console.log(`⚠️ Alert sent for new product: ${productData.name} - ${variant.color} • ${variant.size} (${variant.stock} units)`);
          }
        }
      } else if (productData.stock < 10) {
        await notifyAdminLowStock(productData);
        console.log(`⚠️ Low stock notification sent for new product: ${productData.name}`);
      }
    }

    setFormData({
      name: '',
      description: '',
      price: '',
      salePrice: '',
      imageUrl: '',
      additionalImages: '',
      category: 'Bedsheets',
      weight: '',
      stock: '',
      badge: '',
      material: '',
      colors: '',
      sizes: '',
      tags: '',
      inStock: true,
      variants: []
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.originalPrice ? product.originalPrice.toString() : product.price.toString(),
      salePrice: product.salePrice ? product.salePrice.toString() : '',
      imageUrl: product.image || product.imageUrl,
      additionalImages: product.images ? product.images.slice(1).join(', ') : '',
      category: product.category,
      weight: product.weight ? product.weight.toString() : '',
      stock: product.stock ? product.stock.toString() : '',
      badge: product.badge || '',
      material: product.material || '',
      colors: product.colors ? product.colors.join(', ') : '',
      sizes: product.sizes ? product.sizes.join(', ') : '',
      tags: product.tags ? product.tags.join(', ') : '',
      inStock: product.inStock !== false,
      variants: product.variants || []
    });
    setShowForm(true);
  };

  const handleDelete = (productId) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct(productId);
    }
  };

  // Auto-generate variants when colors or sizes change
  const handleColorsOrSizesChange = (field, value) => {
    const updatedFormData = { ...formData, [field]: value };

    // Parse colors and sizes
    const colors = updatedFormData.colors ? updatedFormData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
    const sizes = updatedFormData.sizes ? updatedFormData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

    // Generate new variants if both colors and sizes exist
    if (colors.length > 0 && sizes.length > 0) {
      const newVariants = generateVariants(colors, sizes, 0);

      // Merge with existing variants to preserve stock
      const mergedVariants = newVariants.map(newV => {
        const existing = formData.variants.find(v =>
          v.color?.toLowerCase() === newV.color.toLowerCase() &&
          v.size?.toLowerCase() === newV.size.toLowerCase()
        );
        return existing ? { ...newV, stock: existing.stock } : newV;
      });

      updatedFormData.variants = mergedVariants;
    } else {
      updatedFormData.variants = [];
    }

    setFormData(updatedFormData);
  };

  // Update variant stock
  const handleVariantStockChange = (color, size, newStock) => {
    const updatedVariants = updateVariantStock(formData.variants, color, size, parseInt(newStock) || 0);
    setFormData({ ...formData, variants: updatedVariants });
  };

  return (
    <div>
      {/* Only show "Add New Product" button when in Add mode (initialFormOpen=true) */}
      {!showForm && !editingProduct && initialFormOpen && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Product
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-bold mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Price (UZS) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Sale Price (UZS)</label>
                <input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Main Product Image *</label>
              <div className="space-y-2">
                {/* Upload Button */}
                <div className="flex gap-2">
                  <label className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload from Device'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-xs text-gray-500">OR</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* URL Input */}
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Paste image URL (https://...)"
                  required
                />
                <p className="text-xs text-gray-500">
                  Upload from device or paste direct image link
                </p>

                {/* Image Preview */}
                {formData.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Additional Images (Optional)</label>
              <div className="space-y-2">
                {/* Upload Button */}
                <div className="flex gap-2">
                  <label className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload More Images'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-xs text-gray-500">OR</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* URL Input */}
                <input
                  type="text"
                  value={formData.additionalImages}
                  onChange={(e) => setFormData({ ...formData, additionalImages: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Paste URLs separated by commas"
                />
                <p className="text-xs text-gray-500">Upload multiple images or paste URLs (comma separated)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select a category</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Weight (kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 1.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Badge</label>
                <select
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">None</option>
                  <option value="BEST SELLER">BEST SELLER</option>
                  <option value="NEW ARRIVAL">NEW ARRIVAL</option>
                  <option value="SALE">SALE</option>
                  <option value="LIMITED">LIMITED</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Material</label>
                <input
                  type="text"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Cotton"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Colors</label>
              <input
                type="text"
                value={formData.colors}
                onChange={(e) => handleColorsOrSizesChange('colors', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="White, Gray, Navy Blue (comma separated)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Sizes</label>
              <input
                type="text"
                value={formData.sizes}
                onChange={(e) => handleColorsOrSizesChange('sizes', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Twin, Full, Queen, King (comma separated)"
              />
            </div>

            {/* Variant Stock Management */}
            {formData.variants.length > 0 && (
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-blue-900">
                    Variant Inventory ({formData.variants.length} variants)
                  </label>
                  <span className="text-xs text-blue-700">
                    Total: {getTotalVariantStock(formData.variants)} units
                  </span>
                </div>
                <p className="text-xs text-blue-700 mb-3">
                  Set stock quantity for each color + size combination
                </p>

                {/* Variant Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {formData.variants.map((variant, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white p-2 rounded border"
                    >
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{variant.color}</span>
                        <span className="text-gray-500 mx-1">•</span>
                        <span className="font-medium">{variant.size}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(e) => handleVariantStockChange(variant.color, variant.size, e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    💡 <strong>Note:</strong> The "Stock Quantity" field above is now ignored when variants are present.
                    Inventory is tracked per variant instead.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1">Tags *</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="bedsheet, cotton, luxury, soft (comma separated, lowercase)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Tags are used for search - enter keywords separated by commas</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inStock"
                checked={formData.inStock}
                onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="inStock" className="text-sm font-semibold">In Stock</label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    salePrice: '',
                    imageUrl: '',
                    additionalImages: '',
                    category: 'Bedsheets',
                    weight: '',
                    stock: '',
                    badge: '',
                    material: '',
                    colors: '',
                    sizes: '',
                    tags: '',
                    inStock: true,
                    variants: []
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Only show product list when NOT in add mode (i.e., in manage mode) */}
      {!initialFormOpen && (
        <div className="space-y-3">
          {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
            <div className="flex gap-3">
              <img
                src={product.image || product.imageUrl}
                alt={product.name}
                className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedImage(product.image || product.imageUrl)}
                onError={(e) => {
                  console.error('Failed to load image:', product.image || product.imageUrl);
                  e.target.src = 'https://via.placeholder.com/200x200?text=No+Image';
                }}
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {product.salePrice ? (
                    <>
                      <span className="text-sm line-through text-gray-400">
                        {formatPrice(product.price)}
                      </span>
                      <span className="font-bold text-accent">
                        {formatPrice(product.salePrice)}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-accent">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {product.category}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    (product.stock > 0 || (product.variants && getTotalVariantStock(product.variants) > 0))
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(product.stock > 0 || (product.variants && getTotalVariantStock(product.variants) > 0)) ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleEdit(product)}
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="flex-1 bg-error text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

// Categories Tab Component
const CategoriesTab = ({ initialFormOpen = false }) => {
  const { categories, addCategory, updateCategory, deleteCategory } = useContext(AdminContext);
  const [showForm, setShowForm] = useState(initialFormOpen);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    image: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.image) {
      alert('Please fill in both category name and image URL');
      return;
    }

    const categoryData = {
      name: formData.name,
      image: formData.image
    };

    if (editingCategory) {
      updateCategory(editingCategory.id, categoryData);
    } else {
      addCategory(categoryData);
    }

    setFormData({ name: '', image: '' });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      image: category.image || ''
    });
    setShowForm(true);
  };

  const handleDelete = (categoryId) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteCategory(categoryId);
    }
  };

  return (
    <div>
      {/* Only show "Add New Category" button when in Add mode (initialFormOpen=true) */}
      {!showForm && !editingCategory && initialFormOpen && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Category
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-bold mb-4">
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Category Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Bedsheets"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Image URL *</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">Category banner image for homepage</p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                {editingCategory ? 'Update Category' : 'Add Category'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                  setFormData({ name: '', image: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Only show category list when NOT in add mode (i.e., in manage mode) */}
      {!initialFormOpen && (
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-3 items-center">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(category.image)}
                />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{category.name}</h3>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleEdit(category)}
                  className="flex-1 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="flex-1 bg-error text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

// Users Tab Component
const UsersTab = () => {
  const { users } = useContext(AdminContext);
  const [expandedUser, setExpandedUser] = useState(null);

  return (
    <div>
      {users && users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{user.name}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Phone:</strong> {user.phone}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Bonus Points:</strong> {user.bonusPoints || 0}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                {expandedUser === user.id ? 'Hide' : 'Show'} Details
              </button>

              {expandedUser === user.id && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p><strong>Address:</strong> {user.address || 'Not provided'}</p>
                  <p><strong>Telegram ID:</strong> {user.id}</p>
                  <p><strong>Referrer:</strong> {user.referrerId || 'None'}</p>
                  <p><strong>Total Orders:</strong> {user.totalOrders || 0}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No users found</p>
        </div>
      )}
    </div>
  );
};

// Reviews Tab Component
const ReviewsTab = ({ statusFilter = 'all' }) => {
  const { reviews, approveReview, deleteReview } = useContext(AdminContext);

  const filteredReviews = statusFilter === 'pending'
    ? reviews.filter(r => !r.approved)
    : statusFilter === 'approved'
    ? reviews.filter(r => r.approved)
    : reviews;

  return (
    <div>
      {filteredReviews.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            {statusFilter === 'pending' ? `Pending Approval (${filteredReviews.length})` :
             statusFilter === 'approved' ? `Approved Reviews (${filteredReviews.length})` :
             `All Reviews (${filteredReviews.length})`}
          </h3>
          <div className="space-y-3">
            {filteredReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showActions
                onApprove={() => approveReview(review.id)}
                onDelete={() => deleteReview(review.id, review.productId)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No reviews found</p>
        </div>
      )}
    </div>
  );
};

// Helper ReviewCard Component
const ReviewCard = ({ review, showActions, onApprove, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-gray-800">{review.userName}</h4>
            {!review.approved && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                Pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
          <p className="text-xs text-gray-500">
            Product: {review.productName} | {formatDate(review.createdAt)}
          </p>
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2 mt-3">
          {!review.approved && (
            <button
              onClick={onApprove}
              className="flex-1 bg-success text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex-1 bg-error text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

// Bonus Settings Tab Component
const BonusSettingsTab = () => {
  const [bonusConfig, setBonusConfig] = useState({
    referralCommission: 10,
    purchaseBonus: 10,
    currency: 'UZS'
  });

  // Load from localStorage after mount
  useEffect(() => {
    const saved = loadFromLocalStorage('bonusConfig');
    if (saved) {
      setBonusConfig(saved);
    }
  }, []);

  const saveBonusConfig = (newConfig) => {
    setBonusConfig(newConfig);
    saveToLocalStorage('bonusConfig', newConfig);
  };

  return (
    <div className="space-y-6">
      {/* Bonus Configuration Section */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold mb-4">Bonus & Rewards Configuration</h3>

        <div className="space-y-4">
          {/* Referral Commission */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <label className="block text-sm font-semibold mb-2 text-blue-900">
              🎁 Referral Commission Percentage
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Percentage of referred user's order total credited to the referrer when their first order is approved
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bonusConfig.referralCommission}
                onChange={(e) => saveBonusConfig({ ...bonusConfig, referralCommission: parseInt(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 border rounded-lg"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-sm font-semibold text-gray-700">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Example: On a 100,000 UZS order, referrer earns <span className="font-semibold">{(100000 * bonusConfig.referralCommission / 100).toLocaleString()} UZS</span>
            </p>
          </div>

          {/* Purchase Bonus */}
          <div className="p-3 bg-green-50 rounded-lg">
            <label className="block text-sm font-semibold mb-2 text-green-900">
              💰 Purchase Bonus Percentage
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Percentage of purchase amount given as bonus points for all users
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bonusConfig.purchaseBonus}
                onChange={(e) => saveBonusConfig({ ...bonusConfig, purchaseBonus: parseInt(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 border rounded-lg"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-sm font-semibold text-gray-700">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Example: 100,000 UZS purchase = <span className="font-semibold">{(100000 * bonusConfig.purchaseBonus / 100).toLocaleString()} UZS</span> in bonus points
            </p>
          </div>

          {/* Info Card */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-sm mb-2">ℹ️ How it works:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Referral Commission:</strong> When a referred user makes their first order and it's approved, the referrer receives {bonusConfig.referralCommission}% of the order total as commission (e.g., 100,000 UZS order = {(100000 * bonusConfig.referralCommission / 100).toLocaleString()} UZS commission)</li>
              <li>• <strong>Purchase Bonus:</strong> All users earn {bonusConfig.purchaseBonus}% of their purchase as bonus points (e.g., 100,000 UZS = {(100000 * bonusConfig.purchaseBonus / 100).toLocaleString()} UZS in points)</li>
              <li>• Referral commissions are paid as direct currency, not points</li>
              <li>• These settings apply immediately and affect all future transactions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// App Settings Tab Component
const AppSettingsTab = () => {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Bedsheets', icon: '🛏️', visible: true },
    { id: 2, name: 'Pillows', icon: '🛌', visible: true },
    { id: 3, name: 'Curtains', icon: '🪟', visible: true },
    { id: 4, name: 'Towels', icon: '🧺', visible: true }
  ]);

  const [saleTimer, setSaleTimer] = useState({
    endDate: '2025-12-31T23:59:59',
    enabled: true
  });

  const [saleBanner, setSaleBanner] = useState({
    title: 'Summer Sale',
    subtitle: 'Up to 50% Off on Selected Items',
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=400&fit=crop',
    enabled: true
  });

  // Load from localStorage after mount
  useEffect(() => {
    const savedCategories = loadFromLocalStorage('appCategories');
    const savedTimer = loadFromLocalStorage('saleTimer');
    const savedBanner = loadFromLocalStorage('saleBanner');

    if (savedCategories) setCategories(savedCategories);
    if (savedTimer) setSaleTimer(savedTimer);
    if (savedBanner) setSaleBanner(savedBanner);
  }, []);

  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
  const [newCategoryImage, setNewCategoryImage] = useState('');

  const saveCategories = (newCategories) => {
    setCategories(newCategories);
    saveToLocalStorage('appCategories', newCategories);
  };

  const saveSaleTimer = (newTimer) => {
    setSaleTimer(newTimer);
    saveToLocalStorage('saleTimer', newTimer);
  };

  const saveSaleBanner = (newBanner) => {
    setSaleBanner(newBanner);
    saveToLocalStorage('saleBanner', newBanner);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory = {
      id: Date.now(),
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      image: newCategoryImage.trim() || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
      visible: true
    };
    saveCategories([...categories, newCategory]);
    setNewCategoryName('');
    setNewCategoryIcon('📦');
    setNewCategoryImage('');
  };

  const handleEditCategory = (id, newName, newIcon, newImage) => {
    const updated = categories.map(cat =>
      cat.id === id ? { ...cat, name: newName, icon: newIcon, image: newImage || cat.image } : cat
    );
    saveCategories(updated);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id) => {
    if (confirm('Are you sure you want to delete this category?')) {
      saveCategories(categories.filter(cat => cat.id !== id));
    }
  };

  const handleToggleVisibility = (id) => {
    const updated = categories.map(cat =>
      cat.id === id ? { ...cat, visible: !cat.visible } : cat
    );
    saveCategories(updated);
  };

  return (
    <div className="space-y-6">
      {/* Sales Banner Section */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold mb-4">Sales Banner</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <label className="font-semibold">Enable Banner</label>
            <button
              onClick={() => saveSaleBanner({ ...saleBanner, enabled: !saleBanner.enabled })}
              className={`px-4 py-2 rounded-lg font-semibold ${
                saleBanner.enabled
                  ? 'bg-success text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {saleBanner.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input
              type="text"
              value={saleBanner.title}
              onChange={(e) => saveSaleBanner({ ...saleBanner, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Subtitle</label>
            <input
              type="text"
              value={saleBanner.subtitle}
              onChange={(e) => saveSaleBanner({ ...saleBanner, subtitle: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Image URL</label>
            <input
              type="text"
              value={saleBanner.imageUrl}
              onChange={(e) => saveSaleBanner({ ...saleBanner, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="https://..."
            />
          </div>

          {/* Preview */}
          <div className="mt-4">
            <label className="block text-sm font-semibold mb-2">Preview</label>
            <div className="relative h-48 rounded-lg overflow-hidden">
              <img
                src={saleBanner.imageUrl}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
                <h2 className="text-3xl font-bold mb-2">{saleBanner.title}</h2>
                <p className="text-lg">{saleBanner.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Timer Section */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold mb-4">Sale Timer</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <label className="font-semibold">Enable Timer</label>
            <button
              onClick={() => saveSaleTimer({ ...saleTimer, enabled: !saleTimer.enabled })}
              className={`px-4 py-2 rounded-lg font-semibold ${
                saleTimer.enabled
                  ? 'bg-success text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {saleTimer.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Sale End Date & Time
            </label>
            <input
              type="datetime-local"
              value={saleTimer.endDate.replace(' ', 'T').slice(0, 16)}
              onChange={(e) => {
                const newValue = e.target.value.replace('T', ' ') + ':00';
                saveSaleTimer({ ...saleTimer, endDate: newValue });
              }}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {new Date(saleTimer.endDate).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold mb-4">Manage Categories</h3>

        {/* Add New Category */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Add New Category</h4>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Icon (emoji)"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                className="w-16 px-2 py-2 border rounded-lg text-center"
                maxLength={2}
              />
              <input
                type="text"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleAddCategory}
                className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Image URL (optional)"
              value={newCategoryImage}
              onChange={(e) => setNewCategoryImage(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 p-3 border rounded-lg"
            >
              {editingCategory === category.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={category.icon}
                      className="w-16 px-2 py-2 border rounded-lg text-center"
                      maxLength={2}
                      id={`icon-${category.id}`}
                    />
                    <input
                      type="text"
                      defaultValue={category.name}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      id={`name-${category.id}`}
                    />
                    <button
                      onClick={() => {
                        const newName = document.getElementById(`name-${category.id}`).value;
                        const newIcon = document.getElementById(`icon-${category.id}`).value;
                        const newImage = document.getElementById(`image-${category.id}`).value;
                        handleEditCategory(category.id, newName, newIcon, newImage);
                      }}
                      className="bg-success text-white px-3 py-2 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="bg-gray-400 text-white px-3 py-2 rounded-lg"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    defaultValue={category.image || ''}
                    placeholder="Image URL (optional)"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    id={`image-${category.id}`}
                  />
                </div>
              ) : (
                <>
                  <span className="text-2xl">{category.icon}</span>
                  <span className="flex-1 font-semibold">{category.name}</span>
                  <button
                    onClick={() => handleToggleVisibility(category.id)}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      category.visible
                        ? 'bg-success/20 text-success'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {category.visible ? 'Visible' : 'Hidden'}
                  </button>
                  <button
                    onClick={() => setEditingCategory(category.id)}
                    className="text-accent p-2"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-error p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pickup Points Tab Component
const PickupPointsTab = () => {
  const {
    pickupPoints,
    addPickupPoint,
    updatePickupPoint,
    deletePickupPoint,
    togglePickupPointStatus,
    duplicatePickupPoint
  } = useContext(PickupPointsContext);

  const [showForm, setShowForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [expandedCouriers, setExpandedCouriers] = useState(new Set());
  const [expandedStates, setExpandedStates] = useState(new Set());
  const [expandedCities, setExpandedCities] = useState(new Set());
  const [formData, setFormData] = useState({
    courierService: '',
    state: '',
    city: '',
    address: '',
    workingHours: '09:00 - 20:00',
    phone: ''
  });

  // Group pickup points by courier → state → city
  const groupedPoints = pickupPoints.reduce((acc, point) => {
    if (!acc[point.courierService]) {
      acc[point.courierService] = {};
    }
    if (!acc[point.courierService][point.state]) {
      acc[point.courierService][point.state] = {};
    }
    if (!acc[point.courierService][point.state][point.city]) {
      acc[point.courierService][point.state][point.city] = [];
    }
    acc[point.courierService][point.state][point.city].push(point);
    return acc;
  }, {});

  const toggleCourier = (courier) => {
    const newSet = new Set(expandedCouriers);
    if (newSet.has(courier)) {
      newSet.delete(courier);
      // Also collapse all states and cities under this courier
      const newStatesSet = new Set(expandedStates);
      const newCitiesSet = new Set(expandedCities);
      Object.keys(groupedPoints[courier] || {}).forEach((state) => {
        newStatesSet.delete(`${courier}-${state}`);
        Object.keys(groupedPoints[courier][state] || {}).forEach((city) => {
          newCitiesSet.delete(`${courier}-${state}-${city}`);
        });
      });
      setExpandedStates(newStatesSet);
      setExpandedCities(newCitiesSet);
    } else {
      newSet.add(courier);
    }
    setExpandedCouriers(newSet);
  };

  const toggleState = (courier, state) => {
    const stateKey = `${courier}-${state}`;
    const newSet = new Set(expandedStates);
    if (newSet.has(stateKey)) {
      newSet.delete(stateKey);
      // Also collapse all cities under this state
      const newCitiesSet = new Set(expandedCities);
      Object.keys(groupedPoints[courier]?.[state] || {}).forEach((city) => {
        newCitiesSet.delete(`${courier}-${state}-${city}`);
      });
      setExpandedCities(newCitiesSet);
    } else {
      newSet.add(stateKey);
    }
    setExpandedStates(newSet);
  };

  const toggleCity = (courier, state, city) => {
    const cityKey = `${courier}-${state}-${city}`;
    const newSet = new Set(expandedCities);
    if (newSet.has(cityKey)) {
      newSet.delete(cityKey);
    } else {
      newSet.add(cityKey);
    }
    setExpandedCities(newSet);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.courierService || !formData.state || !formData.city || !formData.address || !formData.phone) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingPoint) {
      updatePickupPoint(editingPoint.id, formData);
    } else {
      addPickupPoint(formData);
    }

    setFormData({
      courierService: '',
      state: '',
      city: '',
      address: '',
      workingHours: '09:00 - 20:00',
      phone: ''
    });
    setEditingPoint(null);
    setShowForm(false);
  };

  const handleEdit = (point) => {
    setEditingPoint(point);
    setFormData({
      courierService: point.courierService,
      state: point.state,
      city: point.city,
      address: point.address,
      workingHours: point.workingHours,
      phone: point.phone
    });
    setShowForm(true);
  };

  const handleDelete = (pointId) => {
    if (confirm('Are you sure you want to delete this pickup point?')) {
      deletePickupPoint(pointId);
    }
  };

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Pickup Point
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-bold mb-4">
            {editingPoint ? 'Edit Pickup Point' : 'Add New Pickup Point'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Courier Service *</label>
              <input
                type="text"
                value={formData.courierService}
                onChange={(e) => setFormData({ ...formData, courierService: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Yandex, Uzum, Express24"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">State/Region *</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Tashkent Region"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Tashkent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Address *</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows="2"
                placeholder="Full address of pickup point"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Working Hours *</label>
              <input
                type="text"
                value={formData.workingHours}
                onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., 09:00 - 20:00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="+998 XX XXX XXXX"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                {editingPoint ? 'Update Pickup Point' : 'Add Pickup Point'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPoint(null);
                  setFormData({
                    courierService: '',
                    state: '',
                    city: '',
                    address: '',
                    workingHours: '09:00 - 20:00',
                    phone: ''
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clickable 4-Level Hierarchy: Courier → State → City → Addresses */}
      <div className="space-y-3">
        {Object.keys(groupedPoints).length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pickup points found</p>
          </div>
        ) : (
          Object.entries(groupedPoints).map(([courier, stateGroups]) => {
            const isCourierExpanded = expandedCouriers.has(courier);
            const totalPoints = Object.values(stateGroups).reduce((sum, cityGroups) =>
              sum + Object.values(cityGroups).reduce((citySum, addresses) => citySum + addresses.length, 0), 0
            );

            return (
              <div key={courier} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Level 1: Courier Card - Clickable */}
                <button
                  onClick={() => toggleCourier(courier)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                    isCourierExpanded ? 'rotate-90' : ''
                  }`} />
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="text-lg font-bold text-gray-800">{courier}</h2>
                    <p className="text-sm text-gray-500">{totalPoints} pickup points</p>
                  </div>
                </button>

                {/* Level 2: State Cards - Only show when courier is expanded */}
                {isCourierExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {Object.entries(stateGroups).map(([state, cityGroups]) => {
                      const isStateExpanded = expandedStates.has(`${courier}-${state}`);
                      const statePoints = Object.values(cityGroups).reduce((sum, addresses) => sum + addresses.length, 0);

                      return (
                        <div key={state} className="bg-gray-50 rounded-lg overflow-hidden">
                          {/* State Card - Clickable */}
                          <button
                            onClick={() => toggleState(courier, state)}
                            className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors"
                          >
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                              isStateExpanded ? 'rotate-90' : ''
                            }`} />
                            <MapPin className="w-5 h-5 text-accent flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <h3 className="font-bold text-gray-800">{state}</h3>
                              <p className="text-xs text-gray-500">{statePoints} locations</p>
                            </div>
                          </button>

                          {/* Level 3: City Cards - Only show when state is expanded */}
                          {isStateExpanded && (
                            <div className="px-3 pb-3 space-y-2">
                              {Object.entries(cityGroups).map(([city, addresses]) => {
                                const isCityExpanded = expandedCities.has(`${courier}-${state}-${city}`);

                                return (
                                  <div key={city} className="bg-white rounded-lg overflow-hidden border border-gray-200">
                                    {/* City Card - Clickable */}
                                    <button
                                      onClick={() => toggleCity(courier, state, city)}
                                      className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors"
                                    >
                                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                                        isCityExpanded ? 'rotate-90' : ''
                                      }`} />
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="flex-1 text-left">
                                        <h4 className="font-semibold text-gray-800">{city}</h4>
                                        <p className="text-xs text-gray-500">{addresses.length} addresses</p>
                                      </div>
                                    </button>

                                    {/* Level 4: Address Cards - Only show when city is expanded */}
                                    {isCityExpanded && (
                                      <div className="px-3 pb-3 space-y-2">
                                        {addresses.map((point) => (
                                          <div key={point.id} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-start justify-between mb-2">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    point.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                  }`}>
                                                    {point.active ? 'Active' : 'Inactive'}
                                                  </span>
                                                </div>
                                                <p className="text-sm text-gray-700 mb-2 font-medium">{point.address}</p>
                                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                                  <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {point.workingHours}
                                                  </span>
                                                  <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {point.phone}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="space-y-2 mt-2">
                                              {/* First row: Edit, Duplicate, Delete */}
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => handleEdit(point)}
                                                  className="flex-1 bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                                                >
                                                  <Edit className="w-3 h-3" />
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => duplicatePickupPoint(point.id)}
                                                  className="flex-1 bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center gap-1"
                                                >
                                                  <Copy className="w-3 h-3" />
                                                  Duplicate
                                                </button>
                                                <button
                                                  onClick={() => handleDelete(point.id)}
                                                  className="flex-1 bg-error text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                  Delete
                                                </button>
                                              </div>

                                              {/* Second row: Deactivate/Activate (full width) */}
                                              <button
                                                onClick={() => togglePickupPointStatus(point.id)}
                                                className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                  point.active
                                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                                }`}
                                              >
                                                {point.active ? 'Deactivate' : 'Activate'}
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Shipping Rates Tab Component
const ShippingRatesTab = () => {
  const {
    shippingRates,
    addShippingRate,
    updateShippingRate,
    deleteShippingRate
  } = useContext(ShippingRatesContext);

  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [formData, setFormData] = useState({
    courier: '',
    state: '',
    firstKg: '',
    additionalKg: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.courier || !formData.state || !formData.firstKg) {
      alert('Please fill in all required fields');
      return;
    }

    const rateData = {
      ...formData,
      firstKg: parseFloat(formData.firstKg),
      additionalKg: parseFloat(formData.additionalKg) || 0
    };

    if (editingRate) {
      updateShippingRate(editingRate.id, rateData);
    } else {
      addShippingRate(rateData);
    }

    setFormData({ courier: '', state: '', firstKg: '', additionalKg: '' });
    setEditingRate(null);
    setShowForm(false);
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setFormData({
      courier: rate.courier,
      state: rate.state,
      firstKg: rate.firstKg.toString(),
      additionalKg: rate.additionalKg.toString()
    });
    setShowForm(true);
  };

  const handleDelete = (rateId) => {
    if (confirm('Are you sure you want to delete this shipping rate?')) {
      deleteShippingRate(rateId);
    }
  };

  // Group rates by courier
  const groupedRates = shippingRates.reduce((acc, rate) => {
    if (!acc[rate.courier]) {
      acc[rate.courier] = [];
    }
    acc[rate.courier].push(rate);
    return acc;
  }, {});

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Shipping Rate
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-bold mb-4">
            {editingRate ? 'Edit Shipping Rate' : 'Add New Shipping Rate'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Courier Service *</label>
              <input
                type="text"
                value={formData.courier}
                onChange={(e) => setFormData({ ...formData, courier: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., BTS, Yandex, Starex"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">State/Region *</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Tashkent Region"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">First KG Rate (UZS) *</label>
              <input
                type="number"
                value={formData.firstKg}
                onChange={(e) => setFormData({ ...formData, firstKg: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., 15000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Additional KG Rate (UZS)</label>
              <input
                type="number"
                value={formData.additionalKg}
                onChange={(e) => setFormData({ ...formData, additionalKg: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., 5000 (0 for flat rate)"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                {editingRate ? 'Update Rate' : 'Add Rate'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingRate(null);
                  setFormData({ courier: '', state: '', firstKg: '', additionalKg: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Display rates grouped by courier */}
      <div className="space-y-4">
        {Object.entries(groupedRates).map(([courier, rates]) => (
          <div key={courier} className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b">
              <Truck className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-bold text-gray-800">{courier}</h3>
            </div>

            <div className="space-y-2">
              {rates.map((rate) => (
                <div key={rate.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{rate.state}</p>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>First KG: {formatPrice(rate.firstKg)}</p>
                        {rate.additionalKg > 0 && (
                          <p>Additional KG: {formatPrice(rate.additionalKg)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(rate)}
                      className="flex-1 bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rate.id)}
                      className="flex-1 bg-error text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = () => {
  const { orders, users, products } = useContext(AdminContext);
  const analytics = calculateAnalytics(orders, users, products);
  const chartData = getRevenueChartData(orders);

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 opacity-80" />
            {analytics.revenueGrowth > 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>
          <div className="text-2xl font-bold">{formatPrice(analytics.totalRevenue)}</div>
          <div className="text-xs opacity-90">Total Revenue</div>
          <div className="text-xs mt-1">
            {analytics.revenueGrowth > 0 ? '+' : ''}{analytics.revenueGrowth.toFixed(1)}% vs last month
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag className="w-6 h-6 opacity-80" />
            <Package className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold">{analytics.totalOrders}</div>
          <div className="text-xs opacity-90">Completed Orders</div>
          <div className="text-xs mt-1">{analytics.pendingOrdersCount} pending</div>
        </div>

        {/* Average Order Value */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatPrice(analytics.avgOrderValue)}</div>
          <div className="text-xs opacity-90">Avg Order Value</div>
          <div className="text-xs mt-1">{analytics.monthOrdersCount} orders this month</div>
        </div>

        {/* Total Customers */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <UsersIcon className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
          <div className="text-xs opacity-90">Total Customers</div>
          <div className="text-xs mt-1">{analytics.conversionRate.toFixed(1)}% conversion</div>
        </div>
      </div>

      {/* Revenue by Period */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Revenue Overview
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Today</div>
              <div className="text-xl font-bold text-gray-800">{formatPrice(analytics.todayRevenue)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{analytics.todayOrdersCount} orders</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">This Week</div>
              <div className="text-xl font-bold text-gray-800">{formatPrice(analytics.weekRevenue)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{analytics.weekOrdersCount} orders</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">This Month</div>
              <div className="text-xl font-bold text-gray-800">{formatPrice(analytics.monthRevenue)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{analytics.monthOrdersCount} orders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart (Last 7 Days) */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Last 7 Days Revenue
        </h3>
        <div className="space-y-2">
          {chartData.map((day, index) => {
            const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
            const barWidth = (day.revenue / maxRevenue) * 100;

            return (
              <div key={index} className="flex items-center gap-2">
                <div className="w-16 text-xs text-gray-600">{day.date}</div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-full flex items-center px-2 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%`, minWidth: day.revenue > 0 ? '40px' : '0' }}
                    >
                      {day.revenue > 0 && (
                        <span className="text-xs font-semibold text-white whitespace-nowrap">
                          {formatPrice(day.revenue)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-12 text-right text-xs text-gray-600">{day.orders}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Orders by Status */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Orders by Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
            <span className="text-sm text-gray-700">Pending</span>
            <span className="text-lg font-bold text-yellow-600">{analytics.ordersByStatus.pending}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
            <span className="text-sm text-gray-700">Approved</span>
            <span className="text-lg font-bold text-green-600">{analytics.ordersByStatus.approved}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-gray-700">Shipped</span>
            <span className="text-lg font-bold text-blue-600">{analytics.ordersByStatus.shipped}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
            <span className="text-sm text-gray-700">Delivered</span>
            <span className="text-lg font-bold text-purple-600">{analytics.ordersByStatus.delivered}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
            <span className="text-sm text-gray-700">Rejected</span>
            <span className="text-lg font-bold text-red-600">{analytics.ordersByStatus.rejected}</span>
          </div>
        </div>
      </div>

      {/* Top Selling Products */}
      {analytics.topProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Top Selling Products
          </h3>
          <div className="space-y-3">
            {analytics.topProducts.map((product, index) => (
              <div key={product.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.quantity} sold</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{formatPrice(product.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Inventory Alerts */}
      {(analytics.lowStockProducts > 0 || analytics.outOfStockProducts > 0) && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Inventory Alerts
          </h3>
          <div className="space-y-2">
            {analytics.outOfStockProducts > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="text-sm text-gray-700">Out of Stock</span>
                <span className="text-lg font-bold text-red-600">{analytics.outOfStockProducts}</span>
              </div>
            )}
            {analytics.lowStockProducts > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-sm text-gray-700">Low Stock (&lt;10)</span>
                <span className="text-lg font-bold text-orange-600">{analytics.lowStockProducts}</span>
              </div>
            )}
          </div>

          {analytics.lowStockItems.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-semibold text-gray-600 uppercase">Items Needing Attention:</div>
              {analytics.lowStockItems.map(product => (
                <div key={product.id} className="text-sm p-2 bg-gray-50 rounded">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-gray-500 ml-2">({product.stock} left)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Referral Metrics */}
      {analytics.totalReferrals > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            Referral Program
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-pink-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-pink-600">{analytics.totalReferrals}</div>
              <div className="text-xs text-gray-600">Total Referrals</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{analytics.usersWithReferrals}</div>
              <div className="text-xs text-gray-600">Active Referrers</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
