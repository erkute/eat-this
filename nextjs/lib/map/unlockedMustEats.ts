/** The face-up must-eat set — mirrors the map exactly.
 *  Anonymous: the server-revealed set only — 10 curated cards (one per spot,
 *  see `composeRevealedMustEats`) plus the daily spot-of-day gift on top.
 *  Signed-in: stored Firestore unlocks ∪ server-revealed set. Everything else
 *  stays face-down until revealed on site (50 m proximity).
 *
 *  This is the single source of truth for "which must-eats render face-up"
 *  across the map, the /must-eats gallery, the profile collection and the
 *  /home teaser. */
export function resolveUnlockedMustEatIds(args: {
  uid: string | null
  storedUnlockedIds: Set<string>
  revealedMustEatIds: Set<string>
  /** The server-computed anon face-up set — "publicly face-up means face-up
   *  everywhere", so it's unioned in for signed-in users too (the signed-in
   *  /api/map-data ships `revealedMustEatIds: []`). Ids not present in the
   *  consumer's dataset are inert. Compute it from `getInitialAnonMapData()`. */
  publicFaceUpIds?: Set<string>
}): Set<string> {
  const { uid, storedUnlockedIds, revealedMustEatIds, publicFaceUpIds } = args
  const out = uid
    ? new Set<string>([...storedUnlockedIds, ...revealedMustEatIds])
    : new Set<string>(revealedMustEatIds)
  if (publicFaceUpIds) for (const id of publicFaceUpIds) out.add(id)
  return out
}
