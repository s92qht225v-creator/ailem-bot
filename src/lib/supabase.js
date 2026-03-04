import { createClient } from '@supabase/supabase-js';

let _supabase;

// Noop proxy returned when Supabase env vars aren't available (e.g., during build)
const noopChain = new Proxy(() => ({ data: null, error: null }), {
  get() {
    return noopChain;
  },
  apply() {
    return noopChain;
  },
});

function getSupabaseClient() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // During build/static generation, env vars may not be available
      return noopChain;
    }

    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// Proxy that lazily initializes supabase on first property access
// This prevents errors during Next.js build/static generation
export const supabase = new Proxy({}, {
  get(_, prop) {
    return getSupabaseClient()[prop];
  },
});
