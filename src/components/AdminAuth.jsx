import { useState, useContext, useEffect, useRef } from 'react';
import { t } from "../utils/translation-fallback";
import { UserContext } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import DesktopAdminPanel from './pages/DesktopAdminPanel';

const AdminAuth = ({ children, onAuthSuccess }) => {
  const { user } = useContext(UserContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Start with true to check existing session
  const [adminUser, setAdminUser] = useState(null);
  const initialCheckDone = useRef(false);
  const isAuthenticatedRef = useRef(false); // Track auth state for closure

  // Check for existing Supabase session on mount
  useEffect(() => {
    let mounted = true;
    let fallbackTimer;

    const checkSession = async () => {
      try {
        // Shorter timeout (5 seconds) to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );

        // Get current session with timeout
        let sessionResult;
        try {
          sessionResult = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise
          ]);
        } catch (timeoutErr) {
          console.warn('Session check timed out, showing login form');
          if (mounted) {
            setLoading(false);
            initialCheckDone.current = true;
          }
          return;
        }

        const { data: { session }, error: sessionError } = sessionResult;

        if (!mounted) return;

        if (sessionError) {
          console.error('Session error:', sessionError);
          setLoading(false);
          initialCheckDone.current = true;
          return;
        }

        if (!session) {
          console.log('No active session');
          setLoading(false);
          initialCheckDone.current = true;
          return;
        }

        console.log('Session found, checking admin status...');

        // Verify user is in admin_users table with timeout
        let adminResult;
        try {
          adminResult = await Promise.race([
            supabase
              .from('admin_users')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Admin check timeout')), 5000)
            )
          ]);
        } catch (timeoutErr) {
          console.warn('Admin check timed out');
          if (mounted) {
            setLoading(false);
            initialCheckDone.current = true;
          }
          return;
        }

        const { data: adminData, error: adminError } = adminResult;

        if (!mounted) return;

        if (adminError) {
          console.error('Admin check error:', adminError);
          await supabase.auth.signOut().catch(() => {});
          setLoading(false);
          initialCheckDone.current = true;
          return;
        }

        if (!adminData) {
          console.log('User is not an admin');
          await supabase.auth.signOut().catch(() => {});
          setLoading(false);
          initialCheckDone.current = true;
          return;
        }

        // User is authenticated and is admin
        console.log('Admin authenticated');
        setAdminUser(adminData);
        setIsAuthenticated(true);
        isAuthenticatedRef.current = true;
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

    // Fallback: if still loading after 6 seconds, force show login form
    fallbackTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth check taking too long, forcing login screen');
        setLoading(false);
        initialCheckDone.current = true;
      }
    }, 6000);

    // Listen for auth state changes (skip events that shouldn't trigger re-auth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip events that shouldn't trigger re-verification
      // USER_UPDATED can fire during storage operations
      // SIGNED_IN can fire multiple times during operations
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        console.log('Skipping auth event:', event);
        return;
      }
      
      // Skip SIGNED_IN if already authenticated (prevents duplicate processing)
      if (event === 'SIGNED_IN' && isAuthenticatedRef.current) {
        console.log('Already authenticated, skipping SIGNED_IN event');
        return;
      }

      // Only process changes after initial check is done
      if (!initialCheckDone.current) {
        return;
      }

      // If already authenticated, don't re-verify on every event (use ref for current value)
      if (isAuthenticatedRef.current && event !== 'SIGNED_OUT') {
        console.log('Already authenticated, skipping re-verification for event:', event);
        return;
      }

      console.log('Auth state changed:', event, session?.user?.email);

      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        isAuthenticatedRef.current = false;
        setAdminUser(null);
      } else if (event === 'SIGNED_IN' && session && !isAuthenticatedRef.current) {
        // Only verify admin status on fresh sign-in
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (!mounted) return;

        if (adminData) {
          setAdminUser(adminData);
          setIsAuthenticated(true);
          isAuthenticatedRef.current = true;
        } else {
          await supabase.auth.signOut();
          setError('You are not authorized as an admin');
        }
      }
    });
    
    return () => {
      mounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
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

  // If already authenticated, render admin panel
  if (isAuthenticated) {
    return <DesktopAdminPanel onLogout={handleLogout} />;
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
            <div className="mt-2 p-2 bg-red-50 border border-blue-200 rounded text-xs text-blue-700">
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