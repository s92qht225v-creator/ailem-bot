import { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';
import { loadFromLocalStorage, saveToLocalStorage } from '../../../utils/helpers';
import { settingsAPI } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';

const BonusSettingsSection = () => {
  const [bonusConfig, setBonusConfig] = useState({
    referralCommission: 10,
    purchaseBonus: 10,
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
};

export default BonusSettingsSection;
