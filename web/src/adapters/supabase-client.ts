import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cachedClient: SupabaseClient | null = null;

export const isSupabaseConfigured = () => Boolean(url && anonKey);

export const getSupabaseClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase environment variables are not configured.');
  }

  cachedClient = createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
};
