import { parseAuthOptions } from "./accountSecurity";
export async function getAuthOptions() {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!url || !key) throw new Error("Auth unavailable");
 const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(10000) });
 if (!response.ok) throw new Error("Auth unavailable");
 return parseAuthOptions(await response.json());
}
