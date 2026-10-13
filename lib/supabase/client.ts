import { createBrowserClient } from '@supabase/ssr';

/** Tarayıcı için Supabase istemcisi. Ortam değişkenleri yoksa null döner (site çökmesin). */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
