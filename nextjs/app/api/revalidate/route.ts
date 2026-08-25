import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

function revalidateMapSurface(revalidated: string[], includeFreeSurface = false): void {
  revalidateTag('map-data');
  revalidatePath('/map');
  revalidatePath('/en/map');
  revalidated.push('tag:map-data', 'path:/map', 'path:/en/map');
  if (includeFreeSurface) {
    revalidateTag('free-surface');
    revalidated.push('tag:free-surface');
  }
}

function revalidateMustEatSurface(revalidated: string[]): void {
  revalidatePath('/must-eats');
  revalidatePath('/en/must-eats');
  revalidated.push('path:/must-eats', 'path:/en/must-eats');
}

// Sanity signs every webhook with header "sanity-webhook-signature"
// in the form "t=<unix-seconds>,v1=<hex-hmac>". The HMAC is computed over
// `${t}.${rawBody}` using the shared secret.
function isValidSanitySignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string
): boolean {
  if (!sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const part of sigHeader.split(',')) {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  // `t` steht in MILLISEKUNDEN, nicht in Sekunden — sanity-io/webhook-toolkit
  // setzt MINIMUM_TIMESTAMP auf 1609459200000, also 2021-01-01 in ms. Vorher
  // verglich diese Prüfung `t` gegen `Date.now() / 1000`; die Differenz lag
  // damit dauerhaft im Bereich von 1,7 Billionen und riss jede Toleranz. Auch
  // das allein hätte den Hook für immer auf 401 gehalten, unabhängig von der
  // Signaturkodierung darunter.
  //
  // Für den HMAC wird bewusst der ROHE String `t` verwendet, nicht die
  // umgerechnete Zahl: signiert wird `${t}.${rawBody}` genau so, wie es über
  // die Leitung kam.
  const timestampMs = Number(t);
  if (!Number.isInteger(timestampMs)) return false;
  const toleranceSeconds = num(process.env.SANITY_WEBHOOK_TOLERANCE_SECONDS, 300);
  if (Math.abs(Date.now() - timestampMs) > toleranceSeconds * 1000) return false;

  // base64url, NICHT hex. Sanity signiert nach Stripes Schema, kodiert die
  // Signatur aber base64url — sanity-io/webhook-toolkit, signature.ts:
  //   btoa(...).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  //
  // Vorher stand hier `digest('hex')` und ein Vergleich über
  // `Buffer.from(v1, 'hex')`. Auf einem base64url-String bricht die
  // Hex-Auswertung beim ersten ungültigen Zeichen ab; die Längen stimmten nie
  // überein und die Prüfung schlug IMMER fehl. Der Hook lieferte dadurch seit
  // seiner Einrichtung ausnahmslos 401, und jede Content-Änderung hing bis zum
  // Ablauf der ISR-Frist. Der zugehörige Test signierte ebenfalls hex und hat
  // den Fehler mitgetragen — deshalb prüft er jetzt gegen die Kodierung, die
  // wirklich über die Leitung geht.
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('base64url');

  const a = Buffer.from(v1, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'secret_missing' }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get('sanity-webhook-signature');

  if (!isValidSanitySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let doc: { _type?: string; slug?: { current?: string }; _id?: string } = {};
  try {
    doc = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const type = doc._type;
  const slug = doc.slug?.current;
  const revalidated: string[] = [];

  switch (type) {
    case 'newsArticle':
      revalidateTag('news');
      revalidateTag('sitemap-articles');
      revalidatePath('/sitemap.xml');
      revalidated.push('tag:news', 'tag:sitemap-articles', 'path:/sitemap.xml');
      if (slug) {
        revalidateTag(`article:${slug}`);
        revalidatePath(`/news/${slug}`);
        revalidatePath(`/en/news/${slug}`);
        revalidated.push(`tag:article:${slug}`, `path:/news/${slug}`);
      }
      revalidateMapSurface(revalidated, true);
      revalidateMustEatSurface(revalidated);
      break;
    case 'restaurant':
      revalidateTag('sitemap-restaurants');
      revalidatePath('/sitemap.xml');
      revalidated.push('tag:sitemap-restaurants', 'path:/sitemap.xml');
      if (slug) {
        revalidateTag(`restaurant:${slug}`);
        revalidatePath(`/restaurant/${slug}`);
        revalidatePath(`/en/restaurant/${slug}`);
        revalidated.push(`tag:restaurant:${slug}`, `path:/restaurant/${slug}`);
      }
      // Restaurant changes can shift bezirk and category membership/order
      // — flush both aggregation tag groups.
      revalidateTag('bezirk');
      revalidateTag('category-list');
      revalidateTag('restaurant-siblings');
      revalidated.push('tag:bezirk', 'tag:category-list', 'tag:restaurant-siblings');
      revalidateMapSurface(revalidated, true);
      revalidateMustEatSurface(revalidated);
      break;
    case 'bezirk':
      revalidateTag('bezirk');
      revalidateTag('restaurant-siblings');
      revalidateTag('sitemap-bezirke');
      revalidatePath('/bezirk');
      revalidatePath('/en/bezirk');
      revalidatePath('/sitemap.xml');
      revalidated.push(
        'tag:bezirk',
        'tag:restaurant-siblings',
        'tag:sitemap-bezirke',
        'path:/bezirk',
        'path:/sitemap.xml'
      );
      if (slug) {
        revalidateTag(`bezirk:${slug}`);
        revalidatePath(`/bezirk/${slug}`);
        revalidatePath(`/en/bezirk/${slug}`);
        revalidated.push(`tag:bezirk:${slug}`, `path:/bezirk/${slug}`);
      }
      revalidateMapSurface(revalidated);
      break;
    case 'category':
      revalidateTag('category');
      revalidateTag('category-list');
      revalidateTag('restaurant-siblings');
      revalidatePath('/');
      revalidatePath('/en');
      revalidatePath('/kategorie');
      revalidatePath('/en/kategorie');
      revalidated.push(
        'tag:category',
        'tag:category-list',
        'tag:restaurant-siblings',
        'path:/',
        'path:/kategorie'
      );
      if (slug) {
        revalidateTag(`category:${slug}`);
        revalidatePath(`/kategorie/${slug}`);
        revalidatePath(`/en/kategorie/${slug}`);
        revalidated.push(`tag:category:${slug}`, `path:/kategorie/${slug}`);
      }
      revalidateMapSurface(revalidated);
      break;
    case 'mustEat':
      revalidateTag('mustEat');
      revalidated.push('tag:mustEat');
      revalidateMapSurface(revalidated, true);
      revalidateMustEatSurface(revalidated);
      break;
    case 'homeWeek':
      revalidateMapSurface(revalidated, true);
      revalidateMustEatSurface(revalidated);
      break;
    case 'staticPage':
      revalidateTag('staticPage');
      revalidated.push('tag:staticPage');
      break;
  }

  return NextResponse.json({ ok: true, type, slug, revalidated });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: 'revalidate' });
}
