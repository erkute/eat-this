import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import {
  resolveEntitlements,
} from '@/lib/firebase/entitlements'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { getFreeSurfaceData } from '@/lib/map/free-surface'
import { composeVisibleRestaurants } from '@/lib/map/visible-restaurants.server'
import { stripCoveredMustEats } from '@/lib/map/stripCoveredMustEats'
import { stripLockedRestaurants } from '@/lib/map/stripLockedRestaurant'
import { getUnlockedMustEatIds } from '@/lib/firebase/unlockedMustEats.server'
import { hydrateAuthorizedMustEats } from '@/lib/must-eat/private-store'
import {
  clearPremiumAccessCookie,
  setPremiumAccessCookie,
} from '@/lib/must-eat/premium-access'

// Per-user response. Disable framework-level caching; the expensive Sanity
// fetch is shared via the module-level cache in cached-sanity.ts.
export const dynamic    = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  let uid: string | null = null
  let identity: Parameters<typeof resolveEntitlements>[1] = {}
  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token)
      uid = decoded.uid
      identity = {
        email:         decoded.email ?? null,
        emailVerified: decoded.email_verified === true,
        admin:         decoded.admin === true,
      }
    } catch {
      // Expired/invalid token → treat as anonymous.
    }
  }

  const [ent, unlockedIds, [{ restaurants: all, mustEats: allMustEats, categories }, freeSurface]] =
    await Promise.all([
      resolveEntitlements(uid, identity),
      // On-site reveals — they keep their must-eats face-up in the payload.
      uid ? getUnlockedMustEatIds(uid) : Promise.resolve(new Set<string>()),
      Promise.all([getCachedMapData(), getFreeSurfaceData()]),
    ])

  // Admin / all-berlin: full catalog, no filter, no reveal signal (signed
  // & paid users get individual reveals via Firestore unlockedMustEats).
  if (ent.isAdmin || ent.hasAllBerlin) {
    if (!uid) {
      return NextResponse.json({ error: 'auth required' }, { status: 401 })
    }
    const allIds = new Set(allMustEats.map((mustEat) => mustEat._id))
    const hydratedMustEats = await hydrateAuthorizedMustEats(allMustEats, allIds)
    const res = NextResponse.json({
      restaurants: all,
      mustEats: hydratedMustEats,
      categories,
      totalCount: all.length,
      lockedRestaurants: [],
      revealedMustEatIds: Array.from(allIds),
    })
    res.headers.set('Cache-Control', 'private, no-store')
    setPremiumAccessCookie(res, allIds, uid)
    return res
  }

  const visible = await composeVisibleRestaurants({
    all,
    allMustEats,
    ent,
    uid,
    freeRestaurantIds: freeSurface.restaurantIds,
  })

  // Face-up for THIS viewer: curated/spot-of-day reveals ∪ on-site unlocks ∪
  // purchased must-eat grants. Everything else ships stripped — covered cards
  // render only the card-back, so the paid fields must not leave the server.
  const faceUpIds = new Set([
    ...visible.revealedMustEatIds,
    ...unlockedIds,
    ...ent.mustEatIds,
  ])
  const hydratedMustEats = await hydrateAuthorizedMustEats(visible.mustEats, faceUpIds)

  const res = NextResponse.json({
    restaurants: visible.restaurants,
    mustEats: stripCoveredMustEats(hydratedMustEats, faceUpIds),
    categories,
    totalCount: all.length,
    lockedRestaurants: stripLockedRestaurants(visible.lockedRestaurants),
    // Client face-up state must be identical to the IDs hydrated above.
    // Otherwise purchased content reaches the browser but still renders as a
    // covered card because entitlements are not duplicated into reveal docs.
    revealedMustEatIds: Array.from(faceUpIds),
  })
  res.headers.set('Cache-Control', 'private, no-store')
  if (uid) {
    setPremiumAccessCookie(res, faceUpIds, uid)
  } else {
    clearPremiumAccessCookie(res)
  }
  return res
}
