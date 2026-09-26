import { NextRequest, NextResponse } from 'next/server';

import { clientIpFromXff } from '@/lib/clientIp';
import { berlinDay, countSalt, visitorHash } from '@/lib/analytics/visitorHash';
import { getPublicMustEatIds } from '@/lib/map/server-initial-map-data';
import { renderPrivateMustEatImage, type ImageVariant } from '@/lib/must-eat/private-image';
import {
  PREMIUM_ACCESS_TTL_SECONDS,
  premiumAccessCookieName,
  readPremiumAccessToken,
} from '@/lib/must-eat/premium-access';
import { premiumSessionCookieName, readPremiumSessionUid } from '@/lib/must-eat/premium-session';
import { coalesceRateLimit } from '@/lib/rateLimitCoalesce';
import { checkWindowedRateLimitBatch } from '@/lib/rateLimitWindow';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

// Zwei Bilder, zwei Regeln. Ein aufgedecktes Must-Eat geht ohnehin an jeden
// anonymen Besucher — daran ist nichts zu schützen, und ohne Cache holte jeder
// Startseiten-Aufruf sechs Originale aus dem Bucket und rechnete sharp neu.
// Preis, bewusst abgenommen: eine wieder verdeckte Karte kommt bis zu max-age
// noch aus Caches, Zurücknehmen wirkt also nicht sofort.
const PUBLIC_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';
// Verdeckt: nur der eigene Browser, und der genau so lange, wie die Capability
// gilt, die das Bild freigab — nie ein geteilter Cache. Bis zum 16.09.2026 war
// das `no-store`: jedes Zurückblättern auf dieselbe Karte holte sie neu, und
// ein Bild, das der Server gerade erst ausgeliefert hatte, musste er noch
// einmal ausliefern (Betreiber, 16.09.2026: „no-store auf private max-age
// umstellen"). Was `no-store` versprach — nach dem Logout keine Premium-Bytes
// im geteilten Browser — hielt es ohnehin nur halb: die Karte stand derweil
// als Pixel auf dem Schirm. Fehlerantworten bleiben ohne Cache.
const COVERED_CACHE_CONTROL = `private, max-age=${PREMIUM_ACCESS_TTL_SECONDS}`;
const NO_STORE = 'private, no-store';

// Aufrufer hängen über `sanityImageLoader` ein Sanity-artiges `?w=…&auto=format&q=…`
// an — die Route lieferte davon unbeeindruckt die Originaldatei aus dem Bucket.
// Auf /map hieß das 124 kB für einen 69×90-Daumennagel. Also selbst skalieren.
//
// Die Breite rastet auf eine feste Leiter ein, statt jede Zahl zu akzeptieren:
// ein beliebiges `?w=` wäre ein CPU-Verstärker — jede neue Zahl ein neuer
// sharp-Lauf und ein eigener Eintrag im Prozess-Cache (lib/must-eat/private-image).
// 440 is the home teaser's 2x rung (208 px slot on a phone): without it that
// case fell through to 720 and downloaded 63 kB for a 208 px card instead of
// 28 kB. Add rungs deliberately — every new number is another sharp run.
const ALLOWED_WIDTHS = [90, 180, 360, 440, 720, 1200] as const;

function pickWidth(raw: string | null): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return ALLOWED_WIDTHS.find((w) => w >= n) ?? null;
}

// Dieselbe Begruendung wie bei der Breitenleiter, und sie fehlte hier: `q`
// ging als `Math.min(90, Math.max(40, …))` durch — 51 Stufen, jede ein eigener
// sharp-Lauf und, weil `q` in Cache-Variante und ETag steht, eine eigene
// Cache-Zeile. 51 Stufen mal sechs Breiten sind ueber 600 Fehlschlaege je Bild,
// jeder mit Bucket-Download davor. Also zwei Sprossen: die Vorgabe und eine
// sparsame darunter. Neue nur mit demselben Vorsatz wie eine neue Breite.
const ALLOWED_QUALITIES = [60, 80] as const;
const DEFAULT_QUALITY = 80;

function pickQuality(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_QUALITY;
  return ALLOWED_QUALITIES.find((q) => q >= n) ?? DEFAULT_QUALITY;
}

// Der Server-Riegel vor bezahlten Bytes: ein Treffer kostet einen GCS-Download
// plus einen sharp-Lauf. Grosszuegig, weil eine Startseite sechs Karten auf
// einmal holt und hinter einer NAT mehrere Leute sitzen.
//
// Er steht seit dem 16.09.2026 NUR noch vor dieser Arbeit, nicht vor jeder
// Anfrage. Bis dahin lief er als Firestore-Transaktion auf EIN Dokument je IP
// vor jedem Bild — sechs gleichzeitig ladende Karten stritten sich um dieses
// Dokument und warteten in Retries: im Produktions-Log kamen die ersten zwei
// Bilder eines Schwungs nach 460 und 607 ms, die vier danach nach 1,5 bis
// 2,2 s. Was aus dem Prozess-Cache kommt, hat den Bucket nie beruehrt und
// braucht keinen Riegel; der Verweigerungs-Zweig (403) kostet nichts.
const IMAGE_RATE_LIMITS = { perMinute: 240, perDay: 6000 };

// Gleichzeitige Anfragen derselben IP teilen sich eine Transaktion — der Rest
// der Riegel-Geschichte steht in lib/rateLimitCoalesce.ts.
const limitImageWork = coalesceRateLimit((key, count) =>
  checkWindowedRateLimitBatch(key, IMAGE_RATE_LIMITS, 'deny', count)
);

class ImageRateLimited extends Error {
  constructor(readonly reason: string | undefined) {
    super('rate limited');
    this.name = 'ImageRateLimited';
  }
}

async function refuseWhenRateLimited(request: NextRequest): Promise<void> {
  const ip = clientIpFromXff(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  );
  if (!ip) return;
  // `deny`, wenn Firestore nicht antwortet — dieselbe Abwaegung wie
  // `checkRateLimitFailClosed` in lib/rateLimit.ts: kostet die Aktion Geld,
  // ist kein Riegel ein Grund weiterzumachen.
  const key = visitorHash(ip, '', berlinDay(), countSalt());
  const limit = await limitImageWork(`img:${key}`);
  if (!limit.allowed) throw new ImageRateLimited(limit.reason);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Öffentlich zuerst, Cookie danach — und diese Reihenfolge ist nicht kosmetisch.
  // Die beiden Zweige antworten mit unterschiedlichem Cache-Control, also darf die
  // Entscheidung nur am Bild hängen und nie am Aufrufer: sonst läge dieselbe URL
  // mal als `public`, mal als `no-store` vor, und eine Karte, die beides ist,
  // fiele in den no-store-Zweig.
  const publicIds = await getPublicMustEatIds();
  const isPublic = publicIds.has(id);

  // Nur eine verdeckte Karte braucht die Session-Runde: `verifySessionCookie`
  // geht an Firebase Admin, und ein aufgedecktes Bild ist ohne Cookie erlaubt.
  let allowed = isPublic;
  if (!allowed) {
    const capability = request.cookies.get(premiumAccessCookieName())?.value;
    const sessionUid = await readPremiumSessionUid(
      request.cookies.get(premiumSessionCookieName())?.value
    );
    const cookieIds = sessionUid
      ? readPremiumAccessToken(capability, sessionUid)
      : process.env.NODE_ENV !== 'production'
        ? readPremiumAccessToken(capability, 'development')
        : new Set<string>();
    allowed = cookieIds.has(id);
  }
  if (!allowed) {
    const response = NextResponse.json({ error: 'forbidden' }, { status: 403 });
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }

  const query = request.nextUrl.searchParams;
  const width = pickWidth(query.get('w'));
  const variant: ImageVariant | null = width
    ? { width, quality: pickQuality(query.get('q')), webp: query.get('auto') === 'format' }
    : null;

  try {
    const image = await renderPrivateMustEatImage(id, variant, () =>
      refuseWhenRateLimited(request)
    );
    return new NextResponse(new Uint8Array(image.body), {
      headers: {
        'Cache-Control': isPublic ? PUBLIC_CACHE_CONTROL : COVERED_CACHE_CONTROL,
        'Content-Type': image.contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        ...(image.etag ? { ETag: image.etag } : {}),
      },
    });
  } catch (error) {
    if (error instanceof ImageRateLimited) {
      const response = NextResponse.json(
        { error: 'rate_limited', reason: error.reason },
        { status: 429 }
      );
      response.headers.set('Cache-Control', NO_STORE);
      return response;
    }
    console.error(
      '[must-eat-image] private asset unavailable',
      error instanceof Error ? error.name : 'UnknownError'
    );
    const response = NextResponse.json({ error: 'asset unavailable' }, { status: 503 });
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}
