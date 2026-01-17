import { useContext } from 'react';
import { DollarSign, Clock, Package, Star, Plus, CheckCircle } from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { formatPrice } from '../../../utils/helpers';
import { StatCard } from '../shared';

const DashboardSection = ({ onNavigate }) => {
  const { products, orders, reviews } = useContext(AdminContext);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const pendingReviews = reviews?.filter(r => !r.approved).length || 0;
  const totalRevenue = orders
    .filter(o => o.status === 'approved' || o.status === 'shipped')
    .reduce((sum, order) => sum + order.total, 0);

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
              onClick={() => onNavigate('products')}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
            >
              <Plus className="w-5 h-5 text-purple-600" />
              <span>Add New Product</span>
            </button>
            <button
              onClick={() => onNavigate('orders')}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
            >
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Review Pending Orders ({pendingOrders})</span>
            </button>
            <button
              onClick={() => onNavigate('reviews')}
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
};

export default DashboardSection;
