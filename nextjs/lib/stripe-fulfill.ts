// Shared fulfillment logic for the Stripe webhook. Idempotent: repeated
// deliveries converge on one transaction and expose whether a different
// paid session needs to be refunded.

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

export type FulfillmentResult =
  | { status: 'created' }
  | {
      status: 'exists'
      existingPackId: string
      existingStripeSessionId: string | null
      guestMagicLinkSent: boolean
    }

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

export async function assembleAndWriteEntitlement({ uid, packId, stripeSessionId }: Args): Promise<FulfillmentResult> {
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

  // Race-safe first-writer-wins: Stripe may deliver multiple events or two
  // paid sessions concurrently. A plain get()-then-set() leaves a window where
  // both read "not exists" and both write. The transaction makes the
  // coverage check and write atomic — exactly one session creates the doc.
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists) {
      const existing = snap.data()
      return {
        status: 'exists' as const,
        existingPackId: packId,
        existingStripeSessionId: typeof existing?.stripeSessionId === 'string'
          ? existing.stripeSessionId
          : null,
        guestMagicLinkSent: Boolean(existing?.guestMagicLinkSentAt),
      }
    }

    // All Berlin already covers every category. This check must also happen
    // during fulfillment because guest Checkout cannot know the buyer's uid
    // until Stripe has collected their email.
    if (pack.type === 'category') {
      const allBerlinSnap = await tx.get(
        db.collection('users').doc(uid).collection('entitlements').doc('all-berlin'),
      )
      if (allBerlinSnap.exists) {
        const existing = allBerlinSnap.data()
        return {
          status: 'exists' as const,
          existingPackId: 'all-berlin',
          existingStripeSessionId: typeof existing?.stripeSessionId === 'string'
            ? existing.stripeSessionId
            : null,
          guestMagicLinkSent: Boolean(existing?.guestMagicLinkSentAt),
        }
      }
    }

    tx.set(ref, doc)
    return { status: 'created' as const }
  })
}

export async function markGuestMagicLinkSent({
  uid,
  packId,
  stripeSessionId,
}: Args): Promise<void> {
  const db = getAdminFirestore()
  const ref = db
    .collection('users').doc(uid)
    .collection('entitlements').doc(packId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? snap.data() : null
    if (!data || data.stripeSessionId !== stripeSessionId) {
      throw new Error(`cannot mark guest email for unmatched entitlement: ${stripeSessionId}`)
    }
    if (data.guestMagicLinkSentAt) return
    tx.update(ref, { guestMagicLinkSentAt: FieldValue.serverTimestamp() })
  })
}
