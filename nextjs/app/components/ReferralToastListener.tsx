'use client';

import { useEffect, useRef } from 'react';
import { auth, getDb } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from '@/lib/i18n';
import { takePendingStarterCard } from '@/lib/auth/pendingStarterCard';

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
const starterKey = (uid: string) => `starterPackFired:${uid}`;

/** sessionStorage kann im privaten Modus werfen; eine fehlende Notiz kostet
 *  hoechstens einen zusaetzlichen No-op-Request. */
function sessionFlag(key: string): { seen: boolean; mark: () => void } {
  try {
    return {
      seen: sessionStorage.getItem(key) !== null,
      mark: () => {
        try {
          sessionStorage.setItem(key, '1');
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

  /* Die zwei Dinge, die nach einer Anmeldung serverseitig passieren muessen:
     die Einladung bestaetigen und das Starter Pack einloesen. Beide haengen an
     DIESEM einen Auth-Listener und nicht an zweien — `onAuthStateChanged`
     feuert auch bei jedem Token-Refresh, ein zweiter Listener waere also ein
     zweiter Flug pro Refresh.

     Getrennte Riegel, weil die Fristen verschieden sind: die Einladung ist an
     ACCOUNT_FRESHNESS_MS gebunden und muss frueh gelingen, das Starter Pack
     kennt keine Frist und darf beliebig oft nachfassen, bis es sitzt. */
  useEffect(() => {
    let inFlight = false;
    return onAuthStateChanged(auth, async (user) => {
      if (!user || inFlight) return;
      const flag = sessionFlag(sessionKey(user.uid));
      const starter = sessionFlag(starterKey(user.uid));
      if (flag.seen && starter.seen) return;
      inFlight = true;
      try {
        const idToken = await user.getIdToken();
        if (!starter.seen) {
          /* Ein Konto bekommt sein Pack genau einmal — die Route haelt das
             ueber die Doc-ID fest, dieser Riegel spart nur den Request.

             Die Karte, die der Gast auf der Map angetippt hat, faehrt mit:
             die Anmelde-Tafel hat „diese ist dabei" versprochen, und die
             Route legt sie offen ins Pack (siehe pendingStarterCard). */
          const mustEatId = takePendingStarterCard();
          const res = await fetch('/api/starter-pack', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${idToken}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify(mustEatId ? { mustEatId } : {}),
          });
          if (res.ok) starter.mark();
        }
        if (flag.seen) return;
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
              /* Eine Karte, keine Spots: seit dem 06.09.2026 zahlt die
                 Einladung in Must-Eat-Karten, die Spots liegen fuer jeden
                 frei. NotificationToast erkennt die Zeile an „deinen Link" /
                 „your link" und setzt Augenbraue und Titel dazu. */
              const msg =
                langRef.current === 'en'
                  ? 'Someone joined through your link — a new card is in your deck.'
                  : 'Jemand ist über deinen Link gestartet — eine neue Karte liegt in deinem Deck.';
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
