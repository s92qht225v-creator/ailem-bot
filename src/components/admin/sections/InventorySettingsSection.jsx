import { useState, useEffect, useContext, useMemo } from 'react';
import { Bell, Save, BarChart3, AlertCircle, AlertTriangle, RotateCw } from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { settingsAPI } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { getTotalVariantStock } from '../../../utils/variants';

const InventorySettingsSection = () => {
  const { products } = useContext(AdminContext);
  const [threshold, setThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const loadThreshold = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        const settingsPromise = settingsAPI.getSettings();

        const settings = await Promise.race([settingsPromise, timeoutPromise]);
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
      toast.success('Kam zaxira chegarasi muvaffaqiyatli saqlandi!');
    } catch (error) {
      console.error('❌ Failed to save threshold:', error);
      toast.error('Saqlashda xatolik. Qayta urinib ko\'ring.');
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

      const { notifyAdminLowStockSummary } = await import('../../../services/telegram');
      const result = await notifyAdminLowStockSummary(lowStockProducts, outOfStockProducts);

      if (result.success) {
        toast.success(`Zaxira ogohlantirishi yuborildi! ${outOfStockProducts.length} ta tugagan, ${lowStockProducts.length} ta kam zaxira`);
      } else {
        toast.warning(result.error || 'Ogohlantirishni yuborishda xatolik');
      }

      setLastCheck(new Date());
    } catch (error) {
      console.error('❌ Failed to check inventory:', error);
      toast.error('Zaxirani tekshirishda xatolik. Qayta urinib ko\'ring.');
    } finally {
      setChecking(false);
    }
  };

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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Bell className="w-7 h-7 text-orange-600" />
          Inventory Alerts Configuration
        </h3>
        <p className="text-gray-600">
          Configure low stock thresholds and send inventory alerts to admin
        </p>
      </div>

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
              onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
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

        <button
          onClick={checkInventory}
          disabled={checking}
          className="w-full py-3 bg-accent text-white rounded-lg hover:bg-red-800 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {(inventoryStatus.outOfStock.length > 0 || inventoryStatus.lowStock.length > 0) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-bold mb-4">Products Needing Attention</h4>

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
};

export default InventorySettingsSection;
