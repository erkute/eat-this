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

/**
 * Was eine Einladung einbringt: eine Must-Eat-Karte, für beide Seiten.
 *
 * Bis zum 06.09.2026 waren es zehn Spots — die Währung, die es gab, solange
 * zwei Drittel der Karte gesperrt waren. Sie ist ersatzlos weg: die Map ist
 * frei, und das einzige, was ein Konto noch reicher macht, sind die Karten.
 *
 * Verschenkt wird nur, was der Beschenkte noch nicht offen hat — die
 * öffentlichen Schaufensterkarten sind kein Geschenk, die eigenen erst recht
 * nicht. Welche Karten das sind, entscheidet `composeAccountSurface`, dieselbe
 * Ableitung wie auf der Map: es soll nicht zwei Meinungen darüber geben, was
 * jemandem gehört.
 */
export async function POST(req: NextRequest) {
  const inviterUid = req.cookies.get(REFERRER_COOKIE)?.value ?? null;

  const respond = (clear: boolean) => {
    const res = NextResponse.json({ ok: true });
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
    const decoded = await getAdminAuth().verifyIdToken(idToken);
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
  } catch {
    return respond(true);
  }
  if (friendEmail && inviterEmail && friendEmail === inviterEmail) return respond(true);

  const db = getAdminFirestore();

  try {
    // Seed for the shared inviter counter introduced after the first referral
    // implementation. The cap decision itself happens inside the transaction
    // below; this aggregate is used only if the counter does not exist yet.
    // Concurrent first writes all contend on the same counter document, so a
    // retry observes the value installed by the winning transaction.
    const inviterBonuses = db.collection('users').doc(inviterUid).collection('referralBonuses');
    const awarded = await inviterBonuses.where('source', '==', 'invited').count().get();
    const legacyAwardedCount = awarded.data().count;

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
      inviterFaceUpIds: inviterSurface.faceUpIds,
      friendFaceUpIds: friendSurface.faceUpIds,
    });
    const friendPicks = sampleN(friendPool, REFERRAL_BONUS_CARDS);
    const inviterPicks = sampleN(inviterPool, REFERRAL_BONUS_CARDS);

    const friendDocRef = db
      .collection('users')
      .doc(friendUid)
      .collection('referralBonuses')
      .doc('invited-by');
    const inviterDocRef = db
      .collection('users')
      .doc(inviterUid)
      .collection('referralBonuses')
      .doc(`invited-${friendUid}`);
    const inviterCounterRef = db.doc(`users/${inviterUid}/referralStats/inviter`);

    // The deterministic friend document is the idempotency lock. Reading and
    // creating it inside one transaction prevents parallel confirm requests
    // from awarding the same signup more than once. Every inviter-side award
    // also reads and updates one shared counter document, which serializes
    // different friends racing for the final available slots.
    await db.runTransaction(async (tx) => {
      const [existing, counter] = await Promise.all([
        tx.get(friendDocRef),
        tx.get(inviterCounterRef),
      ]);
      if (existing.exists) return;

      const storedCount = counter.exists ? counter.data()?.awardedCount : undefined;
      const awardedCount =
        typeof storedCount === 'number' && Number.isInteger(storedCount) && storedCount >= 0
          ? storedCount
          : legacyAwardedCount;
      const awardInviter = inviterPicks.length > 0 && awardedCount < MAX_REFERRALS_PER_INVITER;

      tx.set(friendDocRef, {
        mustEatIds: friendPicks,
        source: 'invited-by',
        partnerUid: inviterUid,
        createdAt: FieldValue.serverTimestamp(),
      });
      if (awardInviter) {
        tx.set(inviterDocRef, {
          mustEatIds: inviterPicks,
          source: 'invited',
          partnerUid: friendUid,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      if (inviterPicks.length > 0 && (!counter.exists || awardInviter)) {
        tx.set(
          inviterCounterRef,
          {
            awardedCount: awardedCount + (awardInviter ? 1 : 0),
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
