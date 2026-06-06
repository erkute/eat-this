// Composed spot-card image for the magic-link email — one flat 720×720 PNG
// per restaurant (photo + scrim + meta/name in brand fonts + tilted Must-Eat
// badge). Email clients can't break a single image; every CSS approach to
// this composition dies in Gmail (position/transform/filter stripped, no
// webfonts). Addressed by Sanity slug only, so there's no SSRF surface —
// all image URLs are built server-side from Sanity data.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getEmailSpotCard } from '@/lib/sanity.server';
import { isValidSlug, SpotCardImage, SPOT_CARD_SIZE } from '@/lib/email/spotCard';

export const runtime = 'nodejs';

// Satori knows no system fonts — both brand faces ship as repo assets
// (traced into the standalone build via outputFileTracingIncludes).
// Cached at module scope: one disk read per server instance.
let fontsPromise: Promise<{ schoolbell: Buffer; saira: Buffer }> | null = null;
function loadFonts() {
  fontsPromise ??= (async () => {
    const dir = join(process.cwd(), 'assets', 'fonts');
    const [schoolbell, saira] = await Promise.all([
      readFile(join(dir, 'Schoolbell-Regular.ttf')),
      readFile(join(dir, 'SairaCondensed-ExtraBold.ttf')),
    ]);
    return { schoolbell, saira };
  })();
  return fontsPromise;
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  if (!isValidSlug(slug)) {
    return new Response('invalid slug', { status: 400 });
  }

  const spot = await getEmailSpotCard(slug);
  if (!spot) {
    return new Response('not found', { status: 404 });
  }

  const { schoolbell, saira } = await loadFonts();

  const png = new ImageResponse(<SpotCardImage spot={spot} />, {
    width:  SPOT_CARD_SIZE,
    height: SPOT_CARD_SIZE,
    fonts: [
      { name: 'Schoolbell', data: schoolbell, weight: 400, style: 'normal' },
      { name: 'Saira Condensed', data: saira, weight: 800, style: 'normal' },
    ],
  });

  // ImageResponse only emits PNG — ~1 MB for a photo-dominated 720² card.
  // The composition is flat (no alpha left), so recompress to JPEG: ~10×
  // smaller for four images per email.
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 82 })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      // Long CDN cache — the composition only changes when Sanity content
      // does, and a stale spot card in an old email is harmless.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
