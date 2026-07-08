import { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';
import { loadFromLocalStorage, saveToLocalStorage } from '../../../utils/helpers';
import { settingsAPI } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';

const BonusSettingsSection = () => {
  const [bonusConfig, setBonusConfig] = useState({
    referralCommission: 3,
    purchaseBonus: 1,
    currency: 'UZS'
  });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        const settingsPromise = settingsAPI.getSettings();

        const settings = await Promise.race([settingsPromise, timeoutPromise]);
        if (settings?.bonus_config) {
          setBonusConfig({
            ...bonusConfig,
            ...settings.bonus_config
          });
          saveToLocalStorage('bonusConfig', settings.bonus_config);
        } else {
          const saved = loadFromLocalStorage('bonusConfig');
          if (saved) {
            setBonusConfig(saved);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load bonus config:', error);
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

    try {
      await settingsAPI.updateBonusConfig({
        purchaseBonus: newConfig.purchaseBonus,
        referralCommission: newConfig.referralCommission
      });
      toast.success('Bonus sozlamalari muvaffaqiyatli saqlandi!');
    } catch (error) {
      console.error('❌ Failed to save bonus config to database:', error);
      toast.error('Sozlamalarni saqlashda xatolik. Qayta urinib ko\'ring.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="a-card" style={{ padding: 24, textAlign: 'center' }}>
          <p className="a-muted">Bonus sozlamalari yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="a-card">
        <div className="a-card-h">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Bonus va mukofotlar sozlamalari
          </h3>
        </div>

        <div className="grid gap-6" style={{ padding: 24 }}>
          {/* Referral Commission */}
          <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 'var(--a-r)', border: '1px solid var(--border)' }}>
            <label className="block text-lg mb-2 flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--text)' }}>
              🎁 Taklif komissiyasi foizi
            </label>
            <p className="text-sm mb-4 a-muted">
              Taklif qilingan foydalanuvchining birinchi buyurtmasi tasdiqlanganda taklif qilgan shaxsga o'tkaziladigan buyurtma summasining foizi
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={bonusConfig.referralCommission}
                onChange={(e) => saveBonusConfig({ ...bonusConfig, referralCommission: parseInt(e.target.value) || 0 })}
                className="a-input"
                style={{ width: 128, fontSize: 18, fontWeight: 600 }}
                min="0"
                max="100"
                step="1"
              />
              <span className="text-2xl" style={{ fontWeight: 700, color: 'var(--text)' }}>%</span>
            </div>
            <div className="mt-4" style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--a-r-sm)', border: '1px solid var(--border)' }}>
              <p className="text-sm a-muted">
                <strong>Misol:</strong> 100,000 so'mlik buyurtmada taklif qilgan shaxs{' '}
                <span style={{ fontWeight: 700, color: 'var(--info)' }}>
                  {(100000 * bonusConfig.referralCommission / 100).toLocaleString()} so'm
                </span>{' '}
                ishlaydi
              </p>
            </div>
          </div>

          {/* Purchase Bonus */}
          <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 'var(--a-r)', border: '1px solid var(--border)' }}>
            <label className="block text-lg mb-2 flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--text)' }}>
              💰 Xarid bonusi foizi
            </label>
            <p className="text-sm mb-4 a-muted">
              Barcha foydalanuvchilarga bonus ball sifatida beriladigan xarid summasining foizi
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={bonusConfig.purchaseBonus}
                onChange={(e) => saveBonusConfig({ ...bonusConfig, purchaseBonus: parseInt(e.target.value) || 0 })}
                className="a-input"
                style={{ width: 128, fontSize: 18, fontWeight: 600 }}
                min="0"
                max="100"
                step="1"
              />
              <span className="text-2xl" style={{ fontWeight: 700, color: 'var(--text)' }}>%</span>
            </div>
            <div className="mt-4" style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--a-r-sm)', border: '1px solid var(--border)' }}>
              <p className="text-sm a-muted">
                <strong>Misol:</strong> 100,000 so'mlik xarid ={' '}
                <span style={{ fontWeight: 700, color: 'var(--ok)' }}>
                  {(100000 * bonusConfig.purchaseBonus / 100).toLocaleString()} so'm
                </span>{' '}
                bonus ball
              </p>
            </div>
          </div>

          {/* Info Card */}
          <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 'var(--a-r)', border: '1px solid var(--border)' }}>
            <h4 className="text-base mb-3 flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--text)' }}>
              <span className="text-2xl">ℹ️</span> Qanday ishlaydi
            </h4>
            <ul className="text-sm space-y-2 a-muted">
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
                <span>
                  <strong>Taklif komissiyasi:</strong> Taklif qilingan foydalanuvchi birinchi buyurtmasini berib, u tasdiqlanganda
                  taklif qilgan shaxs buyurtma summasining {bonusConfig.referralCommission}% ini komissiya sifatida oladi
                  (masalan, 100,000 so'mlik buyurtma = {(100000 * bonusConfig.referralCommission / 100).toLocaleString()} so'm komissiya)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--ok)', fontWeight: 700 }}>•</span>
                <span>
                  <strong>Xarid bonusi:</strong> Barcha foydalanuvchilar xaridining {bonusConfig.purchaseBonus}% ini bonus ball sifatida oladi
                  (masalan, 100,000 so'm = {(100000 * bonusConfig.purchaseBonus / 100).toLocaleString()} so'm ball)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--info)', fontWeight: 700 }}>•</span>
                <span>Taklif komissiyalari ball emas, to'g'ridan-to'g'ri pul sifatida to'lanadi</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--warn)', fontWeight: 700 }}>•</span>
                <span>Ushbu sozlamalar darhol kuchga kiradi va barcha kelgusi tranzaksiyalarga ta'sir qiladi</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonusSettingsSection;
