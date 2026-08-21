import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { clientIpFromXff } from '@/lib/clientIp';
import { berlinDay, countSalt, visitorHash } from '@/lib/analytics/visitorHash';
import { checkRateLimit } from '@/lib/buddy/rateLimit';
import { parseConsentBody } from '@/lib/consentRecord';

/**
 * The consent log — Art. 7(1) DSGVO, "the controller shall be able to
 * demonstrate that the data subject has consented".
 *
 * Until this existed the only trace of an answer was a cookie in the visitor's
 * own browser, which proves nothing: it carries no timestamp, no version of
 * the question, and the user can change it. GA4 was running on consent nobody
 * could evidence.
 *
 * What a row holds is deliberately thin: the browser's opaque consent id, the
 * answer, which version of the dialog produced it, the language it was read
 * in, and a server timestamp. No IP, no user agent, no hash of either. The id
 * plus the cookie in the visitor's browser is what ties a row to a person if
 * it is ever disputed — that is the whole job, and anything more would be
 * collecting personal data to prove we asked before collecting personal data.
 *
 * Append-only: withdrawing consent writes a new row rather than editing the
 * old one, so the log shows the sequence. These rows must NOT get a TTL — they
 * have to outlive the consent they document.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 512;
const RATE_LIMITS = { perMinute: 10, perDay: 100 };

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new NextResponse(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const record = parseConsentBody(body);
  if (!record) return new NextResponse(null, { status: 400 });

  // Same reason as /api/count: local dev talks to the PRODUCTION Firestore, so
  // without this every `next dev` reload would file developer clicks as real
  // consent. Staging runs a production build and does write, which is where
  // the path gets exercised for real.
  if (process.env.NODE_ENV !== 'production') return new NextResponse(null, { status: 204 });

  // Unauthenticated, so it needs the same abuse guard the rest of the site
  // uses — keyed on a daily-salted hash, never a raw IP, and the IP is used
  // for nothing else here.
  const ip = clientIpFromXff(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  );
  if (ip) {
    const hash = visitorHash(ip, request.headers.get('user-agent') ?? '', berlinDay(), countSalt());
    const limit = await checkRateLimit(`cs:${hash}`, RATE_LIMITS);
    if (!limit.allowed) return new NextResponse(null, { status: 429 });
  }

  await getAdminFirestore()
    .collection('consent_records')
    .add({
      consentId: record.id,
      value: record.value,
      version: record.version,
      locale: record.locale,
      // Server clock, not the browser's: a timestamp the visitor could set is
      // not evidence of anything.
      createdAt: FieldValue.serverTimestamp(),
    });

  return new NextResponse(null, { status: 204 });
}
