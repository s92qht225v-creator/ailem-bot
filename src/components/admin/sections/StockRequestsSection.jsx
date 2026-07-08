import { useState, useEffect } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../context/ToastContext';
import { formatPrice } from '../../../utils/helpers';

const StockRequestsSection = () => {
  const [stockRequests, setStockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchStockRequests();
  }, []);

  const fetchStockRequests = async () => {
    try {
      setLoading(true);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('stock_notifications')
        .select(`
          *,
          users:user_id (
            id,
            name,
            phone,
            telegram_id
          ),
          products:product_id (
            id,
            name,
            image,
            price
          )
        `)
        .eq('notified', false)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) throw error;

      const grouped = {};
      (data || []).forEach(request => {
        const productId = request.product_id;
        if (!grouped[productId]) {
          grouped[productId] = {
            product: request.products,
            requests: []
          };
        }
        grouped[productId].requests.push(request);
      });

      setStockRequests(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching stock requests:', error);
      if (!error.message?.includes('does not exist')) {
        toast.error('Zaxira so\'rovlarini yuklashda xatolik');
      }
      setStockRequests([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RotateCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (stockRequests.length === 0) {
    return (
      <div className="a-card p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-3)' }} />
        <h3 className="a-muted" style={{ fontSize: 16, fontWeight: 650, marginBottom: 8 }}>Zaxira so'rovlari yo'q</h3>
        <p className="a-faint">
          Hozircha tugagan mahsulotlarni kutayotgan mijozlar yo'q.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-6 text-white" style={{ background: 'linear-gradient(to right, var(--accent), var(--warn))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-1">
              {stockRequests.reduce((sum, item) => sum + item.requests.length, 0)} ta kutayotgan mijoz
            </h3>
            <p className="text-white/90">
              {stockRequests.length} ta mahsulotda kutilayotgan so'rov bor
            </p>
          </div>
          <AlertCircle className="w-16 h-16 text-white/30" />
        </div>
      </div>

      <div className="a-card">
        <div className="overflow-x-auto">
          <table className="a-table">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Kutmoqda</th>
                <th>Narxi</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {stockRequests.map((item) => (
                <>
                  <tr key={item.product.id}>
                    <td>
                      <div className="flex items-center">
                        {item.product.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-12 h-12 rounded object-cover mr-3"
                          />
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.product.name}</div>
                          <div className="a-faint" style={{ fontSize: 12 }}>ID: {item.product.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="a-pill a-pill-danger">
                        {item.requests.length} ta mijoz
                      </span>
                    </td>
                    <td className="a-num" style={{ color: 'var(--text)' }}>
                      {formatPrice(item.product.price)}
                    </td>
                    <td>
                      <button
                        onClick={() => setExpandedProduct(expandedProduct === item.product.id ? null : item.product.id)}
                        style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 13 }}
                      >
                        {expandedProduct === item.product.id ? 'Mijozlarni yashirish' : 'Mijozlarni ko\'rish'}
                      </button>
                    </td>
                  </tr>
                  {expandedProduct === item.product.id && (
                    <tr>
                      <td colSpan="4" style={{ background: 'var(--surface-2)' }}>
                        <div className="space-y-2">
                          <h4 style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Kutayotgan mijozlar:</h4>
                          {item.requests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                              <div className="flex-1">
                                <div style={{ fontWeight: 500, color: 'var(--text)' }}>{request.users?.name || 'Noma\'lum'}</div>
                                <div className="a-muted" style={{ fontSize: 13 }}>{request.users?.phone || 'Telefon yo\'q'}</div>
                                {request.variant_color && (
                                  <div className="a-faint" style={{ fontSize: 12, marginTop: 4 }}>
                                    Variant: {request.variant_color}
                                    {request.variant_size && ` / ${request.variant_size}`}
                                  </div>
                                )}
                                <div className="a-faint" style={{ fontSize: 12, marginTop: 4 }}>
                                  So'ralgan: {new Date(request.created_at).toLocaleDateString('uz-UZ')}
                                </div>
                              </div>
                              <div className="a-faint" style={{ fontSize: 12 }}>
                                Telegram: {request.users?.telegram_id || 'N/A'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ background: 'var(--info-weak)', border: '1px solid var(--info)' }}>
        <div className="flex">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--info)' }} />
          <div className="a-muted" style={{ fontSize: 13 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Qanday ishlaydi:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Mijozlar tugagan mahsulotlarda "Kelganda xabar berish" tugmasini bosadi</li>
              <li>Mahsulotni zaxiraga qo'shganingizda barcha kutayotgan mijozlar Telegram orqali avtomatik xabardor qilinadi</li>
              <li>Qaysi mahsulotni birinchi zaxiraga qo'shishni belgilash uchun ushbu ro'yxatdan foydalaning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockRequestsSection;
