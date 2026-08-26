import { NextResponse } from 'next/server';
import { FieldValue, type WithFieldValue } from 'firebase-admin/firestore';
import * as Sentry from '@sentry/nextjs';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import type { Entitlement } from '@/lib/firebase/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The one spot an account brings along.
 *
 * The locked sheet promises a signing-up visitor THIS spot — the grey dot they
 * actually tapped, not fifty others somewhere in the city. Before this route
 * that promise was only true for the ~50 spots between rank 100 and 150; every
 * other locked spot showed a pack instead, because offering the account would
 * have been a lie. This makes the promise true for the whole catalog, so the
 * anon sheet can make ONE ask (see LockedDetail).
 *
 * Exactly one claim per user, ever. The doc id IS the limit — a second call
 * finds the doc and returns without writing, so a signed-in user cannot walk
 * the map claiming the catalog a dot at a time. Farming it would take one
 * email address per spot; the pack tier is ~144 spots deep.
 *
 * Not a Stripe purchase, so it carries neither a category nor all-berlin:
 * `type: 'spot'` with a single restaurantId, which is the shape
 * reduceEntitlements already unions into the visible set.
 */
const CLAIM_DOC_ID = 'signup-spot';

interface Body {
  slug?: string;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });

  // Resolve the slug against the catalog rather than trusting the client's id:
  // the body is user-editable, and an unchecked id would write an entitlement
  // for something that is not a restaurant. The read is the same memoised
  // Sanity fetch /api/map-data already makes, so it costs nothing extra.
  const { restaurants } = await getCachedMapData();
  const match = restaurants.find((r) => r.slug === slug);
  if (!match) return NextResponse.json({ error: 'unknown_slug' }, { status: 404 });

  const ref = getAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('entitlements')
    .doc(CLAIM_DOC_ID);

  const doc: WithFieldValue<Entitlement> = {
    type: 'spot',
    slug: null,
    restaurantIds: [match._id],
    mustEatIds: [],
    purchasedAt: FieldValue.serverTimestamp(),
    stripeSessionId: null,
    source: 'signup',
  };

  try {
    // create() rather than set(): it fails loudly when the doc exists, which
    // is precisely the "already claimed" case, and it does so atomically —
    // two tabs completing the same sign-in cannot both write.
    await ref.create(doc);
  } catch (err) {
    if ((err as { code?: number }).code === 6 /* ALREADY_EXISTS */) {
      const existing = await ref.get();
      const ids = (existing.data()?.restaurantIds ?? []) as string[];
      return NextResponse.json({ claimed: false, reason: 'already_claimed', restaurantIds: ids });
    }
    Sentry.captureException(err, { extra: { uid, slug, source: 'claim-spot' } });
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }

  return NextResponse.json({ claimed: true, restaurantId: match._id });
}
