import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { safeAuthNext } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeAuthNext(request.nextUrl.searchParams.get('next'));
  const response = NextResponse.redirect(new URL(next, request.url));
  response.headers.set('Cache-Control', 'no-store');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (code && url && key) {
    try {
      const supabase = createServerClient(url, key, { cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      } });
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return response;
    } catch { /* Return an actionable error without leaking tokens. */ }
  }
  const failed = NextResponse.redirect(new URL('/giris?auth_error=1', request.url));
  failed.headers.set('Cache-Control', 'no-store');
  return failed;
}
