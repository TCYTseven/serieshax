import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase client configuration
 * Uses service role key for backend operations (full access)
 */

let supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client instance (singleton)
 * Uses service role key for full backend access, falls back to anon key
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = env.SUPABASE_URL;
  // Prefer service role key, but fall back to anon key for tables without RLS
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '❌ Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('📦 Supabase client initialized');
  return supabaseClient;
}

/**
 * Get Supabase client or null if not configured
 * Use this when Supabase is optional
 */
export function getSupabaseClientSafe(): SupabaseClient | null {
  try {
    return getSupabaseClient();
  } catch {
    console.warn('⚠️ Supabase not configured, some features will be disabled');
    return null;
  }
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));
}

// Export a lazy-loaded supabase instance
export const supabase = {
  get client() {
    return getSupabaseClient();
  },
  get safeClient() {
    return getSupabaseClientSafe();
  },
  isConfigured: isSupabaseConfigured,
};
