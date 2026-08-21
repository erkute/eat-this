// Composed spot-card image for the signup email — one flat 1072×804 photo card
// per restaurant (photo + scrim + name/meta in the brand font). Email clients
// can't break a single image; every CSS approach to this composition dies in
// Gmail (position/transform/filter stripped, no webfonts). Addressed by Sanity
// slug only, so there's no SSRF surface — all image URLs are built server-side
// from Sanity data.

import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getEmailSpotCard } from '@/lib/sanity.server';
import { loadBrandFont } from '@/lib/email/brandFont';
import {
  isValidSlug,
  SpotCardImage,
  SPOT_CARD_WIDTH,
  SPOT_CARD_HEIGHT,
} from '@/lib/email/spotCard';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  if (!isValidSlug(slug)) {
    return new Response('invalid slug', { status: 400 });
  }

  const spot = await getEmailSpotCard(slug);
  if (!spot) {
    return new Response('not found', { status: 404 });
  }

  // Satori knows no system fonts — the display face ships as a repo asset
  // (traced into the standalone build via outputFileTracingIncludes).
  const { faces } = await loadBrandFont();

  const png = new ImageResponse(<SpotCardImage spot={spot} />, {
    width: SPOT_CARD_WIDTH,
    height: SPOT_CARD_HEIGHT,
    fonts: faces,
  });

  // ImageResponse only emits PNG — ~1 MB for a photo-dominated card. The
  // composition is flat (no alpha left), so recompress to JPEG: ~10× smaller
  // for three images per email.
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
