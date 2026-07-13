import { NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';
import { sendMagicLinkEmail } from '@/lib/auth/sendMagicLink';
import { isStaging } from '@/lib/env';

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
    ].filter(Boolean) as string[],
  );
  if (allowedOrigins.has(candidate.origin)) return candidate.toString();
  if (/^https?:\/\/localhost(:\d+)?$/.test(candidate.origin)) return candidate.toString();
  return fallback;
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
  // only Firebase's required link target plus the `e` email carrier param.
  const continueUrl = sanitizeContinueUrl(body.continueUrl, origin, `${origin}/`);

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
