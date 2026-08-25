// Dynamic Open Graph card for a restaurant — a branded 1200×630 share image
// (photo + scrim + name + cuisine/district + Eat This wordmark). Generated on
// demand and CDN-cached, mirroring the email spot-card route, so there is NO
// build-time cost for the ~680 restaurant pages. Addressed by Sanity slug only
// (validated), so there is no SSRF surface — the photo URL is built server-side
// from Sanity data. Referenced from the restaurant page's generateMetadata.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getRestaurantBySlug } from '@/lib/sanity.server';
import { isValidSlug } from '@/lib/email/spotCard';
import { localizedCuisine } from '@/lib/cuisineLabels';

export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

// Satori knows no system fonts; both faces ship as repo assets (traced into the
// standalone build via outputFileTracingIncludes). Cached at module scope.
let fontsPromise: Promise<{ saira: Buffer; schoolbell: Buffer }> | null = null;
function loadFonts() {
  fontsPromise ??= (async () => {
    const dir = join(process.cwd(), 'assets', 'fonts');
    const [saira, schoolbell] = await Promise.all([
      readFile(join(dir, 'SairaCondensed-ExtraBold.ttf')),
      readFile(join(dir, 'Schoolbell-Regular.ttf')),
    ]);
    return { saira, schoolbell };
  })();
  return fontsPromise;
}

// The Eat This wordmark — the brand's WebP logo can't be decoded by resvg, so
// the PNG variant (the one the emails use) is read once and inlined as a data
// URI; that avoids a network fetch for an asset that ships with the app.
let logoPromise: Promise<string> | null = null;
function loadLogo() {
  logoPromise ??= readFile(
    join(process.cwd(), 'public', 'pics', 'email', 'eat-this-logo.png')
  ).then((buf) => `data:image/png;base64,${buf.toString('base64')}`);
  return logoPromise;
}

// resvg (Satori's rasterizer) cannot decode WebP, so `fm=jpg` is mandatory —
// `auto=format` would hand back WebP and the photo layer would render blank.
function ogPhotoUrl(photo: string): string {
  return `${photo.split('?')[0]}?w=${WIDTH}&h=${HEIGHT}&fit=crop&fm=jpg&q=80`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get('slug') ?? '';
  /* Die Karte trug bisher immer den rohen Sanity-Wert, also „Mexican" auch
     unter einem deutschen Beitrag. Die Locale kommt aus dem Aufrufer, weil die
     Route selbst keinen Pfad-Kontext hat; ohne Parameter bleibt es Deutsch,
     die Standard-Locale der Seite. */
  const locale = params.get('locale') === 'en' ? 'en' : 'de';
  if (!isValidSlug(slug)) {
    return new Response('invalid slug', { status: 400 });
  }

  const r = await getRestaurantBySlug(slug);
  if (!r) {
    return new Response('not found', { status: 404 });
  }

  const [{ saira, schoolbell }, logo] = await Promise.all([loadFonts(), loadLogo()]);

  const district = r.bezirk?.name ?? r.district ?? null;
  const basePhoto = r.seo?.ogImageUrl || r.photo;
  const bg = basePhoto ? ogPhotoUrl(basePhoto) : null;
  const metaLine = [r.cuisineType ? localizedCuisine(r.cuisineType, locale) : null, district]
    .filter(Boolean)
    .join('   ·   ');
  // Saira Condensed is narrow, but very long names still need a step down.
  const nameSize = r.name.length > 26 ? 72 : r.name.length > 18 ? 90 : 108;

  const png = new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#1a1815',
        fontFamily: 'Saira Condensed',
      }}
    >
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          width={WIDTH}
          height={HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            objectFit: 'cover',
          }}
          alt=""
        />
      )}
      {/* Scrim for legibility — darkens the lower half, leaves the top photo clear. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          backgroundImage:
            'linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.40) 40%, rgba(0,0,0,0) 68%)',
        }}
      />
      {/* Brand wordmark — the actual Eat This logo, top-left. Its built-in
            black outline keeps it legible over the (un-scrimmed) top of the photo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        width={216}
        height={86}
        style={{ position: 'absolute', top: 44, left: 50 }}
        alt=""
      />
      {/* Content — cuisine/district eyebrow + restaurant name, bottom-left. */}
      <div
        style={{
          position: 'absolute',
          left: 52,
          right: 52,
          bottom: 52,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {metaLine && (
          <div
            style={{
              display: 'flex',
              color: '#ffd84a',
              fontSize: 34,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            {metaLine}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            color: '#ffffff',
            fontSize: nameSize,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {r.name}
        </div>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Saira Condensed', data: saira, weight: 800, style: 'normal' },
        { name: 'Schoolbell', data: schoolbell, weight: 400, style: 'normal' },
      ],
    }
  );

  // ImageResponse only emits PNG (~1 MB for a photo-dominated card). The
  // composition is flat, so recompress to JPEG — ~10× smaller for crawlers.
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 84 })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      // Long CDN cache — the card only changes when Sanity content does.
      // Except there is no CDN cache: App Hosting strips `public`/`s-maxage`
      // from every middleware-matched path and appends `private` (measured on
      // prod 25.08.2026). That bites hardest here — OG cards are fetched by
      // crawlers and social platforms, so every client is new and a browser
      // cache never applies. Getting it back means taking this path out of the
      // middleware matcher, which also drops staging's Basic Auth for it.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
