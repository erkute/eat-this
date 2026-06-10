// Server-only. Do not import this from a client component — firebase-admin
// pulls Node-only modules and will break the browser build.

import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from './admin'
import type { MapMustEat } from '@/lib/types'

function unlockedCollection(uid: string) {
  return getAdminFirestore().collection('users').doc(uid).collection('unlockedMustEats')
}

/** IDs of the must-eats this user has revealed on site. Doc IDs only — the
 *  doc payload (dish, restaurantId) is informational and not needed here. */
export async function getUnlockedMustEatIds(uid: string): Promise<Set<string>> {
  const snap = await unlockedCollection(uid).select().get()
  return new Set(snap.docs.map((d) => d.id))
}

/** Persist an on-site reveal. Same doc shape the client used to write
 *  directly; idempotent so re-revealing is harmless. */
export async function unlockMustEat(uid: string, mustEat: MapMustEat): Promise<void> {
  await unlockedCollection(uid).doc(mustEat._id).set(
    {
      restaurantId: mustEat.restaurant._id,
      dish: mustEat.dish ?? '',
      unlockedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}
