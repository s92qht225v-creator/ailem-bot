import { useState, useContext, useEffect, useMemo } from 'react';
import { t } from "../../utils/translation-fallback";
import {
  Shield, Package, Star, Users as UsersIcon, CheckCircle, XCircle,
  Edit, Trash2, Plus, ChevronRight, Edit2, ShoppingBag, Truck, Gift,
  Image, MapPin, Clock, Phone, Copy, DollarSign, LayoutGrid, Upload,
  TrendingUp, TrendingDown, BarChart3, Calendar, AlertTriangle, AlertCircle,
  Menu, X, Home, Settings, Bell, Save, MoveUp, MoveDown, Eye, EyeOff, ImagePlus,
  Download, FileDown, ChevronUp, ChevronDown, RotateCw, Printer
} from 'lucide-react';
import { AdminContext } from '../../context/AdminContext';
import { PickupPointsContext } from '../../context/PickupPointsContext';
import { ShippingRatesContext } from '../../context/ShippingRatesContext';
import { formatPrice, formatDate, loadFromLocalStorage, saveToLocalStorage } from '../../utils/helpers';
import { calculateAnalytics, getRevenueChartData } from '../../utils/analytics';
import { generateVariants, updateVariantStock, updateVariantImage, getTotalVariantStock, getLowStockVariants, getOutOfStockVariants } from '../../utils/variants';
import { settingsAPI, storageAPI, usersAPI } from '../../services/api';
import { exportOrders, exportOrderItems, exportProducts, exportUsers, exportReviews } from '../../utils/csvExport';
import { notifyUserOrderStatus, notifyReferrerReward, notifyAdminLowStock } from '../../services/telegram';
import { notifyProductBackInStock } from '../../services/stockNotifications';
import { printShippingLabel, printMultipleLabels } from '../../utils/shippingLabel';
import ImageModal from '../common/ImageModal';

const DesktopAdminPanel = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const { products, categories, orders, reviews, users, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory, reorderCategories, approveReview, deleteReview } = useContext(AdminContext);

  // Calculate stats
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const approvedOrders = orders.filter(o => o.status === 'approved').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;
  const pendingReviews = reviews?.filter(r => !r.approved).length || 0;
  const totalRevenue = orders
    .filter(o => o.status === 'approved' || o.status === 'shipped')
    .reduce((sum, order) => sum + order.total, 0);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      color: 'text-blue-600'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      color: 'text-green-600',
      badge: pendingOrders > 0 ? pendingOrders : null
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      color: 'text-purple-600',
      count: products.length
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: LayoutGrid,
      color: 'text-orange-600',
      count: categories.length
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: Star,
      color: 'text-yellow-600',
      badge: pendingReviews > 0 ? pendingReviews : null
    },
    {
      id: 'users',
      label: 'Users',
      icon: UsersIcon,
      color: 'text-indigo-600'
    },
    {
      id: 'bonus-settings',
      label: 'Bonus Settings',
      icon: Gift,
      color: 'text-rose-600'
    },
    {
      id: 'inventory-settings',
      label: 'Inventory Alerts',
      icon: Bell,
      color: 'text-orange-600'
    },
    {
      id: 'promotions',
      label: 'Promotions',
      icon: Image,
      color: 'text-pink-600'
    },
    {
      id: 'pickup-points',
      label: 'Pickup Points',
      icon: MapPin,
      color: 'text-blue-600'
    },
    {
      id: 'shipping-rates',
      label: 'Shipping Rates',
      icon: Truck,
      color: 'text-cyan-600'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      color: 'text-teal-600'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-xs text-gray-500">Ailem Store</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  isActive 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.count && !item.badge && (
                      <span className="text-gray-400 text-sm">{item.count}</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {activeSection.replace('-', ' ')}
              </h2>
              <p className="text-gray-600">
                {activeSection === 'dashboard' && 'Overview of your store performance'}
                {activeSection === 'orders' && `${orders.length} total orders`}
                {activeSection === 'products' && `${products.length} products in your catalog`}
                {activeSection === 'categories' && `${categories.length} product categories`}
                {activeSection === 'reviews' && `${reviews?.length || 0} customer reviews`}
                {activeSection === 'users' && 'Manage customers and administrators'}
                {activeSection === 'bonus-settings' && 'Configure referral and purchase rewards'}
                {activeSection === 'promotions' && 'Manage banners and app settings'}
                {activeSection === 'pickup-points' && 'Manage courier pickup locations'}
                {activeSection === 'shipping-rates' && 'Configure delivery pricing by region'}
                {activeSection === 'analytics' && 'Detailed business insights'}
                {activeSection === 'settings' && 'System configuration and preferences'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <button
                  onClick={onLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  title="Logout from admin panel"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {activeSection === 'dashboard' && <DashboardContent />}
          {activeSection === 'orders' && <OrdersContent />}
          {activeSection === 'products' && <ProductsContent />}
          {activeSection === 'categories' && <CategoriesContent />}
          {activeSection === 'reviews' && <ReviewsContent />}
          {activeSection === 'users' && <UsersContent />}
          {activeSection === 'bonus-settings' && <BonusSettingsContent />}
          {activeSection === 'inventory-settings' && <InventorySettingsContent />}
          {activeSection === 'promotions' && <PromotionsContent />}
          {activeSection === 'pickup-points' && <PickupPointsContent />}
          {activeSection === 'shipping-rates' && <ShippingRatesContent />}
          {activeSection === 'analytics' && <AnalyticsContent />}
          {activeSection === 'settings' && <SettingsContent />}
        </main>
      </div>

      {/* Image Modal for viewing payment screenshots and product images */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );

  // Dashboard Content Component
  function DashboardContent() {
    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={formatPrice(totalRevenue)}
            icon={DollarSign}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            title="Pending Orders"
            value={pendingOrders}
            icon={Clock}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatCard
            title="Products"
            value={products.length}
            icon={Package}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <StatCard
            title="Pending Reviews"
            value={pendingReviews}
            icon={Star}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">#{order.id}</p>
                    <p className="text-sm text-gray-600">{order.userName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatPrice(order.total)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveSection('products')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <Plus className="w-5 h-5 text-purple-600" />
                <span>Add New Product</span>
              </button>
              <button
                onClick={() => setActiveSection('orders')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Review Pending Orders ({pendingOrders})</span>
              </button>
              <button
                onClick={() => setActiveSection('reviews')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <Star className="w-5 h-5 text-yellow-600" />
                <span>Review Customer Feedback ({pendingReviews})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Other content components would be implemented similarly...
  function OrdersContent() {
    const { approveOrder, rejectOrder, updateOrderStatus, loadAllData } = useContext(AdminContext);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filteredOrders = useMemo(() => {
      console.log('🔍 DesktopAdminPanel orders received (first 3):',
        orders.slice(0, 3).map(o => ({
          id: o.id,
          created_at: o.created_at,
          createdAt: o.createdAt,
          status: o.status
        }))
      );

      // Orders are already sorted by created_at DESC from database - trust that sort
      // Just filter by status, do NOT re-sort (filtering preserves original order)
      const filtered = statusFilter === 'all'
        ? orders
        : orders.filter(order => order.status === statusFilter);

      console.log('🔍 DesktopAdminPanel filtered orders (first 3):',
        filtered.slice(0, 3).map(o => ({
          id: o.id,
          created_at: o.created_at,
          createdAt: o.createdAt,
          status: o.status
        }))
      );

      return filtered;
    }, [orders, statusFilter]);

    const handleApprove = async (orderId) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      if (confirm('Approve this order? This will deduct stock from inventory and award bonus points.')) {
        try {
          // Approve the order
          await approveOrder(orderId);
          console.log('✅ Order approved');

          // Award purchase bonus points to the customer
          if (order.userId) {
            try {
              const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 3, referralCommission: 10 });
              const purchaseBonusPercentage = bonusConfig?.purchaseBonus || 3;
              const purchaseBonusPoints = Math.round((order.total * purchaseBonusPercentage) / 100);

              // Award bonus points to customer
              await updateUserBonusPoints(order.userId, purchaseBonusPoints);
              console.log(`💰 Purchase bonus: Customer earned ${purchaseBonusPoints} points (${purchaseBonusPercentage}% of ${order.total})`);

              // Check if this user was referred by someone and reward the referrer
              const customer = await usersAPI.getById(order.userId);
              console.log('🔍 Checking referral for customer:', customer);

              if (customer && customer.referred_by) {
                console.log('🎁 Customer was referred by:', customer.referred_by);

                // Find the referrer by referral code
                const referrer = await usersAPI.getByReferralCode(customer.referred_by);

                if (referrer) {
                  console.log('✅ Found referrer:', referrer.name);

                  // Calculate referral commission
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
              }
            } catch (bonusError) {
              console.error('❌ Failed to award bonus points:', bonusError);
            }
          }

          // Send notification to customer
          console.log('📤 Sending user notification: Order approved');
          await notifyUserOrderStatus(order, 'approved');
          console.log('✅ User notified: Order approved');

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
          // Calculate bonus points that were awarded
          const bonusConfig = loadFromLocalStorage('bonusConfig', { purchaseBonus: 3 });
          const bonusPercentage = bonusConfig?.purchaseBonus || 3;
          const earnedPoints = Math.round((order.total * bonusPercentage) / 100);

          // Reject the order and refund bonus points
          await rejectOrder(orderId, async (rejectedOrder) => {
            if (rejectedOrder.userId && earnedPoints > 0) {
              // Deduct the bonus points that were awarded
              try {
                await updateUserBonusPoints(rejectedOrder.userId, -earnedPoints);
                console.log(`✅ Refunded ${earnedPoints} bonus points from user ${rejectedOrder.userId}`);
              } catch (err) {
                console.error('Failed to refund bonus points:', err);
              }
            }
          });

          console.log('✅ Order rejected');

          // Send notification to user
          console.log('📤 Sending user notification: Order rejected');
          await notifyUserOrderStatus(order, 'rejected');
          console.log('✅ User notified: Order rejected');

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
          console.log('✅ Order marked as shipped');

          // Send notification to customer
          console.log('📤 Sending user notification: Order shipped');
          await notifyUserOrderStatus(order, 'shipped');
          console.log('✅ User notified: Order shipped');
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
          console.log('✅ Order marked as delivered');

          // Send notification to customer
          console.log('📤 Sending user notification: Order delivered');
          await notifyUserOrderStatus(order, 'delivered');
          console.log('✅ User notified: Order delivered');
        } catch (error) {
          console.error('❌ Failed to mark as delivered:', error);
          alert('Failed to update order status. Please try again.');
        }
      }
    };

    const handleViewOrder = (order) => {
      setSelectedOrder(order);
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
        console.log('✅ Orders refreshed');
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
        console.log(`📦 Performing bulk ${action} on ${count} orders...`);

        for (const orderId of selectedOrders) {
          const order = orders.find(o => o.id === orderId);
          if (!order) continue;

          switch (action) {
            case 'Approve':
              if (order.status === 'pending') {
                await approveOrder(orderId);
              }
              break;
            case 'Mark as Shipped':
              if (order.status === 'approved') {
                await updateOrderStatus(orderId, 'shipped');
              }
              break;
            case 'Mark as Delivered':
              if (order.status === 'shipped') {
                await updateOrderStatus(orderId, 'delivered');
              }
              break;
            case 'Reject':
              if (order.status === 'pending') {
                await rejectOrder(orderId);
              }
              break;
          }
        }

        console.log(`✅ Bulk ${action} completed`);
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
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh orders from database"
              >
                <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Export Dropdown */}
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

          {/* Bulk Actions Bar */}
          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-semibold text-blue-900">
                {selectedOrders.length} order(s) selected
              </span>
              <button
                onClick={() => {
                  const ordersTorint = orders.filter(o => selectedOrders.includes(o.id));
                  printMultipleLabels(ordersTorint);
                }}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print {selectedOrders.length} Label{selectedOrders.length > 1 ? 's' : ''}
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
                          onClick={() => handleViewOrder(order)}
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
                              onClick={() => printShippingLabel(order)}
                              className="text-green-600 hover:text-green-800 font-medium whitespace-nowrap flex items-center gap-1"
                              title="Print shipping label"
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
                              title="Print shipping label"
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
                            <span className="text-sm font-semibold text-primary">{selectedOrder.courier}</span>
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
                      onClick={() => setSelectedImage(selectedOrder.paymentScreenshot)}
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
  }

  // Products Content with full functionality
  function ProductsContent() {
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [allImages, setAllImages] = useState([]); // Array of all product images
    const [formData, setFormData] = useState({
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
      variants: [],
      volume_pricing: null
    });

    const handleImageUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingImage(true);
        console.log('📤 Uploading image to Supabase...');

        // Import storageAPI
        const { storageAPI } = await import('../../services/api');
        const result = await storageAPI.uploadProductImage(file);

        console.log('✅ Image uploaded:', result.url);

        // Add to images array
        setAllImages(prev => [...prev, result.url]);
      } catch (error) {
        console.error('❌ Image upload failed:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
        // Reset file input
        e.target.value = '';
      }
    };

    const handleRemoveImage = (indexToRemove) => {
      setAllImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleMoveImage = (fromIndex, toIndex) => {
      setAllImages(prev => {
        const newImages = [...prev];
        const [movedImage] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedImage);
        return newImages;
      });
    };

    const handleSubmit = async (e) => {
      console.log('🔥 handleSubmit called!', { editingProduct, formData, allImages });
      e.preventDefault();

      try {
        console.log('🔍 Starting validation...');

        // Ensure we have at least one image
        if (allImages.length === 0) {
          console.error('❌ No images provided');
          alert('Please add at least one product image.');
          return;
        }

        console.log('✅ Validation passed, preparing product data...');

        // Prepare product data in app format (API will handle database conversion)
        const productData = {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.salePrice || formData.price), // Use sale price if available, otherwise regular price
          originalPrice: formData.salePrice ? parseFloat(formData.price) : null, // Original price only if there's a sale
          category: formData.category,  // Use category (API converts to category_name)
          imageUrl: allImages[0],  // First image is the main image
          images: allImages,  // All images in order
          weight: formData.weight ? parseFloat(formData.weight) : null,
          stock: parseInt(formData.stock) || 0,
          badge: formData.badge || null,
          material: formData.material,
          colors: formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(c => c) : [],
          sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) : [],
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [],
          variants: formData.variants || [],
          volume_pricing: formData.volume_pricing && formData.volume_pricing.length > 0 ? formData.volume_pricing : null
        };

        console.log('📦 Product data prepared:', productData);

        if (editingProduct) {
          // Update existing product
          console.log('🔄 Updating product with ID:', editingProduct.id);

          // Check if stock changed from 0 to positive (for notifications)
          const oldStock = editingProduct.stock || 0;
          const newStock = productData.stock || 0;
          const stockIncreased = oldStock === 0 && newStock > 0;

          console.log('📊 Stock change detection:', {
            oldStock,
            newStock,
            stockIncreased,
            hasVariants: productData.variants?.length > 0
          });

          // Check variants for stock changes
          const variantsToNotify = [];
          if (productData.variants && productData.variants.length > 0) {
            console.log('🔍 Checking variant stock changes...');
            productData.variants.forEach((newVariant) => {
              const oldVariant = editingProduct.variants?.find(
                v => v.color === newVariant.color && v.size === newVariant.size
              );
              const oldVarStock = oldVariant?.stock || 0;
              const newVarStock = newVariant.stock || 0;

              console.log(`  Variant ${newVariant.color}-${newVariant.size}:`, {
                oldStock: oldVarStock,
                newStock: newVarStock,
                shouldNotify: oldVarStock === 0 && newVarStock > 0
              });

              if (oldVarStock === 0 && newVarStock > 0) {
                variantsToNotify.push({
                  color: newVariant.color,
                  size: newVariant.size
                });
              }
            });
            console.log('✅ Variants to notify:', variantsToNotify);
          }

          await updateProduct(editingProduct.id, productData);
          console.log('✅ Product updated successfully');

          // Send stock notifications if stock was replenished
          if (stockIncreased || variantsToNotify.length > 0) {
            console.log('📢 Stock replenished! Sending notifications...');

            try {
              // Create product object with ID for notifications
              const productWithId = { ...productData, id: editingProduct.id };

              if (stockIncreased && (!productData.variants || productData.variants.length === 0)) {
                // Non-variant product back in stock
                await notifyProductBackInStock(productWithId);
              }

              // Notify for each variant that came back in stock
              for (const variant of variantsToNotify) {
                await notifyProductBackInStock(productWithId, variant.color, variant.size);
              }

              console.log('✅ Stock notifications sent');
            } catch (error) {
              console.error('❌ Failed to send stock notifications:', error);
              // Don't block the update if notifications fail
            }
          }
        } else {
          // Create new product
          console.log('➕ Creating new product...');
          await addProduct(productData);
          console.log('✅ Product created successfully');
        }

        console.log('🧹 Cleaning up form...');
        // Reset form and close
        setShowForm(false);
        setEditingProduct(null);
        setAllImages([]);
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
          variants: [],
          volume_pricing: null
        });
        console.log('✨ Form submitted successfully!');
      } catch (error) {
        console.error('❌ Failed to save product:', error);
        alert('Failed to save product. Please try again.');
      }
    };

    const handleEdit = (product) => {
      setEditingProduct(product);
      // Set images array from product
      const productImages = product.images || [product.image || product.imageUrl];
      setAllImages(productImages.filter(url => url)); // Filter out any null/undefined
      
      setFormData({
        name: product.name || '',
        description: product.description || '',
        // If originalPrice exists, it's the regular price and price is the sale price
        price: product.originalPrice ? product.originalPrice.toString() : product.price.toString(),
        salePrice: product.originalPrice ? product.price.toString() : '',
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
        variants: product.variants || [],
        volume_pricing: product.volume_pricing || null
      });
      setShowForm(true);
    };

    const handleDelete = async (productId) => {
      if (confirm('Ushbu mahsulotni o\'chirishga ishonchingiz komilmi? Bu amalni ortga qaytarib bo\'lmaydi.')) {
        try {
          await deleteProduct(productId);
          console.log('✅ Product deleted successfully');
        } catch (error) {
          console.error('❌ Failed to delete product:', error);
          alert('Failed to delete product. Please try again.');
        }
      }
    };

    // Auto-generate variants when colors or sizes change
    const handleColorsOrSizesChange = (field, value) => {
      const updatedFormData = { ...formData, [field]: value };

      // Parse colors and sizes
      const colors = updatedFormData.colors ? updatedFormData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
      const sizes = updatedFormData.sizes ? updatedFormData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

      if (colors.length === 0 && sizes.length === 0) {
        updatedFormData.variants = [];
        setFormData(updatedFormData);
        return;
      }

      // Generate variants only if both colors AND sizes exist
      if (colors.length > 0 && sizes.length > 0) {
        const newVariants = [];
        
        colors.forEach((color) => {
          sizes.forEach((size) => {
            // Check if variant already exists to preserve stock and image
            const existing = formData.variants.find(v =>
              v.color?.toLowerCase() === color.toLowerCase() &&
              v.size?.toLowerCase() === size.toLowerCase()
            );
            
            newVariants.push({
              color: color,
              size: size,
              stock: existing?.stock || 0,
              image: existing?.image || null,
              sku: `${color.substring(0, 3).toUpperCase()}-${size.substring(0, 1).toUpperCase()}`
            });
          });
        });

        updatedFormData.variants = newVariants;
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

    // Update variant image
    const handleVariantImageChange = (color, size, imageUrl) => {
      const updatedVariants = updateVariantImage(formData.variants, color, size, imageUrl);
      setFormData({ ...formData, variants: updatedVariants });
    };

    // Upload variant image
    const handleVariantImageUpload = async (color, size, file) => {
      if (!file) return;
      
      try {
        const result = await storageAPI.uploadProductImage(file);
        handleVariantImageChange(color, size, result.url);
        console.log(`✅ Variant image uploaded for ${color} - ${size}:`, result.url);
      } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Failed to upload variant image: ' + error.message);
      }
    };

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Mahsulotlarni boshqarish</h3>
            <p className="text-gray-600">Katalogda {products.length} ta mahsulot</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportProducts(products)}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV yuklash
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Mahsulot qo'shish
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold">
                {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                  setAllImages([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mahsulot nomi *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    required
                    placeholder="Masalan: Choyshablar to'plami"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tavsif</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    rows="3"
                    placeholder="Mahsulot haqida batafsil ma'lumot..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Masalan: Paxta"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ranglar</label>
                  <input
                    type="text"
                    value={formData.colors}
                    onChange={(e) => handleColorsOrSizesChange('colors', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Oq, Qora, Ko'k (vergul bilan ajratilgan)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">O'lchamlar</label>
                  <input
                    type="text"
                    value={formData.sizes}
                    onChange={(e) => handleColorsOrSizesChange('sizes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Kichik, O'rta, Katta (vergul bilan ajratilgan)"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teglar *</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="choyshablar, paxta, hashamatli, yumshoq (vergul bilan ajratilgan)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Teglar qidiruv uchun ishlatiladi - kalit so'zlarni vergul bilan ajrating</p>
                </div>
              </div>

              {/* Pricing and Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Narxi (UZS) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chegirma narxi (UZS)</label>
                <input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategoriya</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  <option value="">Kategoriyani tanlang</option>
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ombor miqdori *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vazni (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Masalan: 1.5"
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Belgisi</label>
                <select
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  <option value="">Yo'q</option>
                  <option value="BEST SELLER">ENG KO'P SOTILGAN</option>
                  <option value="NEW ARRIVAL">YANGI KELDI</option>
                  <option value="SALE">CHEGIRMA</option>
                  <option value="LIMITED">CHEKLANGAN</option>
                </select>
              </div>


              {/* Variant Stock Management */}
              {formData.variants.length > 0 && (
                <div className="md:col-span-2 border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-blue-900">
                      Variant inventarizatsiyasi ({formData.variants.length} ta variant)
                    </label>
                    <span className="text-xs text-blue-700 font-medium">
                      Jami: {getTotalVariantStock(formData.variants)} dona
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Har bir rang + o'lcham kombinatsiyasi uchun miqdorni kiriting
                  </p>

                  {/* Variant Grid with Images */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {formData.variants.map((variant, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 bg-white p-3 rounded border hover:border-blue-300 transition-colors"
                      >
                        {/* Variant Image Preview */}
                        <div className="flex-shrink-0">
                          {variant.image ? (
                            <div className="relative w-16 h-16 rounded overflow-hidden border-2 border-blue-300">
                              <img
                                src={variant.image}
                                alt={`${variant.color} - ${variant.size}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                              type="button"
                                onClick={() => handleVariantImageChange(variant.color, variant.size, null)}
                                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                                title="Rasmni o'chirish"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                              <ImagePlus className="w-6 h-6 text-gray-400" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files[0] && handleVariantImageUpload(variant.color, variant.size, e.target.files[0])}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Variant Info & Stock */}
                        <div className="flex-1">
                          <div className="text-sm font-medium mb-2">
                            <div className="flex flex-col gap-0.5">
                              <div>
                                <span className="text-gray-900">{variant.color}</span>
                                <span className="text-gray-400 mx-1">•</span>
                                <span className="text-gray-900">{variant.size}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Ombor:</span>
                            <input
                              type="number"
                              min="0"
                              value={variant.stock}
                              onChange={(e) => handleVariantStockChange(variant.color, variant.size, e.target.value)}
                              className="w-20 px-2 py-1 border rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          {variant.image && (
                            <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                              <ImagePlus className="w-3 h-3" />
                              Maxsus rasm o'rnatilgan
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      💡 <strong>Eslatma:</strong> Yuqoridagi "Ombor miqdori" maydoni variantlar mavjud bo'lganda e'tiborga olinmaydi.
                      Buning o'rniga, inventarizatsiya har bir variant uchun alohida hisoblanadi.
                    </p>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mahsulot rasmlari * {allImages.length > 0 && <span className="text-gray-500 font-normal">({allImages.length} ta rasm)</span>}
                </label>
                
                {/* Image Gallery */}
                {allImages.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {allImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                          <img
                            src={imageUrl}
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        
                        {/* Image Badge */}
                        {index === 0 && (
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
                            Main
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(index, index - 1)}
                              className="bg-white text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Move left"
                            >
                              <ChevronRight className="w-4 h-4 rotate-180" />
                            </button>
                          )}
                          {index < allImages.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(index, index + 1)}
                              className="bg-white text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Move right"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div>
                  <label className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    <span>{uploadingImage ? 'Uploading...' : (allImages.length === 0 ? 'Upload Product Images' : 'Add More Images')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {allImages.length === 0 ? 'Upload at least one product image. ' : ''}
                  First image will be the main product image. Click and drag to reorder.
                </p>
              </div>

              </div>

              {/* Volume Pricing Section */}
              <div className="md:col-span-2 border-t border-gray-200 pt-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-green-900">
                      Hajmli narxlash (Volume Discounts)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newTier = {
                          min_qty: formData.volume_pricing?.length > 0
                            ? (formData.volume_pricing[formData.volume_pricing.length - 1].max_qty || 0) + 1
                            : 2,
                          max_qty: null,
                          price: parseFloat(formData.salePrice || formData.price) || 0
                        };
                        setFormData({
                          ...formData,
                          volume_pricing: [...(formData.volume_pricing || []), newTier]
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Daraja qo'shish
                    </button>
                  </div>

                  <p className="text-xs text-green-700 mb-4">
                    Ko'p miqdorda xarid qilgan xaridorlar uchun maxsus narxlarni belgilang
                  </p>

                  {formData.volume_pricing && formData.volume_pricing.length > 0 ? (
                    <div className="space-y-3">
                      {formData.volume_pricing
                        .sort((a, b) => a.min_qty - b.min_qty)
                        .map((tier, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg border border-green-200 flex items-center gap-3">
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Min miqdor
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={tier.min_qty}
                                onChange={(e) => {
                                  const updated = [...(formData.volume_pricing || [])];
                                  updated[index].min_qty = parseInt(e.target.value) || 1;
                                  setFormData({ ...formData, volume_pricing: updated });
                                }}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Max miqdor
                              </label>
                              <input
                                type="number"
                                min={tier.min_qty}
                                value={tier.max_qty || ''}
                                onChange={(e) => {
                                  const updated = [...(formData.volume_pricing || [])];
                                  updated[index].max_qty = e.target.value ? parseInt(e.target.value) : null;
                                  setFormData({ ...formData, volume_pricing: updated });
                                }}
                                placeholder="Cheksiz"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Har bir narxi (UZS)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={tier.price}
                                onChange={(e) => {
                                  const updated = [...(formData.volume_pricing || [])];
                                  updated[index].price = parseFloat(e.target.value) || 0;
                                  setFormData({ ...formData, volume_pricing: updated });
                                }}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.volume_pricing.filter((_, i) => i !== index);
                              setFormData({ ...formData, volume_pricing: updated.length > 0 ? updated : null });
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-colors"
                            title="Darajani o'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Preview */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-900 mb-2">📊 Ko'rinish:</p>
                        <div className="text-xs text-blue-800 space-y-1">
                          {formData.volume_pricing
                            .sort((a, b) => a.min_qty - b.min_qty)
                            .map((tier, idx) => (
                            <div key={idx}>
                              • {tier.min_qty}{tier.max_qty ? `-${tier.max_qty}` : '+'} dona: {formatPrice(tier.price)} har biri
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      <p className="mb-2">Hozircha hajmli narxlash yo'q</p>
                      <p className="text-xs">Yuqoridagi "Daraja qo'shish" tugmasini bosing</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="bg-accent hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    setAllImages([]);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg mr-4"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.description?.substring(0, 50)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.category}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{formatPrice(product.price)}</div>
                      {product.originalPrice && (
                        <div className="text-sm text-gray-500 line-through">{formatPrice(product.originalPrice)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        // Use variant stock if product has variants, otherwise use regular stock
                        const displayStock = product.variants && product.variants.length > 0
                          ? getTotalVariantStock(product.variants)
                          : (product.stock || 0);
                        
                        return (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            displayStock > 10 ? 'bg-green-100 text-green-800' :
                            displayStock > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {displayStock} units
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        // Use variant stock if product has variants, otherwise use regular stock
                        const displayStock = product.variants && product.variants.length > 0
                          ? getTotalVariantStock(product.variants)
                          : (product.stock || 0);
                        
                        return (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            displayStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {displayStock > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function CategoriesContent() {
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [formData, setFormData] = useState({
      name: '',
      image: ''
    });

    const handleImageUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingImage(true);
        console.log('📤 Uploading image to Supabase...');

        const { storageAPI } = await import('../../services/api');
        const result = await storageAPI.uploadProductImage(file);

        console.log('✅ Image uploaded:', result.url);
        setFormData(prev => ({ ...prev, image: result.url }));
      } catch (error) {
        console.error('❌ Image upload failed:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
        e.target.value = '';
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        const categoryData = {
          name: formData.name,
          image: formData.image || null
        };

        if (editingCategory) {
          await updateCategory(editingCategory.id, categoryData);
          console.log('✅ Category updated successfully');
        } else {
          await addCategory(categoryData);
          console.log('✅ Category created successfully');
        }

        setShowForm(false);
        setEditingCategory(null);
        setFormData({ name: '', image: '' });
      } catch (error) {
        console.error('❌ Failed to save category:', error);
        alert('Failed to save category. Please try again.');
      }
    };

    const handleEdit = (category) => {
      setEditingCategory(category);
      setFormData({
        name: category.name || '',
        image: category.image || ''
      });
      setShowForm(true);
    };

    const handleDelete = async (categoryId) => {
      if (confirm('Ushbu kategoriyani o\'chirishga ishonchingiz komilmi? Bu amalni ortga qaytarib bo\'lmaydi.')) {
        try {
          await deleteCategory(categoryId);
          console.log('✅ Category deleted successfully');
        } catch (error) {
          console.error('❌ Failed to delete category:', error);
          alert('Failed to delete category. Please try again.');
        }
      }
    };

    const handleMoveCategory = (index, direction) => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= categories.length) return;

      // Create a copy of categories array
      const reorderedCategoriesArray = [...categories];

      // Swap the categories
      [reorderedCategoriesArray[index], reorderedCategoriesArray[newIndex]] =
      [reorderedCategoriesArray[newIndex], reorderedCategoriesArray[index]];

      // Update the order in AdminContext (which also saves to localStorage)
      reorderCategories(reorderedCategoriesArray);
    };

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Kategoriyalarni boshqarish</h3>
            <p className="text-gray-600">{categories.length} ta kategoriya</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Kategoriya qo'shish
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold">
                {editingCategory ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya qo\'shish'}
              </h4>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategoriya nomi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Masalan: Choyshablar"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategoriya rasmi</label>
                <div className="space-y-3">
                  <div>
                    <label className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5" />
                      <span>{uploadingImage ? 'Yuklanmoqda...' : 'Qurilmadan rasm yuklash'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-sm text-gray-500 font-medium">YOKI</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Rasm URL manzilini kiriting (https://...)"
                  />

                  {formData.image && (
                    <div className="mt-2">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-accent hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {editingCategory ? 'Kategoriyani yangilash' : 'Kategoriya qo\'shish'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCategory(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <div key={category.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-50">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl text-gray-400">
                    📷
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{category.name}</h3>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMoveCategory(index, 'up')}
                    disabled={index === 0}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Move Up
                  </button>
                  <button
                    onClick={() => handleMoveCategory(index, 'down')}
                    disabled={index === categories.length - 1}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Move Down
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && !showForm && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <LayoutGrid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-4">Create your first category to organize products</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-accent hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add First Category
            </button>
          </div>
        )}
      </div>
    );
  }

  function ReviewsContent() {
    const [filter, setFilter] = useState('all'); // all, pending, approved

    const filteredReviews = reviews?.filter(review => {
      if (filter === 'pending') return !review.approved;
      if (filter === 'approved') return review.approved;
      return true;
    }) || [];

    const handleApprove = async (reviewId) => {
      try {
        await approveReview(reviewId);
        console.log('✅ Review approved successfully');
      } catch (error) {
        console.error('❌ Failed to approve review:', error);
        alert('Failed to approve review. Please try again.');
      }
    };

    const handleDelete = async (reviewId) => {
      if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
        try {
          await deleteReview(reviewId);
          console.log('✅ Review deleted successfully');
        } catch (error) {
          console.error('❌ Failed to delete review:', error);
          alert('Failed to delete review. Please try again.');
        }
      }
    };

    const renderStars = (rating) => {
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Header with Export */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Reviews Management</h3>
          <button
            onClick={() => exportReviews(filteredReviews, `reviews_${filter}`)}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 font-medium transition-colors ${
                  filter === 'all'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Reviews ({reviews?.length || 0})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-6 py-3 font-medium transition-colors relative ${
                  filter === 'pending'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending ({pendingReviews})
                {pendingReviews > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingReviews}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-6 py-3 font-medium transition-colors ${
                  filter === 'approved'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Approved ({reviews?.filter(r => r.approved).length || 0})
              </button>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {(review.user_name || review.userName)?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{review.user_name || review.userName || 'Anonymous'}</h4>
                          <p className="text-sm text-gray-500">{formatDate(review.created_at || review.createdAt)}</p>
                        </div>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        review.approved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {review.approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  {review.productName && (
                    <div className="mb-3 pb-3 border-b flex items-center gap-3">
                      {review.productImage && (
                        <img
                          src={review.productImage}
                          alt={review.productName}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Product</p>
                        <p className="font-medium text-gray-900">{review.productName}</p>
                      </div>
                    </div>
                  )}

                  {/* Comment */}
                  {review.comment && (
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    {!review.approved && (
                      <button
                        onClick={() => handleApprove(review.id)}
                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Review
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'pending' ? 'No pending reviews' : filter === 'approved' ? 'No approved reviews yet' : 'No reviews yet'}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' ? 'Customer reviews will appear here when submitted' : `Switch to another tab to see ${filter === 'pending' ? 'approved' : 'pending'} reviews`}
            </p>
          </div>
        )}
      </div>
    );
  }

  function UsersContent() {
    const { users } = useContext(AdminContext);
    const [expandedUser, setExpandedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter users based on search
    const filteredUsers = users.filter(user => 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div>
        {/* Header with Export */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Users Management</h3>
          <button
            onClick={() => exportUsers(users)}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users by name, username, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <UsersIcon className="w-12 h-12 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Today</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">With Orders</p>
                <p className="text-3xl font-bold text-gray-900">{users.filter(u => u.totalOrders > 0).length}</p>
              </div>
              <ShoppingBag className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Users List */}
        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">@{user.username || 'No username'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Bonus Points</p>
                        <p className="text-xl font-bold text-indigo-600">{user.bonusPoints || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Orders</p>
                        <p className="text-xl font-bold text-gray-900">{user.totalOrders || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Phone</p>
                      <p className="text-sm text-gray-900">{user.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Email</p>
                      <p className="text-sm text-gray-900">{user.email || 'Not provided'}</p>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {expandedUser === user.id ? 'Hide Details' : 'Show Details'}
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedUser === user.id ? 'rotate-90' : ''}`} />
                  </button>

                  {expandedUser === user.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Telegram ID</p>
                          <p className="text-sm text-gray-900 font-mono">{user.telegramId || user.telegram_id || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Referral Code</p>
                          <p className="text-sm text-gray-900 font-mono">{user.referralCode || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Referred By</p>
                          <p className="text-sm text-gray-900">{user.referredBy || 'None'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Referrals Made</p>
                          <p className="text-sm text-gray-900">{user.referrals || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Joined Date</p>
                          <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Last Updated</p>
                          <p className="text-sm text-gray-900">{formatDate(user.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No users found' : 'No users yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search query' : 'Users will appear here when they sign up'}
            </p>
          </div>
        )}
      </div>
    );
  }

  function AnalyticsContent() {
    const analytics = calculateAnalytics(orders, users, products);
    const chartData = getRevenueChartData(orders);

    return (
      <div className="space-y-6">
        {/* Revenue Overview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.totalRevenue)}</p>
              <div className="mt-2 flex items-center gap-1">
                {analytics.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">This Month</p>
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.monthRevenue)}</p>
              <p className="text-sm text-gray-500 mt-2">{analytics.monthOrdersCount} orders</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">This Week</p>
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.weekRevenue)}</p>
              <p className="text-sm text-gray-500 mt-2">{analytics.weekOrdersCount} orders</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <ShoppingBag className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.avgOrderValue)}</p>
              <p className="text-sm text-gray-500 mt-2">Per order</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last 7 Days Revenue</h3>
          <div className="space-y-4">
            {chartData.map((day, index) => {
              const maxRevenue = Math.max(...chartData.map(d => d.revenue));
              const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">{day.date}</span>
                    <span className="font-semibold text-gray-900">{formatPrice(day.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{day.orders} orders</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order & Customer Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">Completed</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.totalOrders}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-gray-700">Pending</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.pendingOrdersCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">Approved</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.ordersByStatus.approved}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-700">Shipped</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.ordersByStatus.shipped}</span>
              </div>
            </div>
          </div>

          {/* Customer Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-gray-700">Total Customers</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.totalCustomers}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-gray-700">Conversion Rate</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.conversionRate.toFixed(1)}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="text-gray-700">Total Referrals</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.totalReferrals}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-gray-700">Active Referrers</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.usersWithReferrals}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          {analytics.topProducts.length > 0 ? (
            <div className="space-y-4">
              {analytics.topProducts.map((product, index) => (
                <div key={product.productId} className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.quantity} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatPrice(product.revenue)}</p>
                      <p className="text-sm text-gray-500">Revenue</p>
                    </div>
                  </div>
                  
                  {/* Variant Breakdown */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Variants:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {product.variants.slice(0, 4).map((variant, vIdx) => (
                          <div key={vIdx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <span className="text-xs text-gray-700">{variant.label}</span>
                            <span className="text-xs font-semibold text-gray-900">{variant.quantity} sold</span>
                          </div>
                        ))}
                      </div>
                      {product.variants.length > 4 && (
                        <p className="text-xs text-gray-500 mt-2">+{product.variants.length - 4} more variant{product.variants.length - 4 !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          )}
        </div>

        {/* Inventory Alerts */}
        {(analytics.lowStockProducts > 0 || analytics.outOfStockProducts > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Inventory Alerts</h3>
                <div className="space-y-2">
                  {analytics.outOfStockProducts > 0 && (
                    <p className="text-yellow-800">
                      <strong>{analytics.outOfStockProducts}</strong> product{analytics.outOfStockProducts !== 1 ? 's' : ''} out of stock
                    </p>
                  )}
                  {analytics.lowStockProducts > 0 && (
                    <p className="text-yellow-800">
                      <strong>{analytics.lowStockProducts}</strong> product{analytics.lowStockProducts !== 1 ? 's' : ''} low on stock (&lt;10 units)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function PickupPointsContent() {
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

    // Extract unique values from existing pickup points
    const uniqueCouriers = [...new Set(pickupPoints.map(p => p.courierService))].sort();
    const uniqueStates = [...new Set(pickupPoints.map(p => p.state))].sort();
    const uniqueCities = [...new Set(pickupPoints.map(p => p.city))].sort();
    
    // Filter cities based on selected state
    const citiesForState = formData.state
      ? [...new Set(pickupPoints.filter(p => p.state === formData.state).map(p => p.city))].sort()
      : uniqueCities;

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

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!formData.courierService || !formData.state || !formData.city || !formData.address || !formData.phone) {
        alert('Please fill in all required fields');
        return;
      }

      try {
        if (editingPoint) {
          await updatePickupPoint(editingPoint.id, formData);
        } else {
          await addPickupPoint(formData);
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
      } catch (error) {
        console.error('Failed to save pickup point:', error);
        alert('Failed to save pickup point. Please try again.');
      }
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

    const handleDelete = async (pointId) => {
      if (confirm('Are you sure you want to delete this pickup point?')) {
        try {
          await deletePickupPoint(pointId);
        } catch (error) {
          console.error('Failed to delete pickup point:', error);
          alert('Failed to delete pickup point. Please try again.');
        }
      }
    };

    return (
      <div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Pickup Point
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h3 className="text-xl font-bold mb-4">
              {editingPoint ? 'Edit Pickup Point' : 'Add New Pickup Point'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Courier Service *</label>
                <input
                  list="courier-list"
                  type="text"
                  value={formData.courierService}
                  onChange={(e) => setFormData({ ...formData, courierService: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="e.g., Yandex, Uzum, Express24"
                  required
                />
                <datalist id="courier-list">
                  {uniqueCouriers.map(courier => (
                    <option key={courier} value={courier} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">State/Region *</label>
                <input
                  list="state-list"
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="e.g., Tashkent Region"
                  required
                />
                <datalist id="state-list">
                  {uniqueStates.map(state => (
                    <option key={state} value={state} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">City *</label>
                <input
                  list="city-list"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="e.g., Tashkent"
                  required
                />
                <datalist id="city-list">
                  {citiesForState.map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
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

              <div>
                <label className="block text-sm font-semibold mb-1">Working Hours *</label>
                <input
                  list="hours-list"
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="e.g., 09:00 - 20:00"
                  required
                />
                <datalist id="hours-list">
                  <option value="09:00 - 20:00" />
                  <option value="08:00 - 22:00" />
                  <option value="10:00 - 19:00" />
                  <option value="24/7" />
                </datalist>
              </div>

              <div className="col-span-2">
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

              <div className="col-span-2 flex gap-2">
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
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {Object.keys(groupedPoints).length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <MapPin className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No pickup points found</p>
            </div>
          ) : (
            Object.entries(groupedPoints).map(([courier, stateGroups]) => {
              const isCourierExpanded = expandedCouriers.has(courier);
              const totalPoints = Object.values(stateGroups).reduce((sum, cityGroups) =>
                sum + Object.values(cityGroups).reduce((citySum, addresses) => citySum + addresses.length, 0), 0
              );

              return (
                <div key={courier} className="bg-white rounded-lg shadow-md overflow-hidden">
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

                  {isCourierExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {Object.entries(stateGroups).map(([state, cityGroups]) => {
                        const isStateExpanded = expandedStates.has(`${courier}-${state}`);
                        const statePoints = Object.values(cityGroups).reduce((sum, addresses) => sum + addresses.length, 0);

                        return (
                          <div key={state} className="bg-gray-50 rounded-lg overflow-hidden">
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

                            {isStateExpanded && (
                              <div className="px-3 pb-3 space-y-2">
                                {Object.entries(cityGroups).map(([city, addresses]) => {
                                  const isCityExpanded = expandedCities.has(`${courier}-${state}-${city}`);

                                  return (
                                    <div key={city} className="bg-white rounded-lg overflow-hidden border border-gray-200">
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

                                      {isCityExpanded && (
                                        <div className="px-3 pb-3 space-y-2">
                                          {addresses.map((point) => (
                                            <div key={point.id} className="bg-gray-50 rounded-lg p-3">
                                              <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                      point.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                      {point.active ? 'Active' : 'Inactive'}
                                                    </span>
                                                  </div>
                                                  <p className="text-gray-800 font-medium mb-1">{point.address}</p>
                                                  <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                      <Clock className="w-4 h-4" />
                                                      {point.workingHours}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                      <Phone className="w-4 h-4" />
                                                      {point.phone}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() => togglePickupPointStatus(point.id)}
                                                    className={`text-sm px-3 py-1 rounded ${
                                                      point.active
                                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    }`}
                                                  >
                                                    {point.active ? 'Deactivate' : 'Activate'}
                                                  </button>
                                                  <button
                                                    onClick={() => handleEdit(point)}
                                                    className="text-accent p-2 hover:bg-blue-50 rounded"
                                                  >
                                                    <Edit className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={() => duplicatePickupPoint(point.id)}
                                                    className="text-gray-600 p-2 hover:bg-gray-100 rounded"
                                                  >
                                                    <Copy className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={() => handleDelete(point.id)}
                                                    className="text-error p-2 hover:bg-red-50 rounded"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                </div>
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
  }

  function ShippingRatesContent() {
    const {
      shippingRates,
      addShippingRate,
      updateShippingRate,
      deleteShippingRate
    } = useContext(ShippingRatesContext);

    const [showForm, setShowForm] = useState(false);
    const [editingRate, setEditingRate] = useState(null);
    const [expandedCouriers, setExpandedCouriers] = useState(new Set());
    const [formData, setFormData] = useState({
      courier: '',
      state: '',
      firstKg: '',
      additionalKg: '',
      paymentType: 'prepaid'
    });

    // Get unique couriers and states from existing rates
    const uniqueCouriers = [...new Set(shippingRates.map(r => r.courier))].sort();
    const uniqueStates = [...new Set(shippingRates.map(r => r.state))].sort();

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!formData.courier || !formData.state || !formData.firstKg) {
        alert('Please fill in all required fields');
        return;
      }

      const rateData = {
        courier: formData.courier,
        firstKg: parseFloat(formData.firstKg),
        additionalKg: parseFloat(formData.additionalKg) || 0,
        paymentType: formData.paymentType
      };

      try {
        if (editingRate) {
          // When editing, only update single rate
          await updateShippingRate(editingRate.id, { ...rateData, state: formData.state });
        } else {
          // When adding, split states by comma and create multiple rates
          const states = formData.state.split(',').map(s => s.trim()).filter(s => s);
          for (const state of states) {
            await addShippingRate({ ...rateData, state });
          }
        }

        setFormData({ courier: '', state: '', firstKg: '', additionalKg: '', paymentType: 'prepaid' });
        setEditingRate(null);
        setShowForm(false);
      } catch (error) {
        console.error('Failed to save shipping rate:', error);
        alert('Failed to save shipping rate. Please try again.');
      }
    };

    const handleEdit = (rate) => {
      setEditingRate(rate);
      setFormData({
        courier: rate.courier,
        state: rate.state,
        firstKg: rate.firstKg.toString(),
        additionalKg: rate.additionalKg.toString(),
        paymentType: rate.paymentType || 'prepaid'
      });
      setShowForm(true);
    };

    const handleDelete = async (rateId) => {
      if (confirm('Are you sure you want to delete this shipping rate?')) {
        try {
          await deleteShippingRate(rateId);
        } catch (error) {
          console.error('Failed to delete shipping rate:', error);
          alert('Failed to delete shipping rate. Please try again.');
        }
      }
    };

    const toggleCourier = (courier) => {
      const newSet = new Set(expandedCouriers);
      if (newSet.has(courier)) {
        newSet.delete(courier);
      } else {
        newSet.add(courier);
      }
      setExpandedCouriers(newSet);
    };

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
            className="mb-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Shipping Rate
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h3 className="text-xl font-bold mb-4">
              {editingRate ? 'Edit Shipping Rate' : 'Add New Shipping Rate'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Courier Service *</label>
                <input
                  list="courier-rates-list"
                  type="text"
                  value={formData.courier}
                  onChange={(e) => setFormData({ ...formData, courier: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="e.g., BTS, Yandex, Starex"
                  required
                />
                <datalist id="courier-rates-list">
                  {uniqueCouriers.map(courier => (
                    <option key={courier} value={courier} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  State/Region * {!editingRate && <span className="text-xs text-gray-500">(comma-separated for multiple)</span>}
                </label>
                <input
                  list="state-rates-list"
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder={editingRate ? "e.g., Tashkent Region" : "e.g., Tashkent Region, Samarkand Region"}
                  required
                />
                <datalist id="state-rates-list">
                  {uniqueStates.map(state => (
                    <option key={state} value={state} />
                  ))}
                </datalist>
                {!editingRate && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Enter multiple regions separated by commas to create rates for all at once
                  </p>
                )}
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

              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Payment Method *</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                >
                  <option value="prepaid">Prepaid (Customer pays online with product)</option>
                  <option value="postpaid">Pay at Pickup (Customer pays at pickup point)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Choose how customers pay for shipping with this courier
                </p>
              </div>

              <div className="col-span-2 flex gap-2">
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
                    setFormData({ courier: '', state: '', firstKg: '', additionalKg: '', paymentType: 'prepaid' });
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {Object.keys(groupedRates).length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Truck className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No shipping rates configured</p>
            </div>
          ) : (
            Object.entries(groupedRates).map(([courier, rates]) => {
              const isCourierExpanded = expandedCouriers.has(courier);

              return (
                <div key={courier} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleCourier(courier)}
                    className="w-full flex items-center gap-3 p-6 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      isCourierExpanded ? 'rotate-90' : ''
                    }`} />
                    <Truck className="w-6 h-6 text-accent" />
                    <div className="flex-1 text-left">
                      <h3 className="text-xl font-bold text-gray-800">{courier}</h3>
                      <p className="text-sm text-gray-500">{rates.length} shipping rates</p>
                    </div>
                  </button>

                  {isCourierExpanded && (
                    <div className="px-6 pb-6 grid gap-3">
                      {rates.map((rate) => (
                        <div key={rate.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-gray-800">{rate.state}</p>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                rate.paymentType === 'postpaid'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {rate.paymentType === 'postpaid' ? 'Pay at Pickup' : 'Prepaid'}
                              </span>
                            </div>
                            <div className="flex gap-6 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">First KG:</span> {formatPrice(rate.firstKg)}
                              </div>
                              <div>
                                <span className="font-medium">Additional KG:</span> {rate.additionalKg > 0 ? formatPrice(rate.additionalKg) : 'Flat rate'}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(rate)}
                              className="text-accent p-2 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(rate.id)}
                              className="text-error p-2 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function PromotionsContent() {
    const [banners, setBanners] = useState([]);
    const [saleTimer, setSaleTimer] = useState({
      endDate: '2025-12-31T23:59:59',
      enabled: true
    });

    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [savedBanners, setSavedBanners] = useState(null);
    const [savedTimer, setSavedTimer] = useState(null);
    const [editingBannerIndex, setEditingBannerIndex] = useState(null);

    // Load from Supabase
    useEffect(() => {
      const loadSettings = async () => {
        try {
          const settings = await settingsAPI.getSettings();
          const loadedBanners = settings.banners || (settings.sale_banner ? [settings.sale_banner] : []);
          setBanners(loadedBanners);
          setSavedBanners(loadedBanners);
          if (settings.sale_timer) {
            setSaleTimer(settings.sale_timer);
            setSavedTimer(settings.sale_timer);
          }
          console.log('✅ Settings loaded from Supabase');
        } catch (error) {
          console.error('Failed to load settings:', error);
        } finally {
          setLoading(false);
        }
      };
      loadSettings();
    }, []);

    // Track unsaved changes
    useEffect(() => {
      if (!savedBanners || !savedTimer) return;
      const bannersChanged = JSON.stringify(banners) !== JSON.stringify(savedBanners);
      const timerChanged = JSON.stringify(saleTimer) !== JSON.stringify(savedTimer);
      setHasUnsavedChanges(bannersChanged || timerChanged);
    }, [banners, saleTimer, savedBanners, savedTimer]);

    const handleSaveAll = async () => {
      setSaving(true);
      try {
        await Promise.all([
          settingsAPI.updateBanners(banners),
          settingsAPI.updateTimer(saleTimer)
        ]);
        setSavedBanners(banners);
        setSavedTimer(saleTimer);
        setHasUnsavedChanges(false);
        console.log('✅ All settings saved to Supabase');
        alert('✅ Promotions saved successfully!');
      } catch (error) {
        console.error('Failed to save settings:', error);
        alert('❌ Failed to save settings. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    const handleDiscardChanges = () => {
      if (confirm('Discard all unsaved changes?')) {
        setBanners(savedBanners);
        setSaleTimer(savedTimer);
        setHasUnsavedChanges(false);
      }
    };

    const handleAddBanner = () => {
      setBanners([...banners, {
        title: 'New Banner',
        subtitle: 'Add your promotional message',
        imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=400&fit=crop',
        enabled: true
      }]);
      setEditingBannerIndex(banners.length);
    };

    const handleUpdateBanner = (index, updates) => {
      const newBanners = [...banners];
      newBanners[index] = { ...newBanners[index], ...updates };
      setBanners(newBanners);
    };

    const handleDeleteBanner = (index) => {
      if (confirm('Delete this banner?')) {
        setBanners(banners.filter((_, i) => i !== index));
        if (editingBannerIndex === index) {
          setEditingBannerIndex(null);
        }
      }
    };

    const handleMoveBanner = (index, direction) => {
      const newBanners = [...banners];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= banners.length) return;
      [newBanners[index], newBanners[targetIndex]] = [newBanners[targetIndex], newBanners[index]];
      setBanners(newBanners);
    };

    const handleImageUpload = async (e, bannerIndex) => {
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

      setUploadingImage(bannerIndex);

      try {
        const result = await storageAPI.uploadImage(file, 'banners');
        handleUpdateBanner(bannerIndex, { imageUrl: result.url });
        console.log('✅ Banner image uploaded:', result.url);
      } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Failed to upload image: ' + error.message);
      } finally {
        setUploadingImage(null);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl space-y-6">
        {/* Save Bar - Sticky at top */}
        {hasUnsavedChanges && (
          <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 flex items-center justify-between shadow-md sticky top-4 z-10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-semibold text-gray-900">You have unsaved changes</p>
                <p className="text-sm text-gray-600">Don't forget to save your changes before leaving</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDiscardChanges}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Homepage Banners Carousel */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-transparent hover:border-blue-100 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Image className="w-6 h-6 text-primary" />
                Homepage Banner Carousel
              </h3>
              <p className="text-sm text-gray-600 mt-1">Manage promotional banners that slide automatically</p>
            </div>
            <button
              onClick={handleAddBanner}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Banner
            </button>
          </div>

          {banners.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">No banners configured</p>
              <button
                onClick={handleAddBanner}
                className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Banner
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {banners.map((banner, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-5 border-2 border-gray-200 hover:border-blue-200 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Banner Preview Thumbnail */}
                    <div className="flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden border-2 border-gray-300">
                      <div className="relative w-full h-full">
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                          onError={(e) => e.target.src = 'https://via.placeholder.com/300x150?text=Banner'}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 flex items-end p-2">
                          <p className="text-white text-xs font-semibold truncate">{banner.title}</p>
                        </div>
                        {!banner.enabled && (
                          <div className="absolute top-1 right-1 bg-gray-900/80 text-white px-2 py-0.5 rounded text-xs">
                            Disabled
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Banner Details & Controls */}
                    <div className="flex-1 space-y-3">
                      {editingBannerIndex === index ? (
                        <>
                          {/* Edit Mode */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold mb-1 text-gray-700">Title</label>
                              <input
                                type="text"
                                value={banner.title}
                                onChange={(e) => handleUpdateBanner(index, { title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                                placeholder="Banner title"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1 text-gray-700">Subtitle</label>
                              <input
                                type="text"
                                value={banner.subtitle}
                                onChange={(e) => handleUpdateBanner(index, { subtitle: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                                placeholder="Banner subtitle"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-gray-700">Image URL</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={banner.imageUrl}
                                onChange={(e) => handleUpdateBanner(index, { imageUrl: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                                placeholder="Paste image URL"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, index)}
                                disabled={uploadingImage === index}
                                className="hidden"
                                id={`banner-upload-${index}`}
                              />
                              <label
                                htmlFor={`banner-upload-${index}`}
                                className={`px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer text-sm font-medium inline-flex items-center gap-2 ${
                                  uploadingImage === index
                                    ? 'bg-gray-100 cursor-not-allowed border-gray-300 text-gray-500'
                                    : 'hover:border-accent hover:bg-blue-50 border-gray-300 text-gray-700'
                                }`}
                              >
                                {uploadingImage === index ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                              </label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingBannerIndex(null)}
                              className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                              Done Editing
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* View Mode */}
                          <div>
                            <h4 className="font-bold text-gray-900">{banner.title}</h4>
                            <p className="text-sm text-gray-600">{banner.subtitle}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateBanner(index, { enabled: !banner.enabled })}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                banner.enabled ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  banner.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="text-xs text-gray-600">
                              {banner.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-1">
                      {editingBannerIndex !== index && (
                        <button
                          onClick={() => setEditingBannerIndex(index)}
                          className="p-2 text-accent hover:bg-blue-50 rounded transition-colors"
                          title="Edit banner"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {index > 0 && (
                        <button
                          onClick={() => handleMoveBanner(index, 'up')}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="Move up"
                        >
                          <MoveUp className="w-4 h-4" />
                        </button>
                      )}
                      {index < banners.length - 1 && (
                        <button
                          onClick={() => handleMoveBanner(index, 'down')}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="Move down"
                        >
                          <MoveDown className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteBanner(index)}
                        className="p-2 text-error hover:bg-red-50 rounded transition-colors"
                        title="Delete banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {banners.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 font-medium mb-1">💡 Carousel Preview</p>
              <p className="text-sm text-blue-900">
                {banners.filter(b => b.enabled).length === 0 && 'No banners enabled. Enable at least one banner to display the carousel.'}
                {banners.filter(b => b.enabled).length === 1 && 'One banner enabled. It will display as a static banner.'}
                {banners.filter(b => b.enabled).length > 1 && `${banners.filter(b => b.enabled).length} banners enabled. They will auto-slide every 5 seconds with swipe support.`}
              </p>
            </div>
          )}
        </div>

        {/* Sale Timer */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-transparent hover:border-blue-100 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Countdown Timer
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                saleTimer.enabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {saleTimer.enabled ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-gray-900">Timer Status</label>
                    <p className="text-sm text-gray-500 mt-1">Show countdown on homepage</p>
                  </div>
                  <button
                    onClick={() => setSaleTimer({ ...saleTimer, enabled: !saleTimer.enabled })}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      saleTimer.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        saleTimer.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Sale End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={saleTimer.endDate.replace(' ', 'T').slice(0, 16)}
                  onChange={(e) => {
                    const newValue = e.target.value.replace('T', ' ') + ':00';
                    setSaleTimer({ ...saleTimer, endDate: newValue });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-shadow"
                />
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">📅 Selected date:</p>
                  <p className="text-sm text-blue-900 font-semibold">
                    {new Date(saleTimer.endDate).toLocaleString('uz-UZ', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-xl p-8 border-2 border-orange-200">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <Calendar className="w-16 h-16 text-orange-500" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
                    !
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2 font-medium">Sale ends in</p>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">
                  {Math.ceil((new Date(saleTimer.endDate) - new Date()) / (1000 * 60 * 60 * 24))}
                </p>
                <p className="text-lg font-semibold text-gray-700 mt-1">days remaining</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function BonusSettingsContent() {
    const [bonusConfig, setBonusConfig] = useState({
      referralCommission: 10,
      purchaseBonus: 10,
      currency: 'UZS'
    });
    const [loading, setLoading] = useState(true);

    // Load from database first, fallback to localStorage
    useEffect(() => {
      const loadConfig = async () => {
        try {
          const settings = await settingsAPI.getSettings();
          if (settings?.bonus_config) {
            console.log('✅ Loaded bonus config from database:', settings.bonus_config);
            setBonusConfig({
              ...bonusConfig,
              ...settings.bonus_config
            });
            // Also update localStorage to sync
            saveToLocalStorage('bonusConfig', settings.bonus_config);
          } else {
            // Fallback to localStorage if database doesn't have it
            const saved = loadFromLocalStorage('bonusConfig');
            if (saved) {
              console.log('ℹ️ Loaded bonus config from localStorage:', saved);
              setBonusConfig(saved);
            }
          }
        } catch (error) {
          console.error('❌ Failed to load bonus config:', error);
          // Try localStorage as fallback
          const saved = loadFromLocalStorage('bonusConfig');
          if (saved) {
            setBonusConfig(saved);
          }
        } finally {
          setLoading(false);
        }
      };

      loadConfig();
    }, []);

    const saveBonusConfig = async (newConfig) => {
      setBonusConfig(newConfig);
      saveToLocalStorage('bonusConfig', newConfig);

      // ALSO save to Supabase database so webhooks can read it
      try {
        const result = await settingsAPI.updateBonusConfig({
          purchaseBonus: newConfig.purchaseBonus,
          referralCommission: newConfig.referralCommission
        });
        console.log('✅ Bonus config saved to database:', result);
        alert('✅ Bonus configuration saved successfully!');
      } catch (error) {
        console.error('❌ Failed to save bonus config to database:', error);
        alert('❌ Failed to save configuration. Please try again.');
      }
    };

    if (loading) {
      return (
        <div className="max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">Loading bonus configuration...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Gift className="w-7 h-7 text-primary" />
            Bonus & Rewards Configuration
          </h3>

          <div className="grid gap-6">
            {/* Referral Commission */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <label className="block text-lg font-bold mb-2 text-blue-900 flex items-center gap-2">
                🎁 Referral Commission Percentage
              </label>
              <p className="text-sm text-gray-700 mb-4">
                Percentage of referred user's order total credited to the referrer when their first order is approved
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={bonusConfig.referralCommission}
                  onChange={(e) => saveBonusConfig({ ...bonusConfig, referralCommission: parseInt(e.target.value) || 0 })}
                  className="w-32 px-4 py-3 border-2 border-blue-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                  step="1"
                />
                <span className="text-2xl font-bold text-blue-900">%</span>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">
                  <strong>Example:</strong> On a 100,000 UZS order, referrer earns{' '}
                  <span className="font-bold text-blue-700">
                    {(100000 * bonusConfig.referralCommission / 100).toLocaleString()} UZS
                  </span>
                </p>
              </div>
            </div>

            {/* Purchase Bonus */}
            <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <label className="block text-lg font-bold mb-2 text-green-900 flex items-center gap-2">
                💰 Purchase Bonus Percentage
              </label>
              <p className="text-sm text-gray-700 mb-4">
                Percentage of purchase amount given as bonus points for all users
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={bonusConfig.purchaseBonus}
                  onChange={(e) => saveBonusConfig({ ...bonusConfig, purchaseBonus: parseInt(e.target.value) || 0 })}
                  className="w-32 px-4 py-3 border-2 border-green-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  min="0"
                  max="100"
                  step="1"
                />
                <span className="text-2xl font-bold text-green-900">%</span>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">
                  <strong>Example:</strong> 100,000 UZS purchase ={' '}
                  <span className="font-bold text-green-700">
                    {(100000 * bonusConfig.purchaseBonus / 100).toLocaleString()} UZS
                  </span>{' '}
                  in bonus points
                </p>
              </div>
            </div>

            {/* Info Card */}
            <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
              <h4 className="font-bold text-base mb-3 flex items-center gap-2">
                <span className="text-2xl">ℹ️</span> How it works
              </h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    <strong>Referral Commission:</strong> When a referred user makes their first order and it's approved,
                    the referrer receives {bonusConfig.referralCommission}% of the order total as commission
                    (e.g., 100,000 UZS order = {(100000 * bonusConfig.referralCommission / 100).toLocaleString()} UZS commission)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>
                    <strong>Purchase Bonus:</strong> All users earn {bonusConfig.purchaseBonus}% of their purchase as bonus points
                    (e.g., 100,000 UZS = {(100000 * bonusConfig.purchaseBonus / 100).toLocaleString()} UZS in points)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>Referral commissions are paid as direct currency, not points</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  <span>These settings apply immediately and affect all future transactions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function InventorySettingsContent() {
    const [threshold, setThreshold] = useState(10);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [lastCheck, setLastCheck] = useState(null);

    // Load threshold from database
    useEffect(() => {
      const loadThreshold = async () => {
        try {
          const settings = await settingsAPI.getSettings();
          if (settings?.inventory?.low_stock_threshold) {
            setThreshold(settings.inventory.low_stock_threshold);
          }
        } catch (error) {
          console.error('❌ Failed to load inventory settings:', error);
        } finally {
          setLoading(false);
        }
      };
      loadThreshold();
    }, []);

    const saveThreshold = async (newThreshold) => {
      try {
        await settingsAPI.updateInventorySettings({ low_stock_threshold: newThreshold });
        setThreshold(newThreshold);
        alert('✅ Low stock threshold saved successfully!');
      } catch (error) {
        console.error('❌ Failed to save threshold:', error);
        alert('❌ Failed to save. Please try again.');
      }
    };

    const checkInventory = async () => {
      setChecking(true);
      try {
        const lowStockProducts = [];
        const outOfStockProducts = [];

        products.forEach(product => {
          const hasVariants = product.variants && product.variants.length > 0;
          const stock = hasVariants
            ? getTotalVariantStock(product.variants)
            : (product.stock || 0);

          if (stock === 0) {
            outOfStockProducts.push({ ...product, stock });
          } else if (stock <= threshold && stock > 0) {
            lowStockProducts.push({ ...product, stock });
          }
        });

        // Send notification
        const { notifyAdminLowStockSummary } = await import('../../services/telegram');
        const result = await notifyAdminLowStockSummary(lowStockProducts, outOfStockProducts);

        if (result.success) {
          alert(`✅ Inventory alert sent!\n\n${outOfStockProducts.length} out of stock\n${lowStockProducts.length} low stock`);
        } else {
          alert(`⚠️ ${result.error || 'Failed to send alert'}`);
        }

        setLastCheck(new Date());
      } catch (error) {
        console.error('❌ Failed to check inventory:', error);
        alert('❌ Failed to check inventory. Please try again.');
      } finally {
        setChecking(false);
      }
    };

    // Calculate current inventory status
    const inventoryStatus = useMemo(() => {
      const lowStock = [];
      const outOfStock = [];

      products.forEach(product => {
        const hasVariants = product.variants && product.variants.length > 0;
        const stock = hasVariants
          ? getTotalVariantStock(product.variants)
          : (product.stock || 0);

        if (stock === 0) {
          outOfStock.push({ ...product, stock });
        } else if (stock <= threshold && stock > 0) {
          lowStock.push({ ...product, stock });
        }
      });

      return { lowStock, outOfStock };
    }, [products, threshold]);

    if (loading) {
      return (
        <div className="max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">Loading inventory settings...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Bell className="w-7 h-7 text-orange-600" />
            Inventory Alerts Configuration
          </h3>
          <p className="text-gray-600">
            Configure low stock thresholds and send inventory alerts to admin
          </p>
        </div>

        {/* Threshold Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
            <label className="block text-lg font-bold mb-2 text-orange-900 flex items-center gap-2">
              ⚠️ Low Stock Threshold
            </label>
            <p className="text-sm text-gray-700 mb-4">
              Send alert when product stock falls below or equals this number
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={threshold}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setThreshold(value);
                }}
                onBlur={() => saveThreshold(threshold)}
                className="w-32 px-4 py-3 border-2 border-orange-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                min="0"
                max="1000"
                step="1"
              />
              <span className="text-2xl font-bold text-orange-900">units</span>
              <button
                onClick={() => saveThreshold(threshold)}
                className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Current Inventory Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            Current Inventory Status
          </h4>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-900">Out of Stock</span>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600 mt-2">{inventoryStatus.outOfStock.length}</p>
              <p className="text-xs text-red-700 mt-1">products unavailable</p>
            </div>

            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-900">Low Stock</span>
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{inventoryStatus.lowStock.length}</p>
              <p className="text-xs text-yellow-700 mt-1">≤ {threshold} units remaining</p>
            </div>
          </div>

          {/* Manual Check Button */}
          <button
            onClick={checkInventory}
            disabled={checking}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <RotateCw className="w-5 h-5 animate-spin" />
                Checking Inventory...
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                Send Inventory Alert Now
              </>
            )}
          </button>

          {lastCheck && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Last check: {lastCheck.toLocaleString()}
            </p>
          )}
        </div>

        {/* Product Lists */}
        {(inventoryStatus.outOfStock.length > 0 || inventoryStatus.lowStock.length > 0) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-lg font-bold mb-4">Products Needing Attention</h4>

            {/* Out of Stock Products */}
            {inventoryStatus.outOfStock.length > 0 && (
              <div className="mb-6">
                <h5 className="text-md font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Out of Stock ({inventoryStatus.outOfStock.length})
                </h5>
                <div className="space-y-2">
                  {inventoryStatus.outOfStock.map(product => (
                    <div key={product.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                      <span className="font-medium text-gray-800">{product.name}</span>
                      <span className="text-sm font-bold text-red-600">0 units</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Products */}
            {inventoryStatus.lowStock.length > 0 && (
              <div>
                <h5 className="text-md font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Low Stock ({inventoryStatus.lowStock.length})
                </h5>
                <div className="space-y-2">
                  {inventoryStatus.lowStock.map(product => (
                    <div key={product.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex justify-between items-center">
                      <span className="font-medium text-gray-800">{product.name}</span>
                      <span className="text-sm font-bold text-yellow-600">{product.stock} units</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function SettingsContent() {
    return <div className="bg-white rounded-lg shadow p-6">Settings panel coming soon...</div>;
  }

  // Stat Card Component
  function StatCard({ title, value, icon: Icon, color, bgColor }) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    );
  }
};

export default DesktopAdminPanel;