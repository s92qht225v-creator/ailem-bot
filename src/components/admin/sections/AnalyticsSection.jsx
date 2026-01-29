import { useContext } from 'react';
import {
  DollarSign, Calendar, ShoppingBag, TrendingUp, TrendingDown,
  CheckCircle, Clock, Truck, Users as UsersIcon, Gift, AlertTriangle
} from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { formatPrice } from '../../../utils/helpers';
import { calculateAnalytics, getRevenueChartData } from '../../../utils/analytics';

const AnalyticsSection = () => {
  const { orders, users, products } = useContext(AdminContext);
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
              <Calendar className="w-5 h-5 text-accent" />
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
                    className="bg-gradient-to-r from-accent to-red-700 h-3 rounded-full transition-all"
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
                  <ShoppingBag className="w-5 h-5 text-accent" />
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
                    <div className="w-10 h-10 bg-gradient-to-br from-accent to-red-700 rounded-lg flex items-center justify-center text-white font-bold">
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
};

export default AnalyticsSection;
