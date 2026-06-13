// Shared fulfillment logic — called by both /api/stripe/webhook (primary)
// and /api/stripe/fulfill (fallback when the success page polls and the
// webhook hasn't arrived yet). Idempotent: both paths converge on the
// same getDoc-then-set pattern, first-writer-wins.

import { getAdminAuth, getAdminFirestore } from './firebase/admin'
import { client as sanity }  from './sanity'
import { getPack } from './stripe-catalog'
import type { Entitlement } from './firebase/entitlements'
import { FieldValue, type WithFieldValue } from 'firebase-admin/firestore'

// For guest Stripe purchases: resolve the buyer's email (collected by
// Stripe Hosted Checkout) to a Firebase Auth uid. If the user doesn't
// exist yet, create a passwordless shell — they'll claim it via a
// magic-link emailed right after the webhook fulfils the entitlement.
export async function findOrCreateUserByEmail(email: string): Promise<string> {
  const auth = getAdminAuth()
  try {
    const existing = await auth.getUserByEmail(email)
    return existing.uid
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'auth/user-not-found') {
      const user = await auth.createUser({ email })
      return user.uid
    }
    throw err
  }
}

interface Args {
  uid: string
  packId: string
  stripeSessionId: string
}

type Result = 'created' | 'exists'

// For category entitlements, restaurantIds are derived from the mustEatIds'
// parent restaurants. We query both in one Sanity round-trip to avoid two
// cold fetches.
async function categoryEntitlementPayload(slug: string): Promise<{ mustEatIds: string[]; restaurantIds: string[] }> {
  const rows = await sanity.fetch<{ _id: string; rid: string | null }[]>(
    `*[_type == "mustEat" && defined(image.asset) && defined(restaurantRef._ref) && restaurantRef->isOpen != false && $slug in restaurantRef->categories[defined(@->_id)]->slug.current]{ _id, "rid": restaurantRef._ref }`,
    { slug },
  )
  const mustEatIds = rows.map((r) => r._id)
  const restaurantIds = [...new Set(rows.map((r) => r.rid).filter((x): x is string => Boolean(x)))]
  return { mustEatIds, restaurantIds }
}

export async function assembleAndWriteEntitlement({ uid, packId, stripeSessionId }: Args): Promise<Result> {
  const pack = getPack(packId)
  if (!pack) throw new Error(`unknown pack: ${packId}`)

  const db = getAdminFirestore()
  const ref = db
    .collection('users').doc(uid)
    .collection('entitlements').doc(packId)

  // Resolve the category payload BEFORE the transaction — it's a read-only,
  // idempotent Sanity round-trip and must not run inside Firestore's
  // transaction (which only permits Firestore reads). Doing it here also
  // keeps the transaction's read→write window tiny.
  let restaurantIds: string[] = []
  let mustEatIds:    string[] = []
  if (pack.type === 'category' && pack.slug) {
    const payload = await categoryEntitlementPayload(pack.slug)
    restaurantIds = payload.restaurantIds
    mustEatIds    = payload.mustEatIds
  }

  const doc: WithFieldValue<Entitlement> = {
    type:            pack.type,
    slug:            pack.slug,
    restaurantIds,
    mustEatIds,
    purchasedAt:     FieldValue.serverTimestamp(),
    stripeSessionId,
    source:          'stripe',
  }

  // Race-safe first-writer-wins: webhook and the success-page poll can both
  // reach here concurrently. A plain get()-then-set() leaves a window where
  // both read "not exists" and both write. The transaction makes the
  // exists-check and the write atomic — exactly one path creates the doc.
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists) return 'exists'
    tx.set(ref, doc)
    return 'created'
  })
}
