'use client'
import { useMemo } from 'react'
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements'

/* Single source of truth for "what does the map show this user".
   - anon:      no uid → soft anon nudges (starter pitch + locked-card prompt).
   - starter:   uid + may have starter and/or some category packs → booster pitch
                for All Berlin still relevant.
   - allBerlin: uid + has 'all-berlin' entitlement → clean experience, no promo.

   Entitlement doc IDs in Firestore use the packId convention; the 'all-berlin'
   pack lives at `users/{uid}/entitlements/all-berlin`. */
export type UserTier = 'anon' | 'starter' | 'allBerlin'

export function useUserTier(uid: string | null): UserTier {
  const owned = useOwnedEntitlements(uid)
  return useMemo(() => {
    if (!uid) return 'anon'
    if (owned?.has('all-berlin')) return 'allBerlin'
    return 'starter'
  }, [uid, owned])
}
