// Server-only. Do not import this from a client component — firebase-admin
// pulls Node-only modules and will break the browser build.

import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from './admin'
import type { MapMustEat } from '@/lib/types'

function unlockedCollection(uid: string) {
  return getAdminFirestore().collection('users').doc(uid).collection('unlockedMustEats')
}

/** IDs of the must-eats this user has revealed on site. */
export async function getUnlockedMustEatIds(uid: string): Promise<Set<string>> {
  const snap = await unlockedCollection(uid).select().get()
  return new Set(snap.docs.map((d) => d.id))
}

/** Persist only non-sensitive reveal metadata. A replacing write deliberately
 *  removes the legacy owner-readable `dish` field if the card is re-revealed. */
export async function unlockMustEat(
  uid: string,
  mustEat: Pick<MapMustEat, '_id' | 'restaurant'>,
): Promise<void> {
  await unlockedCollection(uid).doc(mustEat._id).set({
    restaurantId: mustEat.restaurant._id,
    unlockedAt: FieldValue.serverTimestamp(),
  })
}
