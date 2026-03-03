import { useContext, useEffect, useRef, useState } from 'react';
import { UserContext } from '../../context/UserContext';

const LoginPage = ({ onNavigate, returnTo }) => {
  const { loginWithTelegram } = useContext(UserContext);
  const widgetRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load Telegram Login Widget script
    if (!widgetRef.current) return;

    // Clean any previous widget
    widgetRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'ailemuz_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.async = true;

    // Global callback for the widget
    window.onTelegramAuth = async (telegramUser) => {
      setLoading(true);
      setError(null);
      try {
        await loginWithTelegram(telegramUser);
        // Navigate back to where user was or to home
        onNavigate(returnTo || 'home');
      } catch (err) {
        setError(err.message || 'Kirish xatoligi. Qayta urinib ko\'ring.');
      } finally {
        setLoading(false);
      }
    };

    widgetRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [loginWithTelegram, onNavigate, returnTo]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        {/* Logo */}
        <h1 className="text-3xl font-bold text-primary mb-2">Ailem</h1>
        <p className="text-gray-500 text-sm mb-8">Uy tekstillari do'koni</p>

        {/* Login heading */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Tizimga kirish</h2>
        <p className="text-gray-500 text-sm mb-6">
          Telegram orqali kiring va bonus ball to'plang, buyurtmalar tarixini ko'ring
        </p>

        {/* Telegram Widget */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <span className="ml-3 text-gray-600">Kirish...</span>
          </div>
        ) : (
          <div ref={widgetRef} className="flex justify-center mb-6" />
        )}

        {error && (
          <p className="text-error text-sm mb-4">{error}</p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">yoki</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Continue as guest */}
        <button
          onClick={() => onNavigate(returnTo || 'home')}
          className="w-full py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
        >
          Mehmon sifatida davom etish
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
