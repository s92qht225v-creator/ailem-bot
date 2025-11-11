import { createClient } from '@supabase/supabase-js';

// Admin client with service role key - bypasses RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for admin');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Simple admin authentication
export function authenticateAdmin(req) {
  const adminPassword = req.headers['x-admin-password'];
  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envPassword) {
    throw new Error('ADMIN_PASSWORD not configured');
  }

  if (adminPassword !== envPassword) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }

  return true;
}
