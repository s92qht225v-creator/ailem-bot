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
        <RotateCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (stockRequests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Zaxira so'rovlari yo'q</h3>
        <p className="text-gray-600">
          Hozircha tugagan mahsulotlarni kutayotgan mijozlar yo'q.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-lg shadow-lg p-6 text-white">
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

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahsulot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kutmoqda</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narxi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockRequests.map((item) => (
                <>
                  <tr key={item.product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {item.product.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-12 h-12 rounded object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                          <div className="text-xs text-gray-500">ID: {item.product.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.requests.length} ta mijoz
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatPrice(item.product.price)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => setExpandedProduct(expandedProduct === item.product.id ? null : item.product.id)}
                        className="text-primary hover:text-primary-dark font-medium"
                      >
                        {expandedProduct === item.product.id ? 'Mijozlarni yashirish' : 'Mijozlarni ko\'rish'}
                      </button>
                    </td>
                  </tr>
                  {expandedProduct === item.product.id && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 bg-gray-50">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-900 mb-3">Kutayotgan mijozlar:</h4>
                          {item.requests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between bg-white p-3 rounded border">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{request.users?.name || 'Noma\'lum'}</div>
                                <div className="text-sm text-gray-600">{request.users?.phone || 'Telefon yo\'q'}</div>
                                {request.variant_color && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Variant: {request.variant_color}
                                    {request.variant_size && ` / ${request.variant_size}`}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                  So'ralgan: {new Date(request.created_at).toLocaleDateString('uz-UZ')}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
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

      <div className="bg-red-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="w-5 h-5 text-accent mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Qanday ishlaydi:</p>
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
