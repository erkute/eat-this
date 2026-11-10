'use client';

import { useEffect, useRef } from 'react';
import { auth, getDb } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from '@/lib/i18n';
import { takePendingStarterCard } from '@/lib/auth/pendingStarterCard';
import { announceStarterPackGranted, settleArrival } from '@/lib/auth/signInArrival';
import { trackEvent } from '@/lib/analytics';
import { notify } from '@/lib/notice';
import { confirmReferral } from '@/lib/referral/confirm';

// Abschluss wird je Konto erst nach bestätigtem Server-Ergebnis gespeichert.
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

  useEffect(() => {
    let controller: AbortController | null = null;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      controller?.abort();
      controller = null;
      if (!user) return;
      const current = new AbortController();
      controller = current;
      const { signal } = current;
      const flag = sessionFlag(sessionKey(user.uid));
      const starter = sessionFlag(starterKey(user.uid));
      if (starter.seen) settleArrival(user.uid, false);
      void (async () => {
        let granted = false;
        if (!starter.seen) {
          try {
            const idToken = await user.getIdToken();
            if (signal.aborted) return;
            const mustEatId = takePendingStarterCard();
            const res = await fetch('/api/starter-pack', {
              method: 'POST',
              headers: {
                authorization: `Bearer ${idToken}`,
                'content-type': 'application/json',
              },
              body: JSON.stringify(mustEatId ? { mustEatId } : {}),
              signal,
            });
            if (res.ok && !signal.aborted) {
              const outcome = await res.json();
              starter.mark();
              if (outcome?.granted === true) {
                trackEvent('starter_pack_granted');
                announceStarterPackGranted(
                  Array.isArray(outcome.faceUpIds)
                    ? outcome.faceUpIds.filter(
                        (id: unknown): id is string => typeof id === 'string'
                      )
                    : []
                );
                granted = true;
              }
            }
          } catch {
            // Die Einladung wird unabhängig vom Starter-Pack erneut versucht.
          }
          if (!signal.aborted) settleArrival(user.uid, granted);
        }
        if (!flag.seen && (await confirmReferral(() => user.getIdToken(), signal))) {
          if (!signal.aborted) flag.mark();
        }
      })();
    });
    return () => {
      controller?.abort();
      unsubscribe();
    };
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
            const bonus = chg.doc.data();
            if (
              bonus.source === 'invited' &&
              Array.isArray(bonus.mustEatIds) &&
              bonus.mustEatIds.length > 0
            ) {
              notify('inviteCard', langRef.current, { duration: 5000 });
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
