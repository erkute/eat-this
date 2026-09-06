import { NextResponse } from 'next/server';
import { FieldValue, type WithFieldValue } from 'firebase-admin/firestore';
import * as Sentry from '@sentry/nextjs';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import { composeAccountSurface } from '@/lib/map/visible-restaurants.server';
import { getUnlockedMustEatIds } from '@/lib/firebase/unlockedMustEats.server';
import { resolveEntitlements, type Entitlement } from '@/lib/firebase/entitlements';
import { sampleN } from '@/lib/referral/pools';
import { STARTER_PACK_CARDS, STARTER_PACK_DOC_ID, starterPackPool } from '@/lib/starter-pack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Das Starter Pack einlösen — einmal pro Konto, für immer.
 *
 * Aufgerufen nach jeder Anmeldung (ReferralToastListener, derselbe
 * Auth-Listener wie die Einladungsbestätigung). Die Route ist absichtlich
 * nicht an ein frisches Konto gebunden: wer sich seit Jahren anmeldet, hat
 * dasselbe Pack verdient wie jemand, der heute kommt. Was sie bindet, ist die
 * Doc-ID — `create()` auf einen belegten Pfad schlägt fehl, und das ist die
 * Antwort „hast du schon".
 *
 * Verschenkt wird aus dem, was NICHT ohnehin offen liegt: das öffentliche
 * Schaufenster und der Spot des Tages sind kein Geschenk. Zufällig gezogen,
 * damit zwei Konten nicht denselben Stapel bekommen — ein Album, das bei jedem
 * gleich aussieht, ist keine Sammlung.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  let uid: string;
  let identity: Parameters<typeof resolveEntitlements>[1] = {};
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    identity = {
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      admin: decoded.admin === true,
    };
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const ref = getAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('entitlements')
    .doc(STARTER_PACK_DOC_ID);

  /* Billiger Vorab-Blick: die allermeisten Aufrufe sind Wiederkehrer, und für
     die soll die Route nicht erst Sanity und Firestore befragen. Der
     verbindliche Riegel ist trotzdem das `create()` unten — zwei Tabs, die
     sich gleichzeitig anmelden, kommen beide bis hierher. */
  if ((await ref.get()).exists) {
    return NextResponse.json({ granted: false, reason: 'already_claimed' });
  }

  const [{ restaurants: all, mustEats: allMustEats }, ent, unlockedIds] = await Promise.all([
    getCachedMapData(),
    resolveEntitlements(uid, identity),
    getUnlockedMustEatIds(uid),
  ]);

  /* Dieselbe Ableitung wie überall: was diesem Konto schon offen liegt. */
  const surface = await composeAccountSurface({ all, allMustEats, ent, unlockedIds });
  const pool = starterPackPool(
    allMustEats.map((m) => m._id),
    surface.faceUpIds
  );
  const mustEatIds = sampleN(pool, STARTER_PACK_CARDS);

  const doc: WithFieldValue<Entitlement> = {
    type: 'starter',
    slug: null,
    mustEatIds,
    purchasedAt: FieldValue.serverTimestamp(),
    stripeSessionId: null,
    source: 'signup',
  };

  try {
    await ref.create(doc);
  } catch (err) {
    if ((err as { code?: number }).code === 6 /* ALREADY_EXISTS */) {
      return NextResponse.json({ granted: false, reason: 'already_claimed' });
    }
    Sentry.captureException(err, { extra: { uid, source: 'starter-pack' } });
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }

  return NextResponse.json({ granted: true, count: mustEatIds.length });
}
