import { FieldPath } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { sinceDay, summarize, type DailyDoc } from '@/lib/admin/stats.server';
import { berlinDay } from '@/lib/analytics/visitorHash';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { isAdminToken } from '@/lib/firebase/entitlements';

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
  const snapshot = await getAdminFirestore()
    .collection('analytics_daily')
    .where(FieldPath.documentId(), '>=', sinceDay(days * 2, today))
    .get();

  const all: DailyDoc[] = snapshot.docs.map((doc) => ({
    ...(doc.data() as Omit<DailyDoc, 'day'>),
    // Das Feld `day` steht zwar in jedem Dokument, die ID ist aber die Quelle,
    // nach der geschnitten wurde — sonst könnten Zeitraum und Beschriftung
    // auseinanderlaufen.
    day: doc.id,
  }));

  const current = all.filter((doc) => doc.day >= windowStart);
  const previous = all.filter((doc) => doc.day < windowStart);

  return NextResponse.json(summarize(current, previous, today), { headers: NO_STORE });
}
