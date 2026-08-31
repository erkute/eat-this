'use client';

import { useEffect, useRef } from 'react';
import { auth, getDb } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from '@/lib/i18n';

// Einmal pro Browser-Session UND Konto — gesetzt erst, wenn der Server
// geantwortet hat (siehe unten).
//
// Der Riegel haengt am uid, nicht bloss an der Session: sessionStorage
// ueberlebt den Kontowechsel im selben Tab. Wer dort erst als A angemeldet
// war und sich dann als B neu anmeldet, trug den Riegel von A schon —
// Bs Einladung wurde nie bestaetigt. Beim Testlauf am 31.08.2026 genau so
// passiert: kein einziger Aufruf im Server-Log, und nichts, was darauf
// hingewiesen haette.
const sessionKey = (uid: string) => `referralConfirmFired:${uid}`;

/** sessionStorage kann im privaten Modus werfen; eine fehlende Notiz kostet
 *  hoechstens einen zusaetzlichen No-op-Request. */
function sessionFlag(uid: string): { seen: boolean; mark: () => void } {
  try {
    return {
      seen: sessionStorage.getItem(sessionKey(uid)) !== null,
      mark: () => {
        try {
          sessionStorage.setItem(sessionKey(uid), '1');
        } catch {
          /* private mode */
        }
      },
    };
  } catch {
    return { seen: false, mark: () => {} };
  }
}

export default function ReferralToastListener() {
  const { lang } = useTranslation();
  const langRef = useRef(lang);
  langRef.current = lang;

  // Confirm on authed load. The HttpOnly cookie travels automatically; the
  // server no-ops cheaply when there's no pending referral.
  useEffect(() => {
    // onAuthStateChanged feuert auch bei Token-Refreshes. Die Route ist zwar
    // idempotent (deterministisches Freundes-Dokument in einer Transaktion),
    // aber zwei gleichzeitige Fluege waeren trotzdem zwei Fluege.
    let inFlight = false;
    return onAuthStateChanged(auth, async (user) => {
      if (!user || inFlight) return;
      const flag = sessionFlag(user.uid);
      if (flag.seen) return;
      inFlight = true;
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/referral/confirm', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        /* Der Riegel faellt ERST hier. Er lag vorher vor dem Request: ein
           einziger Netzwerkfehler verbrannte damit den einzigen Versuch
           dieser Browser-Session, und der Nachholversuch kam erst in der
           naechsten — da war das Konto aelter als ACCOUNT_FRESHNESS_MS, die
           Route raeumte den Cookie ab und vergab nichts. Ein abgebrochener
           Request kostete die Einladung endgueltig, ohne Meldung. */
        flag.mark();
      } catch {
        // Netzwerkfehler: Riegel bleibt offen, der naechste Auth-Wechsel oder
        // Seitenaufruf versucht es erneut.
      } finally {
        inFlight = false;
      }
    });
  }, []);

  // Toast the INVITER when a new 'invited' bonus doc arrives. The first
  // snapshot seeds the seen-set so historical bonuses never toast.
  useEffect(() => {
    let unsubBonuses: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubBonuses?.();
      unsubBonuses = null;
      if (!user) return;
      // Code-split Firestore (see getDb) — load on demand inside the auth
      // callback so the SDK stays out of the global first-load bundle.
      let cancelled = false;
      let innerUnsub: (() => void) | null = null;
      unsubBonuses = () => {
        cancelled = true;
        innerUnsub?.();
      };
      void (async () => {
        const [{ collection, onSnapshot }, db] = await Promise.all([
          import('firebase/firestore'),
          getDb(),
        ]);
        if (cancelled) return;
        const seen = new Set<string>();
        let seeded = false;
        const ref = collection(db, 'users', user.uid, 'referralBonuses');
        innerUnsub = onSnapshot(ref, (snap) => {
          if (!seeded) {
            snap.forEach((d) => seen.add(d.id));
            seeded = true;
            return;
          }
          snap.docChanges().forEach((chg) => {
            if (chg.type !== 'added' || seen.has(chg.doc.id)) return;
            seen.add(chg.doc.id);
            if (chg.doc.data().source === 'invited') {
              const msg =
                langRef.current === 'en'
                  ? 'Someone joined through your link — new spots unlocked!'
                  : 'Jemand ist über deinen Link gestartet — neue Spots freigeschaltet!';
              window.showNotification?.(msg, 5000);
            }
          });
        });
      })();
    });
    return () => {
      unsubBonuses?.();
      unsubAuth();
    };
  }, []);

  return null;
}
