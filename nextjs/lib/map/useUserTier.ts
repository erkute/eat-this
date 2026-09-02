'use client';
import { useMemo } from 'react';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';

/* Single source of truth for "what does the map show this user".
   - anon:      auth resolved, no uid → soft anon nudges (starter pitch +
                locked-card prompt).
   - pending:   auth still resolving, or uid but neither the entitlement set nor
                the map payload for this account has arrived yet.
   - starter:   uid + may have starter and/or some category packs → booster pitch
                for All Berlin still relevant.
   - allBerlin: uid + the whole catalogue is open → clean experience, no promo.

   Entitlement doc IDs in Firestore use the packId convention; the 'all-berlin'
   pack lives at `users/{uid}/entitlements/all-berlin`. */
export type UserTier = 'anon' | 'pending' | 'starter' | 'allBerlin';

/** Was Auth und Server über dieses Konto bisher gesagt haben. */
export interface MapSurface {
  /** Firebase hat den Nutzer noch nicht gemeldet. Solange ist `uid === null`
      nicht „Gast", sondern „unbekannt" — und ein angemeldeter Besucher sah in
      diesem Fenster auf jedem Laden das Banner, das im SSR-HTML ohnehin steht. */
  authLoading: boolean;
  /** Admin oder All-Berlin: ganzer Katalog, alles offen. */
  fullCatalog: boolean;
  /** Die uid, FÜR die die Payload geholt wurde; null, solange es der anonyme
      Stand ist. Erst wenn sie zur angemeldeten uid passt, hat der Server über
      dieses Konto gesprochen. */
  dataUid: string | null;
}

/**
 * Reine Ableitung, damit sie ohne Firestore und ohne React testbar ist.
 *
 * Zwei Quellen, und keine reicht allein. Der Firestore-Listener kennt nur
 * users/<uid>/entitlements — nicht den Admin-Zugang, der an ADMIN_EMAILS plus
 * verifizierter Adresse hängt und server-only ist. Das Konto, das ihn nutzt,
 * hat null Entitlement-Dokumente; der Listener meldete darum brav „besitzt
 * nichts", und die Live-Karte zeigte am 02.09.2026 dem eigenen Admin-Konto
 * das All-Berlin-Banner, während dieselbe Payload `fullCatalog: true` und
 * 467 offene Spots trug. Der Server dagegen antwortet erst nach dem Fetch —
 * ein bezahltes Konto wartet auf ihn länger als auf den Listener. Also: jede
 * positive Antwort zählt sofort, und solange eine der beiden noch aussteht,
 * bleibt es 'pending'. Werbung lässt sich später einblenden, nicht zurücknehmen.
 */
export function resolveUserTier({
  uid,
  owned,
  fullCatalog,
  dataUid,
  authLoading,
}: MapSurface & { uid: string | null; owned: ReadonlySet<string> | null }): UserTier {
  if (!uid) return authLoading ? 'pending' : 'anon';
  if (fullCatalog && dataUid === uid) return 'allBerlin';
  if (owned?.has('all-berlin')) return 'allBerlin';
  if (owned === null || dataUid !== uid) return 'pending';
  return 'starter';
}

export function useUserTier(uid: string | null, surface: MapSurface): UserTier {
  const owned = useOwnedEntitlements(uid);
  const { fullCatalog, dataUid, authLoading } = surface;
  return useMemo(
    () => resolveUserTier({ uid, owned, fullCatalog, dataUid, authLoading }),
    [uid, owned, fullCatalog, dataUid, authLoading]
  );
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
