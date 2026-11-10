import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { getCachedMapData } from '@/lib/map/cached-sanity';
import { composeAccountSurface } from '@/lib/map/visible-restaurants.server';
import { getUnlockedMustEatIds } from '@/lib/firebase/unlockedMustEats.server';
import { resolveEntitlements } from '@/lib/firebase/entitlements';
import { computeReferralPools, sampleN } from '@/lib/referral/pools';
import {
  REFERRER_COOKIE,
  REFERRAL_BONUS_CARDS,
  UID_SHAPE,
  ACCOUNT_FRESHNESS_MS,
  MAX_REFERRALS_PER_INVITER,
} from '@/lib/referral/constants';

export const dynamic = 'force-dynamic';

/** Einladungen verbinden beide Konten auch dann, wenn keine Bonuskarte frei ist.
 * Die Vergabe wird je Einladendem in derselben Transaktion ausgewählt und gezählt. */
export async function POST(req: NextRequest) {
  const inviterUid = req.cookies.get(REFERRER_COOKIE)?.value ?? null;

  const respond = (clear: boolean) => {
    const res = NextResponse.json({ ok: clear, completed: clear }, { status: clear ? 200 : 503 });
    if (clear) res.cookies.set(REFERRER_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  };

  if (!inviterUid || !UID_SHAPE.test(inviterUid)) return respond(true);

  let idToken: string | null = null;
  try {
    const body = await req.json();
    idToken = typeof body?.idToken === 'string' ? body.idToken : null;
  } catch {
    idToken = null;
  }
  if (!idToken) return respond(false);

  let friendUid: string;
  let friendEmail: string | null;
  let friendCreatedAtMs: number;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken, true);
    friendUid = decoded.uid;
    const friend = await getAdminAuth().getUser(friendUid);
    friendEmail = friend.email?.toLowerCase() ?? null;
    friendCreatedAtMs = new Date(friend.metadata.creationTime).getTime();
  } catch {
    return respond(false);
  }

  if (Date.now() - friendCreatedAtMs > ACCOUNT_FRESHNESS_MS) return respond(true);

  if (inviterUid === friendUid) return respond(true);

  let inviterEmail: string | null;
  let inviterIdentity: Parameters<typeof resolveEntitlements>[1] = {};
  try {
    const inviter = await getAdminAuth().getUser(inviterUid);
    inviterEmail = inviter.email?.toLowerCase() ?? null;
    inviterIdentity = {
      email: inviterEmail,
      emailVerified: inviter.emailVerified === true,
      admin: inviter.customClaims?.admin === true,
    };
  } catch (error) {
    const deleted = (error as { code?: string }).code === 'auth/user-not-found';
    return respond(deleted);
  }
  if (friendEmail && inviterEmail && friendEmail === inviterEmail) return respond(true);

  const db = getAdminFirestore();

  try {
    const [{ restaurants: all, mustEats: allMustEats }, inviterEnt, inviterUnlocked, friendEnt] =
      await Promise.all([
        getCachedMapData(),
        resolveEntitlements(inviterUid, inviterIdentity),
        getUnlockedMustEatIds(inviterUid),
        resolveEntitlements(friendUid),
      ]);

    const [inviterSurface, friendSurface] = await Promise.all([
      composeAccountSurface({
        all,
        allMustEats,
        ent: inviterEnt,
        unlockedIds: inviterUnlocked,
      }),
      composeAccountSurface({
        all,
        allMustEats,
        ent: friendEnt,
        // Das Konto ist Minuten alt; es kann noch nichts vor Ort aufgedeckt haben.
        unlockedIds: new Set<string>(),
      }),
    ]);

    const { inviterPool, friendPool } = computeReferralPools({
      allMustEatIds: allMustEats.map((m) => m._id),
      inviter: { faceUpIds: inviterSurface.faceUpIds },
      friend: { faceUpIds: friendSurface.faceUpIds },
    });
    const friendPicks = sampleN(friendPool, REFERRAL_BONUS_CARDS);

    const friendDocRef = db
      .collection('users')
      .doc(friendUid)
      .collection('referralBonuses')
      .doc('invited-by');
    const inviterBonusesRef = db.collection('users').doc(inviterUid).collection('referralBonuses');
    const inviterDocRef = inviterBonusesRef.doc(`invited-${friendUid}`);
    const inviterCounterRef = db.doc(`users/${inviterUid}/referralStats/inviter`);

    // The deterministic friend document is the idempotency lock. Reading and
    // creating it inside one transaction prevents parallel confirm requests
    // from awarding the same signup more than once. Every inviter-side award
    // also reads and updates one shared counter document, which serializes
    // different friends racing for the final available slots.
    await db.runTransaction(async (tx) => {
      const [existing, counter, bonuses] = await Promise.all([
        tx.get(friendDocRef),
        tx.get(inviterCounterRef),
        tx.get(inviterBonusesRef),
      ]);
      if (existing.exists) return;

      const awardedCount: number = counter.data()?.awardedCount ?? 0;
      const alreadyAwarded = new Set<string>(
        bonuses.docs.flatMap((doc) => doc.data().mustEatIds ?? [])
      );
      const inviterPicks =
        awardedCount < MAX_REFERRALS_PER_INVITER
          ? sampleN(
              inviterPool.filter((id) => !alreadyAwarded.has(id)),
              REFERRAL_BONUS_CARDS
            )
          : [];

      tx.set(friendDocRef, {
        mustEatIds: friendPicks,
        source: 'invited-by',
        partnerUid: inviterUid,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(inviterDocRef, {
        mustEatIds: inviterPicks,
        source: 'invited',
        partnerUid: friendUid,
        createdAt: FieldValue.serverTimestamp(),
      });
      if (inviterPicks.length > 0) {
        tx.set(
          inviterCounterRef,
          {
            awardedCount: awardedCount + 1,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    });

    return respond(true);
  } catch (err) {
    console.error('[referral/confirm] pool/write failed', err);
    return respond(false);
  }
}
