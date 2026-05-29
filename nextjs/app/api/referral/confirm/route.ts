import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { resolveEntitlements } from '@/lib/firebase/entitlements'
import { computeReferralPools, sampleN } from '@/lib/referral/pools'
import {
  REFERRER_COOKIE,
  REFERRAL_BONUS_SIZE,
  UID_SHAPE,
  ACCOUNT_FRESHNESS_MS,
} from '@/lib/referral/constants'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const inviterUid = req.cookies.get(REFERRER_COOKIE)?.value ?? null

  const respond = (clear: boolean) => {
    const res = NextResponse.json({ ok: true })
    if (clear) res.cookies.set(REFERRER_COOKIE, '', { path: '/', maxAge: 0 })
    return res
  }

  if (!inviterUid || !UID_SHAPE.test(inviterUid)) return respond(true)

  let idToken: string | null = null
  try {
    const body = await req.json()
    idToken = typeof body?.idToken === 'string' ? body.idToken : null
  } catch {
    idToken = null
  }
  if (!idToken) return respond(false)

  let friendUid: string
  let friendEmail: string | null
  let friendCreatedAtMs: number
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    friendUid = decoded.uid
    const friend = await getAdminAuth().getUser(friendUid)
    friendEmail = friend.email?.toLowerCase() ?? null
    friendCreatedAtMs = new Date(friend.metadata.creationTime).getTime()
  } catch {
    return respond(false)
  }

  if (Date.now() - friendCreatedAtMs > ACCOUNT_FRESHNESS_MS) return respond(true)

  if (inviterUid === friendUid) return respond(true)

  let inviterEmail: string | null
  try {
    const inviter = await getAdminAuth().getUser(inviterUid)
    inviterEmail = inviter.email?.toLowerCase() ?? null
  } catch {
    return respond(true)
  }
  if (friendEmail && inviterEmail && friendEmail === inviterEmail) return respond(true)

  const db = getAdminFirestore()

  const existing = await db
    .collection('users').doc(friendUid).collection('referralBonuses')
    .where('source', '==', 'invited-by').limit(1).get()
  if (!existing.empty) return respond(true)

  try {
    const { restaurants: all } = await getCachedMapData()
    const allIds = all.map((r) => r._id)

    const inviterEnt = await resolveEntitlements(inviterUid, inviterEmail)
    const inviterEntitledIds = new Set<string>(inviterEnt.restaurantIds)
    if (inviterEnt.isAdmin || inviterEnt.hasAllBerlin) {
      for (const id of allIds) inviterEntitledIds.add(id)
    } else if (inviterEnt.categorySlugs.size > 0) {
      for (const r of all) {
        if (r.categories?.some((c) => inviterEnt.categorySlugs.has(c.slug))) {
          inviterEntitledIds.add(r._id)
        }
      }
    }

    // Bonus pool: spots from the full catalog not yet owned by each party.
    // anonIds/signedIds intentionally empty — the welcome pack already handles
    // that tier; bonuses draw from the full catalog minus existing entitlements.
    const { inviterPool, friendPool } = computeReferralPools({
      allIds,
      anonIds:            new Set(),
      signedIds:          new Set(),
      inviterEntitledIds,
    })
    const friendPicks  = sampleN(friendPool,  REFERRAL_BONUS_SIZE)
    const inviterPicks = sampleN(inviterPool, REFERRAL_BONUS_SIZE)

    const batch = db.batch()
    const friendDocRef = db
      .collection('users').doc(friendUid).collection('referralBonuses').doc()
    batch.set(friendDocRef, {
      restaurantIds: friendPicks,
      source: 'invited-by',
      partnerUid: inviterUid,
      createdAt: FieldValue.serverTimestamp(),
    })
    if (inviterPicks.length > 0) {
      const inviterDocRef = db
        .collection('users').doc(inviterUid).collection('referralBonuses').doc()
      batch.set(inviterDocRef, {
        restaurantIds: inviterPicks,
        source: 'invited',
        partnerUid: friendUid,
        createdAt: FieldValue.serverTimestamp(),
      })
    }
    await batch.commit()

    return respond(true)
  } catch (err) {
    console.error('[referral/confirm] pool/write failed', err)
    return respond(false)
  }
}
