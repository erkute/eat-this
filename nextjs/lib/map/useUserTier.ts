'use client';
import { useMemo } from 'react';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';

/* Single source of truth for "what does the map show this user".
   - anon:      no uid → soft anon nudges (starter pitch + locked-card prompt).
   - pending:   uid, but the entitlement set has not arrived yet.
   - starter:   uid + may have starter and/or some category packs → booster pitch
                for All Berlin still relevant.
   - allBerlin: uid + has 'all-berlin' entitlement → clean experience, no promo.

   Entitlement doc IDs in Firestore use the packId convention; the 'all-berlin'
   pack lives at `users/{uid}/entitlements/all-berlin`. */
export type UserTier = 'anon' | 'pending' | 'starter' | 'allBerlin';

export function useUserTier(uid: string | null): UserTier {
  const owned = useOwnedEntitlements(uid);
  return useMemo(() => {
    if (!uid) return 'anon';
    /* `null` heißt „noch nicht geladen", nicht „besitzt nichts". Bis zum
       01.09.2026 fiel dieser Fall auf 'starter' durch, und ein All-Berlin-Konto
       bekam auf jedem Gerät ohne warmen localStorage-Cache (neues Gerät,
       privates Fenster, geleerter Speicher, langsame Verbindung) erst einmal
       die Kaufbanner zu sehen — für jemanden, der bezahlt hat. */
    if (owned === null) return 'pending';
    if (owned.has('all-berlin')) return 'allBerlin';
    return 'starter';
  }, [uid, owned]);
}

/**
 * Darf dieser Zustand eine Pack-Werbefläche zeigen?
 *
 * Eine Funktion statt `tier !== 'allBerlin'` an jeder Fläche: die Verneinung war
 * an zwei Stellen ausgeschrieben und beide bekamen den Ladezustand falsch. Wer
 * die nächste Promo baut, fragt hier — und die Antwort ist im Zweifel nein.
 * Eine Werbung lässt sich eine Sekunde später immer noch einblenden;
 * zurücknehmen lässt sie sich nicht.
 */
export function showsPackPromos(tier: UserTier): boolean {
  return tier === 'anon' || tier === 'starter';
}
