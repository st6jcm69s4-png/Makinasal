import { NextResponse, type NextRequest } from 'next/server';

// Uygulamadan açılan bağlantılar ?lang=tr|en|de taşır: dili çereze yazar ve parametresiz adrese yönlendirir.
export function middleware(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang');
  if (lang !== 'tr' && lang !== 'en' && lang !== 'de') return NextResponse.next();
  const url = request.nextUrl.clone();
  url.searchParams.delete('lang');
  const response = NextResponse.redirect(url);
  response.cookies.set('makinasal-language', lang, { path: '/', maxAge: 31536000, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' });
  return response;
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
