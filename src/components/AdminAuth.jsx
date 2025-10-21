import { useState, useContext, useEffect } from 'react';
import { UserContext } from '../context/UserContext';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/helpers';
import DesktopAdminPanel from './pages/DesktopAdminPanel';
import AdminPanel from './pages/AdminPanel';

const AdminAuth = ({ children, onAuthSuccess }) => {
  const { user } = useContext(UserContext);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Check authentication after component mounts
  useEffect(() => {
    const authData = loadFromLocalStorage('adminAuth');
    if (authData && authData.expires > Date.now() && authData.userId === user?.id) {
      setIsAuthenticated(true);
    }
  }, [user?.id]);

  // Detect screen size for responsive admin panel after mount
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
      }
    };
    
    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Admin passwords configuration (in production, move to environment variables)
  const ADMIN_PASSWORDS = {
    'demo-1': 'admin123',
    // Add more admin users and their passwords here
    // For Telegram users, you can use their Telegram ID
  };

  // Alternative: Use a single master password for all admins
  const MASTER_ADMIN_PASSWORD = 'ailem2024!';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if user is authorized to be admin
      const userSpecificPassword = ADMIN_PASSWORDS[user?.id];
      const isValidPassword = password === userSpecificPassword || password === MASTER_ADMIN_PASSWORD;

      if (!isValidPassword) {
        setError('Invalid admin password');
        setLoading(false);
        return;
      }

      // Set authentication with 24-hour expiry
      const authData = {
        userId: user?.id,
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      saveToLocalStorage('adminAuth', authData);
      
      setIsAuthenticated(true);
      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    localStorage.removeItem('adminAuth');
  };

  // If already authenticated, render appropriate admin panel
  if (isAuthenticated) {
    if (isDesktop) {
      // Desktop version with built-in logout
      return <DesktopAdminPanel onLogout={handleLogout} />;
    } else {
      // Mobile version with logout button
      return (
        <div>
          {/* Admin logout button */}
          <div className="fixed top-16 right-4 z-50">
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
              title="Logout from admin panel"
            >
              🚪 Logout
            </button>
          </div>
          {children || <AdminPanel />}
        </div>
      );
    }
  }

  // Show login form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
          <p className="text-gray-600 text-sm mt-2">
            Enter admin password to access the panel
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="Enter admin password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-primary hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Authenticating...' : 'Login to Admin Panel'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="text-xs text-gray-500">
            Current User: <span className="font-medium">{user?.name || 'Unknown'}</span>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              <strong>Dev Mode:</strong> Demo user password: "admin123" | Master password: "ailem2024!"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;