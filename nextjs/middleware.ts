import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { isStaging } from '@/lib/env';
import { REFERRER_COOKIE, COOKIE_MAX_AGE, UID_SHAPE } from '@/lib/referral/constants';

const intlMiddleware = createMiddleware(routing);

function basicAuthChallenge(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Staging"' },
  });
}

function isValidBasicAuth(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Basic ')) return false;
  const expectedUser = process.env.STAGING_BASIC_AUTH_USER;
  const expectedPass = process.env.STAGING_BASIC_AUTH_PASS;
  if (!expectedUser || !expectedPass) return false;
  try {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const [user, ...passParts] = decoded.split(':');
    return user === expectedUser && passParts.join(':') === expectedPass;
  } catch {
    return false;
  }
}

export default function middleware(req: NextRequest) {
  const { searchParams, pathname } = req.nextUrl;

  // Staging gate — runs before any other logic. Webhook paths exempt so
  // Stripe (which can't send Basic Auth headers) can still deliver events.
  // Localhost exempt so `npm run dev` with NEXT_PUBLIC_ENV=staging doesn't
  // prompt for credentials on every page load.
  const reqHost = req.headers.get('host') ?? '';
  const isLocalhost = reqHost.startsWith('localhost') || reqHost.startsWith('127.0.0.1');
  if (isStaging && !isLocalhost && !pathname.startsWith('/api/stripe/webhook')) {
    if (!isValidBasicAuth(req.headers.get('authorization'))) {
      return basicAuthChallenge();
    }
  }

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

  // Referral capture — ?ref=<inviterUid>. Strip the param (clean URL, 308
  // like ?lang) and, if it's a plausible uid, set a 30-day HttpOnly cookie
  // that /api/referral/confirm consumes after the friend signs up.
  const ref = searchParams.get('ref');
  if (ref !== null) {
    const url = req.nextUrl.clone();
    url.searchParams.delete('ref');
    const redirect = NextResponse.redirect(url, 308);
    if (UID_SHAPE.test(ref)) {
      redirect.cookies.set(REFERRER_COOKIE, ref, {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      });
    }
    return redirect;
  }

  const res = intlMiddleware(req);

  // Staging: tell every crawler to ignore everything, even if robots.txt
  // got bypassed.
  if (isStaging) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return res;
}

export const config = {
  // Match all request paths except static assets, API routes, and Next
  // internals. `__` exempts the Firebase Auth helper proxy (/__/auth/*,
  // see rewrites() in next.config.ts) from locale routing and redirects.
  matcher: [
    '/((?!api|_next|_vercel|__|css|js|pics|fonts|welcome|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
