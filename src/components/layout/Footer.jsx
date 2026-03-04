import { t } from '../../utils/translation-fallback';
import { MessageCircle } from 'lucide-react';

const Footer = ({ onNavigate }) => {
  return (
    <footer className="bg-primary text-white hidden lg:block">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h4 className="text-lg font-bold mb-4">Ailem</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t('footer.about') || 'Uy-ro\'zg\'or uchun sifatli to\'qimachilik mahsulotlari. O\'zbekistonning ishonchli onlayn do\'koni.'}
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="https://t.me/ailem_uz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Telegram"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com/ailem.uz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-lg font-bold mb-4">{t('footer.navigation') || 'Navigatsiya'}</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('home')} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {t('nav.home')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop')} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {t('nav.shop')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('favorites')} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {t('nav.favorites')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('orderHistory')} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {t('nav.orders')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('profile')} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {t('nav.profile')}
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-4">{t('footer.contact') || 'Aloqa'}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Telegram: @ailem_uz</li>
              <li>Instagram: @ailem.uz</li>
            </ul>
            <div className="mt-4">
              <h5 className="text-sm font-semibold mb-2">{t('footer.paymentMethods') || 'To\'lov usullari'}</h5>
              <p className="text-sm text-gray-400">Payme, Click, Uzcard, Humo</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Ailem. {t('footer.allRightsReserved') || 'Barcha huquqlar himoyalangan.'}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
