import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { searchParams, pathname } = req.nextUrl;

  // Apex → www 308 redirect. Firebase App Hosting passes the real host via
  // x-forwarded-host; fall back to the Host header for local dev.
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  if (host === 'eatthisdot.com') {
    const url = req.nextUrl.clone();
    url.host = 'www.eatthisdot.com';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  const legacyLang = searchParams.get('lang');

  // Legacy ?lang=en / ?lang=de — honor explicit intent, overriding any cookie.
  if (legacyLang === 'en' || legacyLang === 'de') {
    const url = req.nextUrl.clone();
    url.searchParams.delete('lang');
    if (legacyLang === 'en' && !pathname.startsWith('/en')) {
      url.pathname = `/en${pathname === '/' ? '' : pathname}`;
    } else if (legacyLang === 'de' && pathname.startsWith('/en')) {
      url.pathname = pathname.slice(3) || '/';
    }
    const res = NextResponse.redirect(url, 308);
    res.cookies.set('NEXT_LOCALE', legacyLang, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  return intlMiddleware(req);
}

export const config = {
  // Match all request paths except static assets, API routes, and Next internals.
  matcher: [
    '/((?!api|_next|_vercel|css|js|pics|fonts|welcome|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
