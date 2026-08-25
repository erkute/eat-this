import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { getAdminStorage } from '@/lib/firebase/admin';
import { getPublicMustEatIds } from '@/lib/map/server-initial-map-data';
import { getPrivateMustEatContent } from '@/lib/must-eat/private-store';
import { premiumAccessCookieName, readPremiumAccessToken } from '@/lib/must-eat/premium-access';
import { premiumSessionCookieName, readPremiumSessionUid } from '@/lib/must-eat/premium-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

// Zwei Antworten, zwei Regeln. Ein aufgedecktes Must-Eat geht ohnehin an jeden
// anonymen Besucher — daran ist nichts zu schützen, und ohne Cache holte jeder
// Startseiten-Aufruf sechs Originale aus dem Bucket und rechnete sharp neu.
// Preis, bewusst abgenommen: eine wieder verdeckte Karte kommt bis zu max-age
// noch aus Caches, Zurücknehmen wirkt also nicht sofort.
const PUBLIC_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';
const PRIVATE_CACHE_CONTROL = 'private, no-store';

// Aufrufer hängen über `sanityImageLoader` ein Sanity-artiges `?w=…&auto=format&q=…`
// an — die Route lieferte davon unbeeindruckt die Originaldatei aus dem Bucket.
// Auf /map hieß das 124 kB für einen 69×90-Daumennagel. Also selbst skalieren.
//
// Die Breite rastet auf eine feste Leiter ein, statt jede Zahl zu akzeptieren:
// ein beliebiges `?w=` wäre ein CPU-Verstärker — jede neue Zahl ein neuer
// sharp-Lauf, den im verdeckten Zweig (`no-store`) kein Cache abfängt, und im
// öffentlichen Zweig zersplittert jede Zahl zusätzlich den Cache.
// 440 is the home teaser's 2x rung (208 px slot on a phone): without it that
// case fell through to 720 and downloaded 63 kB for a 208 px card instead of
// 28 kB. Add rungs deliberately — every new number is another sharp run.
const ALLOWED_WIDTHS = [90, 180, 360, 440, 720, 1200] as const;

function pickWidth(raw: string | null): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return ALLOWED_WIDTHS.find((w) => w >= n) ?? null;
}

function pickQuality(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 80;
  return Math.min(90, Math.max(40, Math.round(n)));
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
    response.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
    return response;
  }

  try {
    const content = await getPrivateMustEatContent(id);
    const file = getAdminStorage().bucket().file(content.imageObjectPath);
    const [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
    const contentType = metadata.contentType ?? content.imageContentType;
    if (!contentType.startsWith('image/')) {
      throw new Error('Private Must-Eat object is not an image');
    }

    const params = request.nextUrl.searchParams;
    const width = pickWidth(params.get('w'));
    const wantsWebp = params.get('auto') === 'format';
    let body = buffer;
    let outputType = contentType;
    let variant = '';

    if (width) {
      const quality = pickQuality(params.get('q'));
      try {
        // `withoutEnlargement`: ein kleineres Original bleibt, wie es ist —
        // Hochskalieren kostet Bytes und bringt kein Pixel dazu.
        const pipeline = sharp(buffer).rotate().resize({ width, withoutEnlargement: true });
        body = wantsWebp ? await pipeline.webp({ quality }).toBuffer() : await pipeline.toBuffer();
        outputType = wantsWebp ? 'image/webp' : contentType;
        variant = `-w${width}-q${quality}${wantsWebp ? '-webp' : ''}`;
      } catch (error) {
        // Ein Format, das sharp nicht anfasst (SVG, animiertes GIF), ist kein
        // Grund, gar kein Bild zu liefern — dann eben das Original.
        console.error(
          '[must-eat-image] resize failed, serving original',
          error instanceof Error ? error.name : 'UnknownError'
        );
      }
    }

    return new NextResponse(new Uint8Array(body), {
      headers: {
        // Verdeckt: ein geteilter Browser darf keine Premium-Bytes nach dem
        // Logout behalten, und die kurzlebige HttpOnly-Capability wird bei
        // jedem Bild-Request neu geprüft. Aufgedeckt: nichts zu schützen.
        'Cache-Control': isPublic ? PUBLIC_CACHE_CONTROL : PRIVATE_CACHE_CONTROL,
        'Content-Type': outputType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        // Das ETag des Buckets beschreibt das Original — eine skalierte
        // Variante braucht ihr eigenes, sonst gilt ein 304 für die falschen Bytes.
        ...(metadata.etag ? { ETag: `"${metadata.etag.replaceAll('"', '')}${variant}"` } : {}),
      },
    });
  } catch (error) {
    console.error(
      '[must-eat-image] private asset unavailable',
      error instanceof Error ? error.name : 'UnknownError'
    );
    const response = NextResponse.json({ error: 'asset unavailable' }, { status: 503 });
    response.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
    return response;
  }
}

export const HEAD = GET;
