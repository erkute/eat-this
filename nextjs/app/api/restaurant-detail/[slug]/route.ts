import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { SANITY_REVALIDATE_SECONDS } from '@/lib/constants';
import { restaurantMapDetailQuery } from '@/lib/map/queries';

// On-demand detail fields for the map detail sheet (address, phone, tip,
// description, …). Same editorial/contact fields the public /restaurant/[slug]
// SEO page renders, so no auth gate — the point is that they no longer ship
// up-front in the map payload for every spot. The two projections are separate
// and have drifted before (`phone` was here and not there, which left the
// public page unable to offer a call button); the overlap the UI depends on is
// pinned by lib/__tests__/restaurantContactFields.test.ts.

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await client.fetch(
    restaurantMapDetailQuery,
    { slug },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: [`restaurant:${slug}`] } }
  );
  // Never let a 404 stick in the CDN/browser: a slug that isn't published yet
  // would otherwise be cached as "not found" for up to s-maxage+SWR, so the
  // restaurant appears with a delay after it goes live.
  if (!detail)
    return NextResponse.json(
      { error: 'not_found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  // SWR is deliberately short. It used to be a day, which meant a returning
  // visitor kept seeing the old body for up to 24h after an edit went live —
  // the browser answers from its own cache and revalidates in the background,
  // so the Sanity webhook (app/api/revalidate) that busts the
  // `restaurant:<slug>` tag above only clears the SERVER cache. That is how
  // the EN map texts still read German after a green rollout. Worst case is
  // now max-age + SWR = 10 minutes; the instant re-open inside a session,
  // which is the point of the header, is untouched.
  // `s-maxage` and `public` do NOT arrive: App Hosting downgrades every
  // response whose path the middleware matcher hits, stripping both and
  // appending `private`. Measured on prod 25.08.2026 — this route is served as
  // `max-age=300, stale-while-revalidate=300, private`, and `cdn-cache-status`
  // is `miss` on every repeat. Only the browser cache is real here. Left in
  // place because the intent is right and would take effect the moment
  // `/api/*` leaves the matcher; not removed, so nobody re-derives it.
  return NextResponse.json(detail, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=300',
    },
  });
}
