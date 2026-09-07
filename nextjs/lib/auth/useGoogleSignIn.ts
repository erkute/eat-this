'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { describeGoogleSignInError } from './googleSignInError';
import { trackEvent } from '@/lib/analytics';
import { AUTH_SCREEN_HOLD_MS } from '@/app/components/AuthScreen';

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
 *
 * Phasen:
 * - `busy`: das Fenster ist offen oder geht gerade auf — der Wartescreen
 *   liegt über der Seite.
 * - `done`: Firebase hat geantwortet. Der Wartescreen bleibt noch die
 *   Haltezeit stehen (AUTH_SCREEN_HOLD_MS), sonst ist er weg, bevor man ihn
 *   gelesen hat; danach meldet sich `onSettled`.
 * - `leaving`: Abbruch oder Fehler — der Wartescreen fährt zurück und räumt
 *   sich nach der Rückfahrt selbst ab. Eine eigene Phase statt eines
 *   Schalters, weil das Panel vorher auf einen Schlag wegsprang und ein
 *   selbst zugeklicktes Google-Fenster wie ein Aussetzer aussah.
 */
export type GoogleSignInPhase = 'idle' | 'busy' | 'done' | 'leaving';
export type GoogleSignInNote = 'cancelled' | 'blocked' | 'failed' | null;

const LEAVE_MS = 260;

/** Die Zeile zu jeder Note — Schlüssel in translations.ts, mit `auth.`-Präfix:
 *  ohne findet next-intl den Text nicht und schreibt dem Leser den Schlüssel
 *  selbst hin (Nutzer, 28.08.2026). Einmal hier, nicht in jedem Knopf. */
const NOTE_KEY: Record<NonNullable<GoogleSignInNote>, string> = {
  cancelled: 'auth.googleCancelled',
  blocked: 'auth.errGooglePopupBlocked',
  failed: 'auth.errGooglePopup',
};

export function useGoogleSignIn(options: { onSettled?: () => void } = {}): {
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
  const onSettled = useRef(options.onSettled);
  onSettled.current = options.onSettled;

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
      setPhase('done');
    } catch (error) {
      viaGoogle.current = false;
      setPhase('leaving');
      /* Auch der Abbruch bekommt eine Zeile — nur eine ruhige. Firebase
         meldet ein zugeklicktes Fenster und eine gescheiterte Übergabe mit
         demselben Code; wer danach stumm wieder vor dem Knopf stand, wusste
         nicht, ob er selbst schuld war. */
      const { benign, blocked } = describeGoogleSignInError(error);
      setNote(benign ? 'cancelled' : blocked ? 'blocked' : 'failed');
    }
  }, [signInWithGoogle]);

  useEffect(() => {
    if (phase !== 'leaving' && phase !== 'done') return;
    const timer = window.setTimeout(
      () => {
        setPhase('idle');
        if (phase === 'done') onSettled.current?.();
      },
      phase === 'done' ? AUTH_SCREEN_HOLD_MS : LEAVE_MS
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  return {
    phase,
    note,
    noteKey: note ? NOTE_KEY[note] : null,
    prepare: prepareGoogleSignIn,
    start,
  };
}
