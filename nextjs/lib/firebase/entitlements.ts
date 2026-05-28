// Server-only. Do not import this from a client component — firebase-admin
// pulls Node-only modules and will break the browser build.

import { getAdminFirestore } from './admin'

export interface Entitlement {
  type: 'category' | 'all-berlin'
  slug: string | null
  restaurantIds: string[]
  mustEatIds: string[]
  purchasedAt: FirebaseFirestore.Timestamp
  stripeSessionId: string | null
  source: 'signup' | 'ensure-on-demand' | 'stripe' | 'manual'
}

export interface ResolvedEntitlements {
  isAdmin:       boolean
  hasAllBerlin:  boolean
  categorySlugs: Set<string>
  restaurantIds: Set<string>
  mustEatIds:    Set<string>
}

const EMPTY_RESOLVED = (): ResolvedEntitlements => ({
  isAdmin:       false,
  hasAllBerlin:  false,
  categorySlugs: new Set(),
  restaurantIds: new Set(),
  mustEatIds:    new Set(),
})

// Pure reducer — exported separately so it's testable without mocking Firestore.
// `bonuses` carries referral-bonus restaurantIds (Plan 4); they union into the
// same restaurantIds set the map-data visible-set logic already honors.
export function reduceEntitlements(
  docs: Entitlement[],
  bonuses: { restaurantIds?: string[] }[] = [],
): ResolvedEntitlements {
  const out = EMPTY_RESOLVED()
  for (const data of docs) {
    if (data.type === 'all-berlin') {
      out.hasAllBerlin = true
    } else if (data.type === 'category' && data.slug) {
      out.categorySlugs.add(data.slug)
    }
    for (const id of data.restaurantIds) out.restaurantIds.add(id)
    for (const id of data.mustEatIds)    out.mustEatIds.add(id)
  }
  for (const b of bonuses) {
    for (const id of b.restaurantIds ?? []) out.restaurantIds.add(id)
  }
  return out
}

export function isAdminEmail(email: string | null): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

// Firestore-reading wrapper. Anonymous users (uid === null) get an empty
// resolved view — the map gate (separate plan) redirects them to /login.
export async function resolveEntitlements(
  uid:   string | null,
  email: string | null,
): Promise<ResolvedEntitlements> {
  if (!uid) return EMPTY_RESOLVED()

  if (isAdminEmail(email)) {
    return { ...EMPTY_RESOLVED(), isAdmin: true, hasAllBerlin: true }
  }

  const userRef = getAdminFirestore().collection('users').doc(uid)
  const [entSnap, bonusSnap] = await Promise.all([
    userRef.collection('entitlements').get(),
    userRef.collection('referralBonuses').get(),
  ])

  const docs = entSnap.docs.map((d) => d.data() as Entitlement)
  const bonuses = bonusSnap.docs.map((d) => ({
    restaurantIds: (d.data().restaurantIds ?? []) as string[],
  }))
  return reduceEntitlements(docs, bonuses)
}

// Visibility predicates — used by /api/map-data (separate plan) to filter
// the Sanity result set against a ResolvedEntitlements view.
export function isRestaurantVisible(
  r: { _id: string; categories?: { slug: string }[] },
  ent: ResolvedEntitlements,
): boolean {
  if (ent.isAdmin || ent.hasAllBerlin) return true
  if (ent.restaurantIds.has(r._id)) return true
  return r.categories?.some((c) => ent.categorySlugs.has(c.slug)) ?? false
}

