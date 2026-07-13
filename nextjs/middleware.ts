import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { isStaging } from '@/lib/env';
import { REFERRER_COOKIE, COOKIE_MAX_AGE, UID_SHAPE } from '@/lib/referral/constants';
import { GONE_SLUGS, NEWS_REDIRECTS } from '@/lib/seo/legacyRedirects';

const intlMiddleware = createMiddleware(routing);
const INTERNAL_LOCALE_HEADER = 'x-eat-this-internal-locale';
const STAGING_AUTH_COOKIE = '__Host-eatthis_staging_auth';
const STAGING_AUTH_COOKIE_MAX_AGE = 60 * 60 * 12;

// 410 body for permanently closed spots. No inline CSS (CSP forbids it) —
// plain semantic HTML; crawlers read the 410 status, humans get a link home.
const GONE_HTML = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Nicht mehr verfügbar – Eat This</title></head><body><h1>Dieser Spot ist dauerhaft geschlossen</h1><p>Die Seite gibt es nicht mehr. Entdecke andere Berliner Spots:</p><p><a href="https://www.eatthisdot.com/">Zur Startseite</a></p></body></html>`;

function basicAuthChallenge(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Staging"',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function isValidBasicAuth(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Basic ')) return false;
  const expectedUser = process.env.STAGING_BASIC_AUTH_USER;
  const expectedPass = process.env.STAGING_BASIC_AUTH_PASS;
  if (!expectedUser || !expectedPass) return false;
  try {
    const bytes = Uint8Array.from(atob(authHeader.slice(6)), (char) => char.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const [user, ...passParts] = decoded.split(':');
    return user === expectedUser && passParts.join(':') === expectedPass;
  } catch {
    return false;
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function stagingAuthToken(): Promise<string | null> {
  const user = process.env.STAGING_BASIC_AUTH_USER;
  const pass = process.env.STAGING_BASIC_AUTH_PASS;
  if (!user || !pass) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pass),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`eat-this-staging-auth:v1:${user}`),
  );
  return toBase64Url(signature);
}

async function getStagingAccess(req: NextRequest): Promise<{
  allowed: boolean;
  cookieToSet: string | null;
}> {
  const token = await stagingAuthToken();
  if (!token) return { allowed: false, cookieToSet: null };

  const existingCookie = req.cookies.get(STAGING_AUTH_COOKIE)?.value;
  const hasValidCookie = Boolean(existingCookie && constantTimeEqual(existingCookie, token));
  const hasValidBasicAuth = isValidBasicAuth(req.headers.get('authorization'));

  return {
    allowed: hasValidCookie || hasValidBasicAuth,
    cookieToSet: hasValidBasicAuth && !hasValidCookie ? token : null,
  };
}

export default async function middleware(req: NextRequest) {
  const { searchParams, pathname } = req.nextUrl;
  let stagingCookieToSet: string | null = null;

  const finalizeResponse = (response: NextResponse): NextResponse => {
    if (!isStaging) return response;

    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (stagingCookieToSet) {
      response.cookies.set(STAGING_AUTH_COOKIE, stagingCookieToSet, {
        path: '/',
        maxAge: STAGING_AUTH_COOKIE_MAX_AGE,
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
    }
    return response;
  };

  // Staging gate — runs before any other logic. Signed webhook paths stay
  // reachable for Stripe and Sanity, which cannot send Basic Auth headers.
  // Localhost exempt so `npm run dev` with NEXT_PUBLIC_ENV=staging doesn't
  // prompt for credentials on every page load.
  const reqHost = req.headers.get('host') ?? '';
  const isLocalhost = reqHost.startsWith('localhost') || reqHost.startsWith('127.0.0.1');
  const isSignedWebhook =
    pathname === '/api/stripe/webhook' || pathname === '/api/revalidate';
  if (isStaging && !isLocalhost && !isSignedWebhook) {
    const access = await getStagingAccess(req);
    if (!access.allowed) {
      return basicAuthChallenge();
    }
    stagingCookieToSet = access.cookieToSet;
  }

  // API routes must pass through untouched after the staging gate. Page
  // requests continue into locale routing below.
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return finalizeResponse(NextResponse.next());
  }

  // Apex → www 308 redirect. Firebase App Hosting passes the real host via
  // x-forwarded-host; fall back to the Host header for local dev.
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  if (host === 'eatthisdot.com') {
    const url = req.nextUrl.clone();
    url.host = 'www.eatthisdot.com';
    url.protocol = 'https:';
    url.port = '';
    return finalizeResponse(NextResponse.redirect(url, 308));
  }

  // Our DE public URLs are unprefixed, but the App Router still needs the
  // internal `/de` segment. Only internal rewrites carry this private header;
  // public `/de/...` requests below still get canonicalized to unprefixed URLs.
  const isInternalDeRewrite = req.headers.get(INTERNAL_LOCALE_HEADER) === 'de';
  if (isInternalDeRewrite && (pathname === '/de' || pathname.startsWith('/de/'))) {
    return finalizeResponse(NextResponse.next());
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
    return finalizeResponse(res);
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
    return finalizeResponse(redirect);
  }

  // Post-rebuild legacy URL cleanup (2026-06 re-slug). Static cases only —
  // accent/split restaurant redirects need the DB and live in the route.
  {
    const isEn = pathname === '/en' || pathname.startsWith('/en/');
    const rest = isEn ? pathname.slice(3) || '/' : pathname;
    const prefix = isEn ? '/en' : '';

    const gone = rest.match(/^\/restaurant\/([^/]+)\/?$/);
    if (gone && GONE_SLUGS.has(gone[1])) {
      return finalizeResponse(new NextResponse(GONE_HTML, {
        status: 410,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }));
    }

    const news = rest.match(/^\/news\/([^/]+)\/?$/);
    if (news && NEWS_REDIRECTS[news[1]]) {
      const url = req.nextUrl.clone();
      url.search = '';
      url.pathname = `${prefix}${NEWS_REDIRECTS[news[1]]}`;
      return finalizeResponse(NextResponse.redirect(url, 308));
    }
  }

  if (pathname === '/de' || pathname.startsWith('/de/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    const redirect = NextResponse.redirect(url, 308);
    redirect.cookies.set('NEXT_LOCALE', 'de', { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return finalizeResponse(redirect);
  }

  // The public DE routes are unprefixed (`/`, `/must-eats`, …), but the App
  // Router page tree lives below `[locale]`. Rewrite DE requests ourselves and
  // mark the internal pass so `as-needed` canonicalization doesn't loop.
  if (!pathname.startsWith('/en')) {
    const url = req.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${pathname === '/' ? '' : pathname}`;
    const headers = new Headers(req.headers);
    headers.set(INTERNAL_LOCALE_HEADER, routing.defaultLocale);
    const res = NextResponse.rewrite(url, { request: { headers } });
    res.cookies.set('NEXT_LOCALE', routing.defaultLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return finalizeResponse(res);
  }

  const res = intlMiddleware(req);

  return finalizeResponse(res);
}

export const config = {
  // Match all request paths except static assets and Next internals. API routes
  // are included so staging's Basic Auth gate cannot be bypassed through them.
  // `__` exempts the Firebase Auth helper proxy (/__/auth/*, see rewrites() in
  // next.config.ts) from locale routing and redirects.
  matcher: [
    '/((?!_next|_vercel|__|css|js|pics|fonts|welcome|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
