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
        <h3 className="a-muted" style={{ fontSize: 16, fontWeight: 650, marginBottom: 16 }}>Daromad umumiy ko'rinishi</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="a-kpi">
            <div className="flex items-center justify-between">
              <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500 }}>Umumiy daromad</p>
              <div className="a-kpi-ico text-green-500" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="a-kpi-val">{formatPrice(analytics.totalRevenue)}</p>
            <div className="mt-2 flex items-center gap-1">
              {analytics.revenueGrowth >= 0 ? (
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--ok)' }} />
              ) : (
                <TrendingDown className="w-4 h-4" style={{ color: 'var(--danger)' }} />
              )}
              <span style={{ fontSize: 13, fontWeight: 500, color: analytics.revenueGrowth >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
                {analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth.toFixed(1)}%
              </span>
              <span className="a-faint" style={{ fontSize: 12 }}>o'tgan oyga nisbatan</span>
            </div>
          </div>

          <div className="a-kpi">
            <div className="flex items-center justify-between">
              <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500 }}>Bu oy</p>
              <div className="a-kpi-ico" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="a-kpi-val">{formatPrice(analytics.monthRevenue)}</p>
            <p className="a-faint" style={{ fontSize: 13, marginTop: 8 }}>{analytics.monthOrdersCount} buyurtma</p>
          </div>

          <div className="a-kpi">
            <div className="flex items-center justify-between">
              <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500 }}>Bu hafta</p>
              <div className="a-kpi-ico text-purple-500" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="a-kpi-val">{formatPrice(analytics.weekRevenue)}</p>
            <p className="a-faint" style={{ fontSize: 13, marginTop: 8 }}>{analytics.weekOrdersCount} buyurtma</p>
          </div>

          <div className="a-kpi">
            <div className="flex items-center justify-between">
              <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500 }}>O'rtacha buyurtma qiymati</p>
              <div className="a-kpi-ico text-orange-500" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <p className="a-kpi-val">{formatPrice(analytics.avgOrderValue)}</p>
            <p className="a-faint" style={{ fontSize: 13, marginTop: 8 }}>Har bir buyurtma uchun</p>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="a-card">
        <div className="a-card-h"><h3>So'nggi 7 kunlik daromad</h3></div>
        <div className="space-y-4" style={{ padding: 16 }}>
          {chartData.map((day, index) => {
            const maxRevenue = Math.max(...chartData.map(d => d.revenue));
            const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="a-muted" style={{ fontWeight: 500 }}>{day.date}</span>
                  <span className="a-num" style={{ fontWeight: 600, color: 'var(--text)' }}>{formatPrice(day.revenue)}</span>
                </div>
                <div className="rounded-full h-3" style={{ width: '100%', background: 'var(--accent-weak)' }}>
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${percentage}%`, background: 'linear-gradient(to right, var(--accent), var(--accent-ink))' }}
                  ></div>
                </div>
                <p className="a-faint" style={{ fontSize: 12 }}>{day.orders} buyurtma</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order & Customer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="a-card">
          <div className="a-card-h"><h3>Buyurtma statistikasi</h3></div>
          <div className="space-y-4" style={{ padding: 16 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-green-600" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="a-muted">Bajarilgan</span>
              </div>
              <span className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{analytics.totalOrders}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-yellow-600" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className="a-muted">Kutilmoqda</span>
              </div>
              <span className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{analytics.pendingOrdersCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="a-muted">Tasdiqlangan</span>
              </div>
              <span className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{analytics.ordersByStatus.approved}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-purple-600" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                  <Truck className="w-5 h-5" />
                </div>
                <span className="a-muted">Jo'natilgan</span>
              </div>
              <span className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{analytics.ordersByStatus.shipped}</span>
            </div>
          </div>
        </div>

        <div className="a-card">
          <div className="a-card-h"><h3>Mijoz ko'rsatkichlari</h3></div>
          <div className="space-y-4" style={{ padding: 16 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-indigo-600" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                  <UsersIcon className="w-5 h-5" />
                </div>
                <span className="a-muted">Jami mijozlar</span>
              </div>
              <span className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{analytics.totalCustomers}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-teal-600" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="a-muted">Konversiya darajasi</span>
              </div>
              <span className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{analytics.conversionRate.toFixed(1)}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-pink-600" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                  <Gift className="w-5 h-5" />
                </div>
                <span className="a-muted">Jami takliflar</span>
              </div>
              <span className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{analytics.totalReferrals}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-orange-600" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
                  <UsersIcon className="w-5 h-5" />
                </div>
                <span className="a-muted">Faol taklif qiluvchilar</span>
              </div>
              <span className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{analytics.usersWithReferrals}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="a-card">
        <div className="a-card-h"><h3>Eng ko'p sotilgan mahsulotlar</h3></div>
        <div style={{ padding: 16 }}>
        {analytics.topProducts.length > 0 ? (
          <div className="space-y-4">
            {analytics.topProducts.map((product, index) => (
              <div key={product.productId} className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(to bottom right, var(--accent), var(--accent-ink))' }}>
                      #{index + 1}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{product.name}</p>
                      <p className="a-faint" style={{ fontSize: 13, margin: 0 }}>{product.quantity} dona sotildi</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="a-num" style={{ fontWeight: 700, color: 'var(--text)', margin: 0 }}>{formatPrice(product.revenue)}</p>
                    <p className="a-faint" style={{ fontSize: 13, margin: 0 }}>Daromad</p>
                  </div>
                </div>

                {product.variants && product.variants.length > 0 && (
                  <div className="px-4 pb-4">
                    <p className="a-faint" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Top variantlar:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {product.variants.slice(0, 4).map((variant, vIdx) => (
                        <div key={vIdx} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <span className="a-muted" style={{ fontSize: 12 }}>{variant.label}</span>
                          <span className="a-num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{variant.quantity} sotildi</span>
                        </div>
                      ))}
                    </div>
                    {product.variants.length > 4 && (
                      <p className="a-faint" style={{ fontSize: 12, marginTop: 8 }}>+{product.variants.length - 4} ta variant</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="a-faint" style={{ textAlign: 'center', padding: '32px 0' }}>Hozircha savdo ma'lumotlari yo'q</p>
        )}
        </div>
      </div>

      {/* Inventory Alerts */}
      {(analytics.lowStockProducts > 0 || analytics.outOfStockProducts > 0) && (
        <div className="rounded-lg p-6" style={{ background: 'var(--warn-weak)', border: '1px solid var(--warn)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: 'var(--warn)' }} />
            <div className="flex-1">
              <h3 style={{ fontSize: 16, fontWeight: 650, marginBottom: 8, color: 'var(--text)' }}>Ombor ogohlantirishlari</h3>
              <div className="space-y-2">
                {analytics.outOfStockProducts > 0 && (
                  <p className="a-muted">
                    <strong style={{ color: 'var(--text)' }}>{analytics.outOfStockProducts}</strong> ta mahsulot tugagan
                  </p>
                )}
                {analytics.lowStockProducts > 0 && (
                  <p className="a-muted">
                    <strong style={{ color: 'var(--text)' }}>{analytics.lowStockProducts}</strong> ta mahsulot kam qoldi (&lt;10 dona)
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
