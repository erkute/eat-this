import type { Auth } from 'firebase-admin/auth';
import { FieldPath, type Firestore, type Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import {
  sinceDay,
  summarize,
  summarizeAccounts,
  type AccountRecord,
  type Accounts,
  type CheckoutRecord,
  type DailyDoc,
  type PurchaseRecord,
} from '@/lib/admin/stats.server';
import { berlinDay } from '@/lib/analytics/visitorHash';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { isAdminEmail, isAdminToken } from '@/lib/firebase/entitlements';

/**
 * Die Leseseite des einwilligungsfreien Zählers (app/api/count/route.ts).
 *
 * Der Zähler schreibt seit dem 21.08.2026 ein Dokument pro Tag nach
 * `analytics_daily` und hatte bis hierher keinen einzigen Leser — an die
 * Zahlen kam nur, wer sich mit Admin-Zugangsdaten ein Skript schrieb.
 *
 * Nur Admins: die Tagesdokumente tragen zwar keine personenbezogenen Daten
 * (der Besucher-Hash liegt in `analytics_seen` und wird hier nie angefasst),
 * aber Umsatz- und Trichterzahlen des ganzen Angebots gehören niemandem sonst.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function parseDays(raw: string | null): number {
  if (!raw) return DEFAULT_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAYS;
  return Math.min(parsed, MAX_DAYS);
}

/** Kalendertag (Berlin) eines Auth-Zeitstempels oder Firestore-Timestamps. */
function dayOf(value: string | Timestamp | undefined | null): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value.toDate();
  return Number.isNaN(date.getTime()) ? null : berlinDay(date);
}

/**
 * Konten aus Firebase Auth, nicht aus `users/`: dort liegen 56 Dokumente, von
 * denen die meisten Seed-Daten vom Mai 2026 sind — Auth kennt sechs Konten
 * (Stand 02.09.2026). Admin-Konten fallen raus, sonst ist der Betreiber jeden
 * Tag das aktive Konto. Kaeufe und Checkout-Versuche kommen aus den
 * Unter-Sammlungen, ueber Collection-Group-Abfragen ohne Filter — die
 * brauchen keinen Index.
 *
 * Alles hier ist klein (einstellige Kontenzahl, zweistellige Dokumente) und
 * wird bei jedem Aufruf frisch gelesen; ein Cache waere mehr Code als Nutzen.
 */
async function loadAccounts(auth: Auth, db: Firestore, windowStart: string): Promise<Accounts> {
  const accountByUid = new Map<string, AccountRecord>();
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (isAdminEmail(user.email ?? null)) continue;
      accountByUid.set(user.uid, {
        createdDay: dayOf(user.metadata.creationTime) ?? '',
        lastActiveDay: dayOf(user.metadata.lastRefreshTime ?? user.metadata.lastSignInTime),
        provider: user.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'email',
        favorites: 0,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const [favorites, entitlements, attempts] = await Promise.all([
    db.collectionGroup('favorites').select().get(),
    db.collectionGroup('entitlements').get(),
    db.collectionGroup('stripeCheckoutAttempts').get(),
  ]);

  // Favoriten liegen unter users/<uid>/favorites — der Grossvater ist das Konto.
  for (const doc of favorites.docs) {
    const account = accountByUid.get(doc.ref.parent.parent?.id ?? '');
    if (account) account.favorites += 1;
  }

  const purchases: PurchaseRecord[] = entitlements.docs.map((doc) => {
    const data = doc.data() as { purchasedAt?: Timestamp; source?: string; stripeSessionId?: unknown };
    return {
      day: dayOf(data.purchasedAt) ?? '',
      // `source` fehlte in aelteren Dokumenten; die Stripe-Sitzung ist der
      // sichere Beleg fuer „bezahlt".
      source: data.stripeSessionId ? 'stripe' : (data.source ?? 'manual'),
    };
  });
  const checkouts: CheckoutRecord[] = attempts.docs.map((doc) => {
    const data = doc.data() as { createdAt?: Timestamp; status?: string };
    return { day: dayOf(data.createdAt) ?? '', status: data.status ?? 'open' };
  });

  return summarizeAccounts([...accountByUid.values()], purchases, checkouts, windowStart);
}

export async function GET(request: Request) {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'auth required' }, { status: 401, headers: NO_STORE });
  }

  let isAdmin = false;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    isAdmin = isAdminToken({
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      admin: decoded.admin === true,
    });
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401, headers: NO_STORE });
  }

  // Bewusst 404 statt 403: wer kein Admin ist, soll nicht erfahren, dass es
  // den Endpunkt gibt.
  if (!isAdmin) {
    return NextResponse.json({ error: 'not found' }, { status: 404, headers: NO_STORE });
  }

  const days = parseDays(new URL(request.url).searchParams.get('days'));
  const today = berlinDay();
  const windowStart = sinceDay(days, today);

  // Doppelt so weit zurück wie angefragt: die zweite Hälfte ist der gewählte
  // Zeitraum, die erste die gleich lange Periode davor, gegen die verglichen
  // wird. Ein Dokument pro Tag — auch bei 365 Tagen sind das zwei kleine
  // Seiten, keine Abfrage, die sich zu teilen lohnte.
  //
  // Bereichsfilter über die Dokument-ID — die IST der Tag (YYYY-MM-DD,
  // lexikografisch = chronologisch). Ein `orderBy(documentId, 'desc')` wäre
  // naheliegender, verlangt aber einen zusammengesetzten Index; ein reiner
  // Bereichsfilter auf `__name__` kommt ohne aus.
  const db = getAdminFirestore();
  const [snapshot, accounts] = await Promise.all([
    db
      .collection('analytics_daily')
      .where(FieldPath.documentId(), '>=', sinceDay(days * 2, today))
      .get(),
    loadAccounts(getAdminAuth(), db, windowStart),
  ]);

  const all: DailyDoc[] = snapshot.docs.map((doc) => ({
    ...(doc.data() as Omit<DailyDoc, 'day'>),
    // Das Feld `day` steht zwar in jedem Dokument, die ID ist aber die Quelle,
    // nach der geschnitten wurde — sonst könnten Zeitraum und Beschriftung
    // auseinanderlaufen.
    day: doc.id,
  }));

  const current = all.filter((doc) => doc.day >= windowStart);
  const previous = all.filter((doc) => doc.day < windowStart);

  return NextResponse.json(summarize(current, previous, today, accounts), { headers: NO_STORE });
}
