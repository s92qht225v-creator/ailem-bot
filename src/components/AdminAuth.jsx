import { useState, useContext, useEffect, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import DesktopAdminPanel from './pages/DesktopAdminPanel';
import AdminPanel from './pages/AdminPanel';

const AdminAuth = ({ children, onAuthSuccess }) => {
  const { user } = useContext(UserContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Start with true to check existing session
  const [isDesktop, setIsDesktop] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const initialCheckDone = useRef(false);

  // Check for existing Supabase session on mount
  useEffect(() => {
    let mounted = true;
    
    const checkSession = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setLoading(false);
          return;
        }
        
        if (!session) {
          setLoading(false);
          return;
        }
        
        // Verify user is in admin_users table
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (!mounted) return;
        
        if (adminError || !adminData) {
          console.log('User is not an admin');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        
        // User is authenticated and is admin
        setAdminUser(adminData);
        setIsAuthenticated(true);
        setLoading(false);
        initialCheckDone.current = true;
      } catch (err) {
        if (!mounted) return;
        console.error('Error checking session:', err);
        setLoading(false);
        initialCheckDone.current = true;
      }
    };
    
    checkSession();
    
    // Listen for auth state changes (skip INITIAL_SESSION event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip initial session event to prevent duplicate checks
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      // Only process changes after initial check is done
      if (!initialCheckDone.current) {
        return;
      }
      
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setAdminUser(null);
      } else if (event === 'SIGNED_IN' && session) {
        // Verify admin status
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (!mounted) return;
        
        if (adminData) {
          setAdminUser(adminData);
          setIsAuthenticated(true);
        } else {
          await supabase.auth.signOut();
          setError('You are not authorized as an admin');
        }
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        console.error('Login error:', authError);
        setError(authError.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      // Verify user is in admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (adminError || !adminData) {
        console.error('Not an admin:', adminError);
        setError('You are not authorized as an admin');
        // Sign out if not admin
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Success - user is authenticated and is an admin
      setAdminUser(adminData);
      setIsAuthenticated(true);
      
      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setAdminUser(null);
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="admin@ailem.uz"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-primary hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Authenticating...' : 'Login to Admin Panel'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="text-xs text-gray-500">
            Secure authentication powered by Supabase Auth
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <strong>ℹ️ Setup Required:</strong><br />
              1. Run add-admin-auth.sql in Supabase<br />
              2. Create admin user in Supabase Dashboard<br />
              3. Login with admin credentials
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;