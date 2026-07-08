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
        <div className="a-card" style={{ padding: 24, textAlign: 'center' }}>
          <p className="a-muted">Ombor sozlamalari yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="a-card" style={{ padding: 24 }}>
        <h3 className="text-2xl mb-2 flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--text)' }}>
          <Bell className="w-6 h-6" style={{ color: 'var(--warn)' }} />
          Ombor ogohlantirishlari sozlamalari
        </h3>
        <p className="a-muted">
          Kam zaxira chegaralarini sozlang va adminga ombor ogohlantirishlarini yuboring
        </p>
      </div>

      <div className="a-card" style={{ padding: 24 }}>
        <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 'var(--a-r)', border: '1px solid var(--border)' }}>
          <label className="block text-lg mb-2 flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--text)' }}>
            ⚠️ Kam zaxira chegarasi
          </label>
          <p className="text-sm mb-4 a-muted">
            Mahsulot zaxirasi shu songa teng yoki undan past bo'lganda ogohlantirish yuboriladi
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
              onBlur={() => saveThreshold(threshold)}
              className="a-input"
              style={{ width: 128, fontSize: 18, fontWeight: 600 }}
              min="0"
              max="1000"
              step="1"
            />
            <span className="text-2xl" style={{ fontWeight: 700, color: 'var(--text)' }}>dona</span>
            <button
              onClick={() => saveThreshold(threshold)}
              className="a-btn a-btn-primary"
              style={{ marginLeft: 16 }}
            >
              <Save className="w-4 h-4 inline mr-2" />
              Saqlash
            </button>
          </div>
        </div>
      </div>

      <div className="a-card" style={{ padding: 24 }}>
        <h4 className="text-lg mb-4 flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--text)' }}>
          <BarChart3 className="w-5 h-5 a-muted" />
          Joriy ombor holati
        </h4>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div style={{ padding: 16, background: 'var(--danger-weak)', border: '1px solid var(--border)', borderRadius: 'var(--a-r-sm)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ fontWeight: 500, color: 'var(--danger)' }}>Tugagan</span>
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />
            </div>
            <p className="text-3xl mt-2 a-num" style={{ fontWeight: 700, color: 'var(--danger)' }}>{inventoryStatus.outOfStock.length}</p>
            <p className="text-xs mt-1 a-muted">mahsulot mavjud emas</p>
          </div>

          <div style={{ padding: 16, background: 'var(--warn-weak)', border: '1px solid var(--border)', borderRadius: 'var(--a-r-sm)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ fontWeight: 500, color: 'var(--warn)' }}>Kam qolgan</span>
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--warn)' }} />
            </div>
            <p className="text-3xl mt-2 a-num" style={{ fontWeight: 700, color: 'var(--warn)' }}>{inventoryStatus.lowStock.length}</p>
            <p className="text-xs mt-1 a-muted">≤ {threshold} dona qolgan</p>
          </div>
        </div>

        <button
          onClick={checkInventory}
          disabled={checking}
          className="a-btn a-btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
        >
          {checking ? (
            <>
              <RotateCw className="w-5 h-5 animate-spin" />
              Ombor tekshirilmoqda...
            </>
          ) : (
            <>
              <Bell className="w-5 h-5" />
              Ombor ogohlantirishini hozir yuborish
            </>
          )}
        </button>

        {lastCheck && (
          <p className="text-sm mt-2 text-center a-faint">
            Oxirgi tekshiruv: {lastCheck.toLocaleString()}
          </p>
        )}
      </div>

      {(inventoryStatus.outOfStock.length > 0 || inventoryStatus.lowStock.length > 0) && (
        <div className="a-card" style={{ padding: 24 }}>
          <h4 className="text-lg mb-4" style={{ fontWeight: 700, color: 'var(--text)' }}>E'tibor talab qiladigan mahsulotlar</h4>

          {inventoryStatus.outOfStock.length > 0 && (
            <div className="mb-6">
              <h5 className="text-md mb-2 flex items-center gap-2" style={{ fontWeight: 600, color: 'var(--danger)' }}>
                <AlertCircle className="w-4 h-4" />
                Tugagan ({inventoryStatus.outOfStock.length})
              </h5>
              <div className="space-y-2">
                {inventoryStatus.outOfStock.map(product => (
                  <div key={product.id} style={{ padding: 12, background: 'var(--danger-weak)', border: '1px solid var(--border)', borderRadius: 'var(--a-r-sm)' }} className="flex justify-between items-center">
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>{product.name}</span>
                    <span className="text-sm a-num" style={{ fontWeight: 700, color: 'var(--danger)' }}>0 dona</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inventoryStatus.lowStock.length > 0 && (
            <div>
              <h5 className="text-md mb-2 flex items-center gap-2" style={{ fontWeight: 600, color: 'var(--warn)' }}>
                <AlertTriangle className="w-4 h-4" />
                Kam qolgan ({inventoryStatus.lowStock.length})
              </h5>
              <div className="space-y-2">
                {inventoryStatus.lowStock.map(product => (
                  <div key={product.id} style={{ padding: 12, background: 'var(--warn-weak)', border: '1px solid var(--border)', borderRadius: 'var(--a-r-sm)' }} className="flex justify-between items-center">
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>{product.name}</span>
                    <span className="text-sm a-num" style={{ fontWeight: 700, color: 'var(--warn)' }}>{product.stock} dona</span>
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
