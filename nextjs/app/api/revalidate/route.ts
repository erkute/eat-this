import { NextRequest, NextResponse } from 'next/server';
import { envNumber } from '@/lib/env';
import { revalidateTag, revalidatePath } from 'next/cache';
import crypto from 'node:crypto';
import { waitForFreshCdn } from '@/lib/sanity.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sofort ablaufen statt veraltet ausliefern: eine Änderung aus Sanity soll beim
// nächsten Aufruf zu sehen sein.
const EXPIRE_NOW = { expire: 0 };

function revalidateMapSurface(revalidated: string[]): void {
  revalidateTag('map-data', EXPIRE_NOW);
  revalidatePath('/map');
  revalidatePath('/en/map');
  revalidated.push('tag:map-data', 'path:/map', 'path:/en/map');
}

function revalidateMustEatSurface(revalidated: string[]): void {
  revalidatePath('/must-eats');
  revalidatePath('/en/must-eats');
  revalidated.push('path:/must-eats', 'path:/en/must-eats');
}

// Die Pack-Karten versprechen Zahlen („Alle N Must Eats", „N Spots") aus
// packContentsQuery, das restaurant, mustEat und category zaehlt. Ohne diesen
// Aufruf haengen sie am eigenen 24-Stunden-Timer.
function revalidatePackContents(revalidated: string[]): void {
  revalidateTag('pack-contents', EXPIRE_NOW);
  revalidatePath('/packs');
  revalidatePath('/en/packs');
  revalidated.push('tag:pack-contents', 'path:/packs', 'path:/en/packs');
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

  // `t` steht in Millisekunden, nicht in Sekunden: sanity-io/webhook-toolkit
  // setzt MINIMUM_TIMESTAMP auf 1609459200000, also 2021-01-01 in ms. Gegen
  // `Date.now() / 1000` verglichen, risse die Differenz jede Toleranz.
  //
  // Für den HMAC wird bewusst der rohe String `t` verwendet, nicht die
  // umgerechnete Zahl: Signiert wird `${t}.${rawBody}` genau so, wie es über
  // die Leitung kam.
  const timestampMs = Number(t);
  if (!Number.isInteger(timestampMs)) return false;
  const toleranceSeconds = envNumber(process.env.SANITY_WEBHOOK_TOLERANCE_SECONDS, 300);
  if (Math.abs(Date.now() - timestampMs) > toleranceSeconds * 1000) return false;

  // base64url, nicht hex: Sanity signiert nach Stripes Schema, kodiert die
  // Signatur aber base64url (sanity-io/webhook-toolkit, signature.ts):
  //   btoa(...).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  // Der zugehörige Test prüft gegen die Kodierung, die wirklich über die
  // Leitung geht.
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

  let doc: { _type?: string; slug?: string | { current?: string }; _id?: string } = {};
  try {
    doc = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Erst warten, dann invalidieren. Der Hook kommt rund eine Sekunde nach dem
  // Publish, die Seiten lesen Sanity aber über das API-CDN (lib/sanity.ts).
  // Baut eine Seite neu, bevor das CDN den neuen Stand hat, hält sie den alten
  // bis zur 24-Stunden-Frist fest; eine feste Pause von fünf Sekunden reicht
  // dafür nicht immer. Für Artikel und Restaurants wartet waitForFreshCdn, bis
  // das CDN dieselbe Abfrage wie die Seite frisch beantwortet, bei einer
  // Must-Eat-Karte die Seite ihres Spots; sonst eine feste Pause.
  // `SANITY_WEBHOOK_SETTLE_MS=0` schaltet das Warten ab (Tests).
  //
  // Eine frische Antwort heißt nicht, dass alle Knoten des CDN frisch sind:
  // Andere Abfragen, auch dieselbe, kommen danach noch minutenlang teils alt
  // (Kategorie- und Bezirksseiten). Dafür wirkt jede Invalidierung im
  // cache-handler.cjs nach 2 und 10 Minuten noch einmal nach (FOLLOW_UP_MS).
  const settleMs = Number(process.env.SANITY_WEBHOOK_SETTLE_MS ?? 5000);
  const slugForSettle = typeof doc.slug === 'string' ? doc.slug : doc.slug?.current;
  let settled = 'off';
  if (Number.isFinite(settleMs) && settleMs > 0) {
    try {
      settled = await waitForFreshCdn(
        { type: doc._type, slug: slugForSettle, id: doc._id },
        { fallbackMs: settleMs }
      );
    } catch (err) {
      // Sanity nicht erreichbar: lieber jetzt invalidieren als gar nicht.
      settled = 'error';
      console.error('[revalidate] CDN-Abgleich fehlgeschlagen', err);
    }
  }

  const type = doc._type;
  // Die Webhook-Projektion liefert `"slug": slug.current`, also einen String,
  // kein Objekt; ein reines `doc.slug?.current` wäre auf dieser Payload immer
  // undefined.
  const slug = typeof doc.slug === 'string' ? doc.slug : doc.slug?.current;
  const revalidated: string[] = [];

  switch (type) {
    case 'newsArticle':
      revalidateTag('news', EXPIRE_NOW);
      revalidateTag('sitemap-articles', EXPIRE_NOW);
      revalidatePath('/sitemap.xml');
      revalidated.push('tag:news', 'tag:sitemap-articles', 'path:/sitemap.xml');
      if (slug) {
        revalidateTag(`article:${slug}`, EXPIRE_NOW);
        revalidatePath(`/news/${slug}`);
        revalidatePath(`/en/news/${slug}`);
        revalidated.push(`tag:article:${slug}`, `path:/news/${slug}`);
      }
      revalidateMapSurface(revalidated);
      revalidateMustEatSurface(revalidated);
      break;
    case 'restaurant':
      revalidateTag('sitemap-restaurants', EXPIRE_NOW);
      revalidatePath('/sitemap.xml');
      revalidated.push('tag:sitemap-restaurants', 'path:/sitemap.xml');
      if (slug) {
        revalidateTag(`restaurant:${slug}`, EXPIRE_NOW);
        revalidatePath(`/restaurant/${slug}`);
        revalidatePath(`/en/restaurant/${slug}`);
        revalidated.push(`tag:restaurant:${slug}`, `path:/restaurant/${slug}`);
      }
      // Restaurant changes can shift bezirk and category membership/order
      // — flush both aggregation tag groups.
      revalidateTag('bezirk', EXPIRE_NOW);
      revalidateTag('category-list', EXPIRE_NOW);
      revalidateTag('restaurant-siblings', EXPIRE_NOW);
      // Und was über alle Restaurants liest: Jede Spot-Seite trägt den blanken
      // Tag `restaurant` (lib/sanity.server.ts). Ohne ihn stünde eine Änderung
      // bis zu einen Tag lang nicht auf den übrigen Spot-Seiten.
      revalidateTag('restaurant', EXPIRE_NOW);
      // Die Slug-Tabelle des Legacy-Redirects (getAllRestaurantsLite) hängt an
      // einem eigenen Tag: Ohne ihn liefe ein umbenannter Slug bis zu 24
      // Stunden ins 404 statt in seinen Redirect.
      revalidateTag('restaurants-lite', EXPIRE_NOW);
      revalidated.push(
        'tag:bezirk',
        'tag:category-list',
        'tag:restaurant-siblings',
        'tag:restaurant',
        'tag:restaurants-lite'
      );
      revalidateMapSurface(revalidated);
      revalidateMustEatSurface(revalidated);
      revalidatePackContents(revalidated);
      break;
    case 'bezirk':
      revalidateTag('bezirk', EXPIRE_NOW);
      revalidateTag('restaurant-siblings', EXPIRE_NOW);
      revalidateTag('sitemap-bezirke', EXPIRE_NOW);
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
        revalidateTag(`bezirk:${slug}`, EXPIRE_NOW);
        revalidatePath(`/bezirk/${slug}`);
        revalidatePath(`/en/bezirk/${slug}`);
        revalidated.push(`tag:bezirk:${slug}`, `path:/bezirk/${slug}`);
      }
      revalidateMapSurface(revalidated);
      break;
    case 'category':
      revalidateTag('category', EXPIRE_NOW);
      revalidateTag('category-list', EXPIRE_NOW);
      revalidateTag('restaurant-siblings', EXPIRE_NOW);
      revalidatePath('/');
      revalidatePath('/en');
      revalidatePath('/kategorie');
      revalidatePath('/en/kategorie');
      // Die Sitemap listet jede Kategorie mit eigener URL. `category-list` oben
      // frischt zwar die Daten auf, aber die gerenderte Route bleibt stehen,
      // bis sie selbst revalidiert wird, wie bei 'newsArticle', 'bezirk' und
      // 'restaurant'.
      revalidatePath('/sitemap.xml');
      revalidated.push(
        'tag:category',
        'tag:category-list',
        'tag:restaurant-siblings',
        'path:/',
        'path:/kategorie',
        'path:/sitemap.xml'
      );
      if (slug) {
        revalidateTag(`category:${slug}`, EXPIRE_NOW);
        revalidatePath(`/kategorie/${slug}`);
        revalidatePath(`/en/kategorie/${slug}`);
        revalidated.push(`tag:category:${slug}`, `path:/kategorie/${slug}`);
      }
      revalidateMapSurface(revalidated);
      revalidatePackContents(revalidated);
      break;
    case 'mustEat':
      revalidateTag('mustEat', EXPIRE_NOW);
      revalidated.push('tag:mustEat');
      revalidateMapSurface(revalidated);
      revalidateMustEatSurface(revalidated);
      revalidatePackContents(revalidated);
      break;
    case 'staticPage':
      revalidateTag('staticPage', EXPIRE_NOW);
      revalidated.push('tag:staticPage');
      break;
  }

  return NextResponse.json({ ok: true, type, slug, settled, revalidated });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: 'revalidate' });
}
