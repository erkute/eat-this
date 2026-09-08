import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { clientIpFromXff } from '@/lib/clientIp';
import { isAutomated } from '@/lib/analytics/botFilter';
import { hasNoCountCookie } from '@/lib/analytics/noCount';
import { berlinDay, countSalt, visitorHash } from '@/lib/analytics/visitorHash';
import { pathKey } from '@/lib/analytics/pathKey';
import {
  dayKeys,
  keyWithinBudget,
  OVERFLOW_HOST,
  OVERFLOW_PATH,
} from '@/lib/analytics/dayKeyBudget';
import { checkWindowedRateLimit } from '@/lib/rateLimitWindow';

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
 *  document one invented key at a time.
 *
 *  Dieselbe Gefahr galt fuer `paths`, `entryPaths`, `continuations` und
 *  `referrers` — die nahmen bis 08.09.2026 jeden Schluessel an. Sie haben jetzt
 *  ihren eigenen Riegel: lib/analytics/pathKey.ts laesst nur echte Routen
 *  durch, lib/analytics/dayKeyBudget.ts deckelt, wie viele es werden. */
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
  // `login` kommt aus welcome/page.tsx und fiel vorher doppelt durch: die
  // Route war ungetrackt UND der Name stand nicht in dieser Liste.
  'login',
  'login_link_sent',
  'login_start',
  // `login_start`, aufgefaechert nach `method` (lib/analytics.ts,
  // qualifiedCountName): die beiden echten Anmeldewege …
  'login_start_google',
  'login_start_email_link',
  // … und die Anlaesse, die das Anmeldeformular oeffnen — eine verdeckte
  // Karte im Startseiten-Teaser, die Starter-Pack-Tafel im Karten-Sheet.
  'login_start_home_covered_card',
  'login_start_starter_pack_banner',
  'login_start_starter_pack_existing_user',
  'login_view',
  'map_location_invite_accepted',
  'map_location_invite_shown',
  'map_opened',
  'map_view_toggle',
  'must_eat_opened',
  'must_eat_reveal_attempt',
  // `must_eat_reveal_attempt`, aufgefaechert nach `result`
  // (useMustEatDetailState.ts). Ohne diese Namen war der Tipp auf einen
  // Kartenruecken eine einzige Zahl — dabei ist `login_required` der Weg ins
  // Konto und `unlocked` die Karte, die vor Ort umgedreht wurde.
  'must_eat_reveal_login_required',
  'must_eat_reveal_location_requested',
  'must_eat_reveal_location_missing',
  'must_eat_reveal_too_far',
  'must_eat_reveal_unlocked',
  'must_eat_reveal_failed',
  'purchase',
  'restaurant_maps_clicked',
  'restaurant_menu_clicked',
  'restaurant_opened',
  'restaurant_reservation_clicked',
  'share',
  'sign_up',
  // Das Starter Pack (20 Karten) ist eingeloest — die Antwort der Route
  // /api/starter-pack, gezaehlt im ReferralToastListener. Einmal pro Konto.
  'starter_pack_granted',
  'view_item',
]);

const MAX_BODY = 1024;
/** Laenger ist kein Browser. */
const UA_MAX = 300;
const DAY_MS = 86_400_000;

/** Two days, not one: a visit just before midnight must still dedupe against
 *  the same person a minute later, and TTL deletion is best-effort anyway. */
const SEEN_TTL_MS = 2 * DAY_MS;

/** Je Besucher — Zweck ist Fairness zwischen Geraeten hinter einer Adresse. */
const RATE_LIMITS = { perMinute: 90, perDay: 3000 };
/** Je Adresse, ohne User-Agent. Der Riegel darueber haengt am Besucher-Hash,
 *  und in den geht `body.ua` ein: ein Angreifer musste nur bei jeder Anfrage
 *  einen neuen UA-String schicken und bekam einen frischen Schluessel. Damit
 *  war er wirkungslos — je Anfrage ein Dokument in `analytics_seen`, und
 *  `visitors` beliebig aufblasbar. Dieser hier kennt den UA nicht.
 *
 *  Grosszuegig, weil hinter einer Carrier-NAT viele echte Leute sitzen: 6000
 *  Aufrufe am Tag von EINER Adresse hat diese Seite nie gesehen. */
const IP_RATE_LIMITS = { perMinute: 240, perDay: 6000 };

type Body = { path?: unknown; referrer?: unknown; event?: unknown; from?: unknown; ua?: unknown };

/**
 * Der User-Agent aus dem Body, nicht aus dem Header — der Header ist hier
 * wertlos. Die App-Hosting-Edge ersetzt ihn, bevor die Anfrage den Origin
 * erreicht (siehe lib/analytics.ts, `userAgent()`): `isAutomated` sah in
 * Produktion nie einen Bot und liess Bingbot, Baidu-Render und den
 * Azure-Crawler als Besucher durch. Der Header bleibt als Rueckfall fuer
 * Umgebungen, die ihn durchreichen (Staging-Build lokal, Tests).
 */
function userAgentOf(body: Body, header: string | null): string | null {
  if (typeof body.ua === 'string' && body.ua.trim()) return body.ua.slice(0, UA_MAX);
  return header;
}

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

export async function POST(request: Request) {
  // A storage-free opt-out: both headers say "do not profile me", and honouring
  // them costs nothing. No cookie needed to remember the choice - the browser
  // re-sends it on every request.
  const gpc = request.headers.get('sec-gpc');
  const dnt = request.headers.get('dnt');
  if (gpc === '1' || dnt === '1') return new NextResponse(null, { status: 204 });
  // Der eigene Browser des Betreibers, per Knopf in /admin/stats abgemeldet —
  // dieselbe Wirkung wie GPC, nur ohne Browser-Erweiterung.
  if (hasNoCountCookie(request.headers.get('cookie'))) {
    return new NextResponse(null, { status: 204 });
  }

  const ip = clientIpFromXff(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  );
  if (!ip) return new NextResponse(null, { status: 204 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new NextResponse(null, { status: 413 });
  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const userAgent = userAgentOf(body, request.headers.get('user-agent'));
  if (isAutomated(userAgent)) return new NextResponse(null, { status: 204 });

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

  // Zwei Riegel, und die Reihenfolge ist die Aussagekraft: der an der Adresse
  // ist der einzige, den der Aufrufer nicht selbst verstellen kann.
  //
  // Fehlerpolitik `allow`: ein Beacon ist kein Grund, aus einer
  // Firestore-Stoerung einen Vorfall zu machen. Die Schreibvorgaenge unten
  // fangen ihr eigenes Scheitern ab — der Aufrufer bekommt in jedem Fall 204.
  const ipLimit = await checkWindowedRateLimit(
    `an-ip:${visitorHash(ip, '', day, countSalt())}`,
    IP_RATE_LIMITS,
    'allow'
  );
  if (!ipLimit.allowed) return new NextResponse(null, { status: 429 });
  const limit = await checkWindowedRateLimit(`an:${hash}`, RATE_LIMITS, 'allow');
  if (!limit.allowed) return new NextResponse(null, { status: 429 });

  const db = getAdminFirestore();
  const dayRef = db.collection('analytics_daily').doc(day);
  const inc = FieldValue.increment(1);
  const update: Record<string, unknown> = { day };

  if (event) {
    update.events = { [event]: inc };
  } else {
    // Die Schluessel, die heute schon im Dokument stehen — hoechstens einmal je
    // Minute und Instanz gelesen. Ohne diese Sicht kann der Zaehler nicht
    // wissen, ob ein Pfad neu ist, und damit auch nicht, wann Schluss ist.
    // Nur dieser Zweig braucht sie: `events` steht auf einer Allowlist und
    // kennt keine freien Schluessel.
    const known = await dayKeys(day, async () => (await dayRef.get()).data());
    const budgeted = (map: 'paths' | 'entryPaths' | 'continuations', key: string) =>
      keyWithinBudget(known, map, key, OVERFLOW_PATH);

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
    update.paths = { [budgeted('paths', path)]: inc };
    if (firstToday) {
      update.visitors = inc;
      // Die Einstiegsseite — der erste gezaehlte Aufruf eines Besuchers an
      // diesem Tag. GA4 hat so einen Bericht, sieht aber genau die Seiten
      // nicht, auf denen die Suche landet; `paths` allein kann Einstieg und
      // Durchklick nicht trennen. Erst hiermit ist "wo kommen die Leute rein"
      // fuer ALLE Besucher beantwortbar statt nur fuer die Zustimmenden.
      update.entryPaths = { [budgeted('entryPaths', path)]: inc };
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
    if (from) update.continuations = { [budgeted('continuations', from)]: inc };

    const host = referrerHost(body.referrer);
    if (host) {
      update.referrers = { [keyWithinBudget(known, 'referrers', host, OVERFLOW_HOST)]: inc };
    }
  }

  // Ein Beacon darf nicht 500 antworten. Ohne dieses Netz wurde aus jeder
  // Firestore-Stoerung ein Fehler in `onRequestError` und damit ein Vorfall in
  // Sentry — fuer einen Aufruf, den niemand wiederholen kann und dessen
  // Ergebnis niemand liest.
  try {
    await dayRef.set(update, { merge: true });
  } catch (error) {
    console.error(
      '[count] day document write failed',
      error instanceof Error ? error.name : 'UnknownError'
    );
  }
  return new NextResponse(null, { status: 204 });
}
