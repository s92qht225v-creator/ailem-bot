import { useContext } from 'react';
import { DollarSign, Clock, Package, Star, Plus, CheckCircle } from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { formatPrice, getStatusLabel } from '../../../utils/helpers';
import { calculateAnalytics } from '../../../utils/analytics';
import { StatCard } from '../shared';

const DashboardSection = ({ onNavigate }) => {
  const { products, orders, reviews, users } = useContext(AdminContext);

  // Single source of truth: reuse the same revenue/order logic as AnalyticsSection
  // (previously the Dashboard omitted 'delivered' orders and under-reported revenue)
  const analytics = calculateAnalytics(orders, users, products);
  const totalRevenue = analytics.totalRevenue;
  const pendingOrders = analytics.pendingOrdersCount;
  const pendingReviews = reviews?.filter(r => !r.approved).length || 0;

  const pillClass = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'approved' || s === 'delivered' || s === 'completed') return 'a-pill-ok';
    if (s === 'pending') return 'a-pill-warn';
    if (s === 'rejected') return 'a-pill-danger';
    return 'a-pill-info';
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Umumiy daromad"
          value={formatPrice(totalRevenue)}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          title="Kutilayotgan buyurtmalar"
          value={pendingOrders}
          icon={Clock}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          title="Mahsulotlar"
          value={products.length}
          icon={Package}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          title="Kutilayotgan sharhlar"
          value={pendingReviews}
          icon={Star}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="a-card">
          <div className="a-card-h"><h3>So'nggi buyurtmalar</h3></div>
          <div>
            {orders.slice(0, 5).map((order, i) => (
              <div key={order.id} className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < Math.min(orders.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <p className="a-num" style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12.5, color: 'var(--text)', margin: 0 }}>#{order.id}</p>
                  <p className="a-faint" style={{ fontSize: 12, margin: '2px 0 0' }}>{order.userName}</p>
                </div>
                <div className="text-right" style={{ flex: 'none' }}>
                  <p className="a-num" style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{formatPrice(order.total)}</p>
                  <span className={`a-pill ${pillClass(order.status)}`} style={{ marginTop: 4 }}>{getStatusLabel(order.status)}</span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="a-faint" style={{ textAlign: 'center', padding: '32px 0', fontSize: 13 }}>Hozircha buyurtmalar yo'q</p>
            )}
          </div>
        </div>

        <div className="a-card">
          <div className="a-card-h"><h3>Tezkor amallar</h3></div>
          <div style={{ padding: 8 }}>
            <button onClick={() => onNavigate('products')} className="a-nav">
              <Plus style={{ width: 17, height: 17, flex: 'none' }} />
              <span className="flex-1 text-left">Yangi mahsulot qo'shish</span>
            </button>
            <button onClick={() => onNavigate('orders')} className="a-nav">
              <CheckCircle style={{ width: 17, height: 17, flex: 'none' }} />
              <span className="flex-1 text-left">Kutilayotgan buyurtmalarni ko'rish</span>
              <span className="a-count">{pendingOrders}</span>
            </button>
            <button onClick={() => onNavigate('reviews')} className="a-nav">
              <Star style={{ width: 17, height: 17, flex: 'none' }} />
              <span className="flex-1 text-left">Mijozlar sharhlarini ko'rish</span>
              <span className="a-count">{pendingReviews}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;
