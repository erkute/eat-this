import type { MapMustEat } from '@/lib/types'

/** Primary must-eat per restaurant = lowest `order` (stable: first wins on ties
 *  and when order is undefined). Keyed by restaurant._id. */
export function buildPrimaryMustEatMap(mustEats: MapMustEat[]): Map<string, MapMustEat> {
  const map = new Map<string, MapMustEat>()
  for (const m of mustEats) {
    const restId = m.restaurant._id
    const current = map.get(restId)
    if (!current) {
      map.set(restId, m)
      continue
    }
    const a = m.order ?? Number.POSITIVE_INFINITY
    const b = current.order ?? Number.POSITIVE_INFINITY
    if (a < b) map.set(restId, m)
  }
  return map
}

/** Restaurant-list badge card. Prefer a face-up must-eat for the viewer; if
 *  none exists, fall back to the restaurant's primary covered card.
 */
export function buildPeekMustEatMap(
  mustEats: MapMustEat[],
  faceUpIds: ReadonlySet<string>,
): Map<string, MapMustEat> {
  const map = new Map<string, MapMustEat>()
  for (const m of mustEats) {
    const restId = m.restaurant._id
    const current = map.get(restId)
    if (!current) {
      map.set(restId, m)
      continue
    }

    const mFaceUp = faceUpIds.has(m._id)
    const currentFaceUp = faceUpIds.has(current._id)
    if (mFaceUp !== currentFaceUp) {
      if (mFaceUp) map.set(restId, m)
      continue
    }

    const a = m.order ?? Number.POSITIVE_INFINITY
    const b = current.order ?? Number.POSITIVE_INFINITY
    if (a < b) map.set(restId, m)
  }
  return map
}

export type Peek =
  | { kind: 'none' }
  | { kind: 'covered' }
  | { kind: 'open'; image: string }

/** Face-up when the must-eat is unlocked OR pre-revealed for anon; otherwise
 *  the card-back. `revealedIds` is empty for signed-in users → uniform rule. */
export function resolvePeek(
  primary: MapMustEat | undefined,
  unlockedIds: Set<string>,
  revealedIds: Set<string>,
): Peek {
  if (!primary) return { kind: 'none' }
  if (unlockedIds.has(primary._id) || revealedIds.has(primary._id)) {
    return primary.image ? { kind: 'open', image: primary.image } : { kind: 'covered' }
  }
  return { kind: 'covered' }
}
