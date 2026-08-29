'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@/lib/i18n';
import styles from './AuthScreen.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';
const CARD_FRONT = '/pics/card-front.webp';

/**
 * Wie lange der Screen mindestens stehen bleibt, bevor die Seite ihn wegnimmt.
 *
 * An- und Abmelden selbst dauern Millisekunden. Ohne diese Haltezeit war der
 * Screen wieder weg, bevor man ihn gelesen hatte (Nutzer, 29.08.2026) — beim
 * Abmelden reisst ProfileAuthGuard die Seite weg, sobald Firebase `null`
 * meldet, beim Anmelden schliesst BridgeAuth in derselben Runde das Modal, an
 * dem der Screen haengt.
 *
 * 2200ms sind der Aufgang (420ms) plus ein voller Faecher-Durchlauf (1700ms):
 * die Karten stehen beim Schnitt wieder in ihrer Ausgangslage. Eine Zahl fuer
 * beide Richtungen — sie sollen sich gleich anfuehlen.
 */
export const AUTH_SCREEN_HOLD_MS = 2200;

interface Props {
  /** 'in' meldet an, 'out' meldet ab — Kicker, Zeile und Fächerrichtung folgen. */
  mode: 'in' | 'out';
  /** Der Screen fährt gerade zurück (Abbruch); rendert die Rückwärtsbewegung. */
  leaving?: boolean;
}

/**
 * Der Moment zwischen Klick und Antwort — für beide Richtungen.
 *
 * Er spricht die Sprache des Must-Eat-Onboardings statt die des Login-Modals:
 * Ink-Grund, gelber Kicker, Providence in Versalien, darüber ein Stapel aus
 * drei Karten. Die Anmeldung endet in einem Kartenspiel, also sieht der Moment
 * davor auch danach aus.
 *
 * Das Abmelden hatte bis hierher gar keinen Screen: das Profil verschwand
 * wortlos, und ein Toast meldete es nach dem Reload nach.
 *
 * Als Portal am `body`, nicht im Modal: beim Abmelden gibt es kein Modal, in
 * das er sich legen könnte, und beide Fälle sollen gleich aussehen.
 */
export default function AuthScreen({ mode, leaving = false }: Props) {
  const { t } = useTranslation();
  // Kein Portal im Server-Render — sonst Hydration-Mismatch.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;

  const arriving = mode === 'in';
  const kicker = t(arriving ? 'auth.signingInKicker' : 'auth.signingOutKicker');
  const title = t(arriving ? 'modals.login.googleSigningIn' : 'auth.signingOutTitle');

  return createPortal(
    <div
      className={[styles.veil, leaving ? styles.leaving : ''].filter(Boolean).join(' ')}
      role={leaving ? undefined : 'status'}
      aria-live="polite"
      aria-hidden={leaving ? true : undefined}
    >
      <div className={styles.panel}>
        <div className={styles.art} aria-hidden="true">
          <div className={[styles.stack, arriving ? styles.opening : styles.closing].join(' ')}>
            {/* eslint-disable @next/next/no-img-element */}
            <img src={CARD_BACK} alt="" />
            <img src={CARD_BACK} alt="" />
            <img src={arriving ? CARD_FRONT : CARD_BACK} alt="" />
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </div>
        <div>
          <p className={styles.kicker}>
            {kicker}
            <span className={styles.dots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </p>
          <p className={styles.title}>{title}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
