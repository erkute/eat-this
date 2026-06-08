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

// resvg (Satori's rasterizer) cannot decode WebP, so `fm=jpg` is mandatory —
// `auto=format` would hand back WebP and the photo layer would render blank.
function ogPhotoUrl(photo: string): string {
  return `${photo.split('?')[0]}?w=${WIDTH}&h=${HEIGHT}&fit=crop&fm=jpg&q=80`;
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  if (!isValidSlug(slug)) {
    return new Response('invalid slug', { status: 400 });
  }

  const r = await getRestaurantBySlug(slug);
  if (!r) {
    return new Response('not found', { status: 404 });
  }

  const { saira, schoolbell } = await loadFonts();

  const district = r.bezirk?.name ?? r.district ?? null;
  const basePhoto = r.seo?.ogImageUrl || r.photo;
  const bg = basePhoto ? ogPhotoUrl(basePhoto) : null;
  const metaLine = [r.cuisineType, district].filter(Boolean).join('   ·   ');
  // Saira Condensed is narrow, but very long names still need a step down.
  const nameSize = r.name.length > 26 ? 72 : r.name.length > 18 ? 90 : 108;

  const png = new ImageResponse(
    (
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
            style={{ position: 'absolute', top: 0, left: 0, width: WIDTH, height: HEIGHT, objectFit: 'cover' }}
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
        {/* Brand wordmark — top-left chip in brand yellow. */}
        <div
          style={{
            position: 'absolute',
            top: 46,
            left: 52,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ffd84a',
            color: '#000',
            fontSize: 32,
            letterSpacing: 2,
            textTransform: 'uppercase',
            padding: '8px 20px 10px',
          }}
        >
          Eat This
        </div>
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
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Saira Condensed', data: saira, weight: 800, style: 'normal' },
        { name: 'Schoolbell', data: schoolbell, weight: 400, style: 'normal' },
      ],
    },
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
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
