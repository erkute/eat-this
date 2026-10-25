'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { describeGoogleSignInError } from './googleSignInError';
import { trackEvent } from '@/lib/analytics';

/**
 * Der Google-Knopf hinter jeder Oberfläche, die ihn anbietet — das
 * Login-Modal und das Starter-Pack-Formular auf der Startseite.
 *
 * Bis 07.09.2026 lebte das alles im LoginPanel: die drei Phasen, die stille
 * Abbruch-Zeile, das sign_up/login-Ereignis nach der Antwort. Die Startseite
 * hatte keinen Google-Knopf, und hätte sie einen bekommen, wäre er eine
 * zweite Abschrift geworden — samt der Stelle, an der ein zugeklicktes
 * Fenster und eine gescheiterte Übergabe denselben Code tragen
 * (googleSignInError.ts). Ein Hook, zwei Knöpfe.
 */
export type GoogleSignInPhase = 'idle' | 'busy';
export type GoogleSignInNote = 'cancelled' | 'blocked' | 'failed' | null;

/** Die Zeile zu jeder Note — Schlüssel in translations.ts, mit `auth.`-Präfix:
 *  ohne findet next-intl den Text nicht und schreibt dem Leser den Schlüssel
 *  selbst hin (Nutzer, 28.08.2026). Einmal hier, nicht in jedem Knopf. */
const NOTE_KEY: Record<NonNullable<GoogleSignInNote>, string> = {
  cancelled: 'auth.googleCancelled',
  blocked: 'auth.errGooglePopupBlocked',
  failed: 'auth.errGooglePopup',
};

export function useGoogleSignIn(): {
  phase: GoogleSignInPhase;
  note: GoogleSignInNote;
  /** Übersetzungsschlüssel zur Note, für `t()` — null ohne Note. */
  noteKey: string | null;
  /** Lädt Firebases Popup-Helfer vor — siehe googlePopupWarmup.ts. */
  prepare: () => void;
  start: () => Promise<void>;
} {
  const { user, signInWithGoogle, prepareGoogleSignIn } = useAuth();
  const [phase, setPhase] = useState<GoogleSignInPhase>('idle');
  const [note, setNote] = useState<GoogleSignInNote>(null);
  const viaGoogle = useRef(false);

  useEffect(() => {
    if (!user || !viaGoogle.current) return;
    viaGoogle.current = false;
    const created = new Date(user.metadata.creationTime ?? 0).getTime();
    const signedIn = new Date(user.metadata.lastSignInTime ?? 0).getTime();
    const event = Math.abs(signedIn - created) < 10_000 ? 'sign_up' : 'login';
    trackEvent(event, { method: 'google' });
  }, [user]);

  const start = useCallback(async () => {
    viaGoogle.current = true;
    trackEvent('login_start', { method: 'google' });
    setPhase('busy');
    setNote(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      viaGoogle.current = false;
      /* Auch der Abbruch bekommt eine Zeile — nur eine ruhige. Firebase
         meldet ein zugeklicktes Fenster und eine gescheiterte Übergabe mit
         demselben Code; wer danach stumm wieder vor dem Knopf stand, wusste
         nicht, ob er selbst schuld war. */
      const { benign, blocked } = describeGoogleSignInError(error);
      setNote(benign ? 'cancelled' : blocked ? 'blocked' : 'failed');
    } finally {
      setPhase('idle');
    }
  }, [signInWithGoogle]);

  return {
    phase,
    note,
    noteKey: note ? NOTE_KEY[note] : null,
    prepare: prepareGoogleSignIn,
    start,
  };
}
