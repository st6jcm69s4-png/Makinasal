import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Sunucu tarafında herkese açık verileri okumak için (oturumsuz) Supabase istemcisi. */
export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Read the request session for owner/moderator previews; RLS still decides access. */
export async function getRequestSupabase():Promise<SupabaseClient|null>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;
 const jar=await cookies();return createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll:()=>{/* Session refresh cookies are maintained by the browser/auth endpoints. */}}});
}
