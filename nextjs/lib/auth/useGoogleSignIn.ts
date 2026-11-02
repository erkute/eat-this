'use client';

import { useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { describeGoogleSignInError } from './googleSignInError';
import { trackEvent } from '@/lib/analytics';

/** Der Google-Knopf teilt Ladezustand, Vorwärmen und Fehlermeldungen zwischen
 * Login-Modal und Starter-Pack-Formular. Erfolgreiche Anmeldungen zählt der
 * AuthProvider anhand des Firebase-Ergebnisses, auch nach einem Redirect. */
type GoogleSignInPhase = 'idle' | 'busy';
type GoogleSignInNote = 'cancelled' | 'blocked' | 'failed' | null;

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
  const { signInWithGoogle, prepareGoogleSignIn } = useAuth();
  const [phase, setPhase] = useState<GoogleSignInPhase>('idle');
  const [note, setNote] = useState<GoogleSignInNote>(null);
  const start = useCallback(async () => {
    trackEvent('login_start', { method: 'google' });
    setPhase('busy');
    setNote(null);
    try {
      await signInWithGoogle();
    } catch (error) {
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
