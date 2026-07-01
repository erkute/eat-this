import { NextResponse } from 'next/server'
import { getAllNewsArticles } from '@/lib/sanity.server'
import { getAdminAuth } from '@/lib/firebase/admin'
import { resolveEntitlements } from '@/lib/firebase/entitlements'
import { getCachedMapData } from '@/lib/map/cached-sanity'
import { getFreeSurfaceData } from '@/lib/map/free-surface'
import { composeVisibleRestaurants } from '@/lib/map/visible-restaurants.server'
import type { MapRestaurant } from '@/lib/types'

// Per-user response. Entitlement-gated mirror of /api/map-data — search
// visibility tracks map visibility so the overlay doesn't expose the
// catalog. News are always fully searchable (content marketing, not
// paywall material).
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
      // Expired / invalid → treat as anonymous; client retries after token refresh.
    }
  }

  const [ent, { restaurants: all, mustEats: allMustEats }, freeSurface, news] =
    await Promise.all([
      resolveEntitlements(uid, identity),
      getCachedMapData(),
      getFreeSurfaceData(),
      getAllNewsArticles(),
    ])

  let restaurants: MapRestaurant[]
  if (ent.isAdmin || ent.hasAllBerlin) {
    restaurants = all
  } else {
    const visible = await composeVisibleRestaurants({
      all,
      allMustEats,
      ent,
      uid,
      freeRestaurantIds: freeSurface.restaurantIds,
    })
    restaurants = visible.restaurants
  }

  const res = NextResponse.json({ restaurants, news })
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
