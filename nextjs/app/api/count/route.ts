import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { clientIpFromXff } from '@/lib/clientIp';
import { isAutomated } from '@/lib/analytics/botFilter';
import { berlinDay, countSalt, visitorHash } from '@/lib/analytics/visitorHash';
import { checkRateLimit } from '@/lib/buddy/rateLimit';

/**
 * Consent-free measurement.
 *
 * Why this exists next to GA4 rather than instead of it: GA4 needs consent, and
 * consent is a minority. Measured 20.08.2026, GA saw ~2 users a day against ~6
 * real search arrivals in Search Console - so every GA number was a third of
 * the truth, and nobody could tell which third.
 *
 * Why it needs no banner: TDDDG 25 asks for consent to STORE or READ information
 * on someone's device. This endpoint does neither - the client sends what the
 * request already carries and touches no cookie, no localStorage, no
 * sessionStorage, no fingerprint. What remains is the IP, which is personal data
 * under the GDPR and rides on Art. 6(1)(f): no cross-site profile, never stored
 * raw, named in the privacy policy, and refusable.
 *
 * Same-origin on purpose, like the Sentry tunnel at /monitoring: no third-party
 * host, so no connect-src entry, and ad blockers have nothing to match on.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Events worth a counter. An unknown name is dropped, not stored: this endpoint
 *  is unauthenticated, and without an allowlist anyone could grow the day
 *  document one invented key at a time. */
const EVENTS = new Set([
  'begin_checkout',
  'checkout_already_owned',
  'checkout_error',
  // Der Trichter am Cookie-Dialog. `consent_gate_shown` ist der Nenner, der
  // bis 28.08.2026 fehlte: ohne ihn ist die Zustimmungsquote nur der Anteil an
  // den Antwortenden, und wer den Dialog sieht und geht, taucht nirgends auf.
  // Der Nachweis in consent_records bleibt davon unberuehrt — Rechtsdokument
  // dort, Messung hier.
  'consent_accepted',
  'consent_declined',
  'consent_gate_shown',
  'locked_spot_login_start',
  'locked_spot_opened',
  'locked_spot_pack_clicked',
  // `login` kommt aus welcome/page.tsx und fiel vorher doppelt durch: die
  // Route war ungetrackt UND der Name stand nicht in dieser Liste.
  'login',
  'login_link_sent',
  'login_start',
  'login_view',
  'map_location_invite_accepted',
  'map_location_invite_shown',
  'map_opened',
  'map_view_toggle',
  'must_eat_opened',
  'must_eat_reveal_attempt',
  'purchase',
  'restaurant_maps_clicked',
  'restaurant_menu_clicked',
  'restaurant_opened',
  'restaurant_reservation_clicked',
  'share',
  'sign_up',
  'view_item',
]);

/** Route shapes this site actually serves. Anything else is a scanner probing
 *  for /wp-admin and friends - in the edge logs those arrive with a perfectly
 *  ordinary browser UA, so the UA filter never sees them. */
const PATH = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?){0,4}$/;
const MAX_BODY = 1024;
const DAY_MS = 86_400_000;

/** Two days, not one: a visit just before midnight must still dedupe against
 *  the same person a minute later, and TTL deletion is best-effort anyway. */
const SEEN_TTL_MS = 2 * DAY_MS;

const RATE_LIMITS = { perMinute: 90, perDay: 3000 };

type Body = { path?: unknown; referrer?: unknown; event?: unknown; from?: unknown };

/** Only the host, never the full referring URL - the path someone came from can
 *  carry their search terms, and we have no use for those. */
function referrerHost(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  let host: string;
  try {
    host = new URL(raw).host.toLowerCase();
  } catch {
    return null;
  }
  if (!host || host.endsWith('eatthisdot.com') || host.startsWith('localhost')) return null;
  // Firestore map keys cannot contain dots.
  return host.replace(/\./g, '_').slice(0, 80);
}

function pathKey(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > 120) return null;
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') : '/';
  if (!PATH.test(path)) return null;
  return path.replace(/\./g, '_');
}

export async function POST(request: Request) {
  // A storage-free opt-out: both headers say "do not profile me", and honouring
  // them costs nothing. No cookie needed to remember the choice - the browser
  // re-sends it on every request.
  const gpc = request.headers.get('sec-gpc');
  const dnt = request.headers.get('dnt');
  if (gpc === '1' || dnt === '1') return new NextResponse(null, { status: 204 });

  const userAgent = request.headers.get('user-agent');
  const ip = clientIpFromXff(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  );
  if (isAutomated(userAgent, ip)) return new NextResponse(null, { status: 204 });
  if (!ip) return new NextResponse(null, { status: 204 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new NextResponse(null, { status: 413 });
  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const path = pathKey(body.path);
  if (!path) return new NextResponse(null, { status: 204 });
  const event = typeof body.event === 'string' && EVENTS.has(body.event) ? body.event : null;

  // Local dev talks to the PRODUCTION Firestore (FIREBASE_ADMIN_PROJECT_ID in
  // .env.local is eat-this-8a13b), so without this every `next dev` session
  // would quietly file the developer's own clicks as real traffic — corrupting
  // the exact numbers this endpoint exists to produce. Staging runs a
  // production build and still counts, which is where the write path gets
  // exercised for real.
  if (process.env.NODE_ENV !== 'production') return new NextResponse(null, { status: 204 });

  const day = berlinDay();
  const hash = visitorHash(ip, userAgent ?? '', day, countSalt());

  // The endpoint is unauthenticated, so the abuse guard is the same one the
  // buddy uses - a Firestore-backed window keyed by the hash, never a raw IP.
  const limit = await checkRateLimit(`an:${hash}`, RATE_LIMITS);
  if (!limit.allowed) return new NextResponse(null, { status: 429 });

  const db = getAdminFirestore();
  const inc = FieldValue.increment(1);
  const update: Record<string, unknown> = { day };

  if (event) {
    update.events = { [event]: inc };
  } else {
    // `create` throws when the doc exists, which is exactly the question being
    // asked: is this the first time today? Cheaper than a read plus a write, and
    // atomic across instances.
    //
    // Steht bewusst NUR im Seitenaufruf-Zweig: wer den Platz beansprucht, muss
    // ihn auch verbuchen koennen. Lag das davor, konnte ein Ereignis, das vor
    // dem ersten Seitenaufruf eintrifft, `firstToday` aufbrauchen — gezaehlt
    // wurde es dann nirgends, und der Besucher fehlte im Tagesstand.
    const seen = db.collection('analytics_seen').doc(hash);
    let firstToday = false;
    try {
      await seen.create({ expiresAt: Timestamp.fromMillis(Date.now() + SEEN_TTL_MS) });
      firstToday = true;
    } catch {
      firstToday = false;
    }

    update.pageviews = inc;
    update.paths = { [path]: inc };
    if (firstToday) {
      update.visitors = inc;
      // Die Einstiegsseite — der erste gezaehlte Aufruf eines Besuchers an
      // diesem Tag. GA4 hat so einen Bericht, sieht aber genau die Seiten
      // nicht, auf denen die Suche landet; `paths` allein kann Einstieg und
      // Durchklick nicht trennen. Erst hiermit ist "wo kommen die Leute rein"
      // fuer ALLE Besucher beantwortbar statt nur fuer die Zustimmenden.
      update.entryPaths = { [path]: inc };
    }
    // Die Seite, von der dieser Aufruf kam. Daraus ergibt sich die
    // Ausstiegsseite rein rechnerisch — Ausstiege(P) = paths[P] -
    // continuations[P] — ohne dass je ein Aufruf mit einer Person verknuepft
    // wird. Siehe previousInternalPath() in lib/analytics.ts; dort steht auch,
    // warum es keine Sitzungskennung ist.
    //
    // Genauigkeit: ein harter Reload behaelt den urspruenglichen Referrer, gilt
    // also NICHT als Fortsetzung, und bfcache liefert nicht immer einen
    // frischen. Ausstiege werden dadurch eher ueberschaetzt. Fuer "welche Seite
    // verliert Leute" reicht das; als absolute Zahl nicht zitieren.
    const from = pathKey(body.from);
    if (from) update.continuations = { [from]: inc };

    const host = referrerHost(body.referrer);
    if (host) update.referrers = { [host]: inc };
  }

  await db.collection('analytics_daily').doc(day).set(update, { merge: true });
  return new NextResponse(null, { status: 204 });
}
