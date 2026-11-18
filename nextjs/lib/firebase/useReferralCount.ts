'use client';
import { useEffect, useState } from 'react';
import { getDb } from './config';

/**
 * Wie viele Freunde über den eigenen Link gestartet sind.
 *
 * Die Bonus-Dokumente liegen unter `users/{uid}/referralBonuses` und sind für
 * den Eigentümer lesbar (firestore.rules). Ohne diese Zahl sähe der
 * Einladen-Kasten nach zwanzig Anmeldungen genauso aus wie nach keiner: Die
 * einzige andere Rückmeldung ist ein Toast, der nur feuert, wenn man in genau
 * dieser Sekunde die Seite offen hat (ReferralToastListener impft seinen ersten
 * Snapshot als „gesehen", historische Boni melden sich also nie nach).
 *
 * `source === 'invited'` ist die Einladenden-Seite. Das Gegenstück
 * (`'invited-by'`, der eigene Willkommens-Bonus) zählt hier nicht mit; sonst
 * behauptete jedes eingeladene Konto, selbst schon eingeladen zu haben.
 *
 * `null` heißt „noch nicht geladen" und bleibt es auch, wenn der Listener
 * scheitert: Eine Null zu behaupten, weil Firestore nicht antwortet, wäre die
 * schlechtere Auskunft als gar keine.
 */
export function useReferralCount(uid: string | null): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) {
      setCount(null);
      return;
    }
    setCount(null);
    let active = true;
    let unsub = () => {};

    void (async () => {
      try {
        // Firestore ist code-gesplittet (siehe getDb) — erst hier laden, damit
        // das SDK nicht im globalen First-Load-Bundle landet.
        const [{ collection, onSnapshot, query, where }, db] = await Promise.all([
          import('firebase/firestore'),
          getDb(),
        ]);
        if (!active) return;
        unsub = onSnapshot(
          query(collection(db, 'users', uid, 'referralBonuses'), where('source', '==', 'invited')),
          (snap) => setCount(snap.size),
          () => {
            /* s. o. — auf null bleiben, nicht auf 0 fallen. */
          }
        );
      } catch {
        /* getDb() abgelehnt — dito. */
      }
    })();

    return () => {
      active = false;
      unsub();
    };
  }, [uid]);

  return count;
}
