import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Sunucu tarafında herkese açık verileri okumak için (oturumsuz) Supabase istemcisi. */
export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
