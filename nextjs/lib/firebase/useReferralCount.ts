'use client';
import { useEffect, useState } from 'react';
import { getDb } from './config';

/**
 * Wie viele Freunde über den eigenen Link gestartet sind.
 *
 * Die Bonus-Dokumente liegen seit dem ersten Tag unter
 * `users/{uid}/referralBonuses` und sind für den Eigentümer lesbar
 * (firestore.rules) — gelesen hat sie im Profil nur nie jemand. Der gelbe
 * Einladen-Kasten sah nach zwanzig Anmeldungen genauso aus wie nach keiner,
 * und die einzige Rückmeldung war ein Toast, der nur feuerte, wenn man in
 * genau dieser Sekunde die Seite offen hatte: ReferralToastListener impft
 * seinen ersten Snapshot als „gesehen", historische Boni melden sich also nie
 * nach. Wer zwischendurch zumachte, erfuhr es nicht mehr.
 *
 * `source === 'invited'` ist die Einladenden-Seite. Das Gegenstück
 * (`'invited-by'`, der eigene Willkommens-Bonus) zählt hier nicht mit — sonst
 * behauptete jedes eingeladene Konto, selbst schon eingeladen zu haben.
 *
 * `null` heißt „noch nicht geladen" und bleibt es auch, wenn der Listener
 * scheitert: eine Null zu behaupten, weil Firestore nicht antwortet, wäre die
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
