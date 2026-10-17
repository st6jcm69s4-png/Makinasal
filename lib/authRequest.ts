import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
export function authRequest(request: NextRequest, response: NextResponse) {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!url || !key) throw new Error("Auth unavailable");
 return createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items: { name: string; value: string; options: CookieOptions }[]) => items.forEach(c => response.cookies.set(c.name, c.value, c.options)) } });
}
export function sameOrigin(request: NextRequest) { return request.headers.get("origin") === request.nextUrl.origin; }
