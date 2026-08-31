import { NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';
import { sendMagicLinkEmail } from '@/lib/auth/sendMagicLink';
import { isStaging } from '@/lib/env';
import { REFERRER_COOKIE, UID_SHAPE } from '@/lib/referral/constants';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only ever hand Firebase a continue URL that points back at our own app.
// `continueUrl` arrives from the client (and the Stripe webhook) — an
// unvalidated value would let this endpoint mint sign-in links that bounce
// the user off to an arbitrary destination after authenticating.
function sanitizeContinueUrl(raw: string | undefined, origin: string, fallback: string): string {
  if (!raw) return fallback;
  let candidate: URL;
  try {
    candidate = new URL(raw, origin);
  } catch {
    return fallback;
  }
  const allowedOrigins = new Set(
    [
      origin,
      process.env.NEXT_PUBLIC_APP_URL,
      ...(isStaging ? [] : ['https://www.eatthisdot.com']),
    ].filter(Boolean) as string[]
  );
  if (allowedOrigins.has(candidate.origin)) return candidate.toString();
  if (/^https?:\/\/localhost(:\d+)?$/.test(candidate.origin)) return candidate.toString();
  return fallback;
}

/** Ein einzelner Cookie aus dem rohen Header. Kein NextRequest hier: die
 *  Route nimmt ein blankes `Request` entgegen, und das soll sie auch. */
function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Den Einladenden mit in die Continue-URL legen.
 *
 * Der `pending_referrer`-Cookie liegt in dem Browser, der den Einladungslink
 * angeklickt hat. Die Anmeldung schliesst aber routinemaessig in einem
 * ANDEREN ab — die Gmail-App reicht den Link an ihren eigenen Webview weiter.
 * Dort gibt es keinen Cookie, /api/referral/confirm findet keinen Einladenden
 * und legt still auf: die Einladung war weg, ohne dass irgendwo ein Fehler
 * stand. Beide Seiten gingen leer aus, beide ohne Meldung.
 *
 * Die Continue-URL ist der einzige Traeger, der den Posteingang ueberlebt.
 * Die Mailadresse (`e`, sendMagicLink) und der Spot-Claim (`claim`,
 * loginContinueUrl) fahren aus genau diesem Grund schon dort mit, und
 * postSignInTarget beschreibt den Browser-Sprung ausdruecklich — nur der
 * Einladende sass noch im Cookie fest.
 *
 * Der Parameter ist `ref`, derselbe, den die Einladung selbst benutzt: beim
 * Landen greift die Middleware erneut und setzt den Cookie ein zweites Mal,
 * diesmal im richtigen Browser. Alles dahinter bleibt unveraendert.
 *
 * Ein vom Client mitgeschickter `ref` wird verworfen, nicht ergaenzt. Er
 * oeffnete nichts, was ein Aufruf von `/?ref=<uid>` nicht auch oeffnet — aber
 * die Quelle ist hier der Cookie, nicht der Request-Body.
 */
function withReferrer(continueUrl: string, cookieHeader: string | null): string {
  let url: URL;
  try {
    url = new URL(continueUrl);
  } catch {
    return continueUrl;
  }
  url.searchParams.delete('ref');
  const referrer = readCookie(cookieHeader, REFERRER_COOKIE);
  if (referrer && UID_SHAPE.test(referrer)) url.searchParams.set('ref', referrer);
  return url.toString();
}

export async function POST(request: Request) {
  let body: { email?: string; locale?: string; continueUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }

  // Abuse guard — this endpoint is unauthenticated and sends real email via
  // Resend. Matches the per-email + per-IP limits the Cloud Functions use.
  const ip = clientIp(request);
  const [emailOk, ipOk] = await Promise.all([
    checkRateLimit(`magic-link:email:${email}`, 3, 60 * 60 * 1000),
    checkRateLimit(`magic-link:ip:${ip}`, 10, 60 * 60 * 1000),
  ]);
  if (!emailOk || !ipOk) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get('origin') ||
    'https://www.eatthisdot.com';

  // /welcome owns the post-sign-in destination (Home) — the continue URL is
  // only Firebase's required link target plus the carrier params: `e` for the
  // email address and `ref` for the inviter.
  const continueUrl = withReferrer(
    sanitizeContinueUrl(body.continueUrl, origin, `${origin}/`),
    request.headers.get('cookie')
  );

  // Static /pics/email assets are intentionally outside the staging Basic
  // Auth matcher. Keep staging mail on its own host; never fall back to the
  // production site from a staging request.
  const emailAssetBase = process.env.EMAIL_ASSET_BASE_URL || origin;

  const result = await sendMagicLinkEmail({ email, continueUrl, appUrl: emailAssetBase });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
