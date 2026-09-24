'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { announceSignIn } from '@/lib/auth/signInArrival';
import LoginBoard, { LoginSceneArt } from './LoginBoard';
import styles from './StarterPackSignup.module.css';

/**
 * Die Anmeldung auf der Startseite, direkt unter dem Hero — derselbe Aufbau
 * wie das Anmelde-Modal (LoginBoard): das Pack, eine Ueberschrift, dasselbe
 * Formular. Bis zum 24.09.2026 war das ein eigener Nachbau mit eigenem Text,
 * Knopf neben dem Feld und eigener Bestaetigung.
 *
 * Nur EINE Stelle, direkt unter dem Hero. Eine zweite Kopie weiter unten war
 * probiert und flog wieder raus: mit demselben Pack und derselben Tafel las
 * sie sich als Wiederholung, und bei dem Verkehr hier war ein Unterschied nie
 * messbar. Davor stand das Formular als erste Kachel im Kategorie-Karussell
 * zwischen Kaufprodukten — 1 Anmeldung in 14 Tagen.
 *
 * Nach der Anmeldung versteckt `data-guest-only` diese Tafel (globals.css);
 * der Wartescreen liegt als Portal darueber und bleibt die Haltezeit stehen,
 * dann kommt der Toast, den sonst BridgeAuth nach dem Modal zeigt — es sei
 * denn, ein Starter Pack ist unterwegs, dann spricht dessen Einblendung
 * (siehe signInArrival).
 */
export default function StarterPackSignup() {
  const t = useTranslations('modals.login');
  const signedIn = t('signedIn');
  const onSignedIn = useCallback(
    () => announceSignIn(() => window.showNotification?.(signedIn)),
    [signedIn]
  );

  return (
    <section
      // Anchor target: the Must-Eats onboarding sends logged-out visitors here
      // from its last slide (#hub-starter), same convention as #hub-fragremy.
      id="hub-starter"
      className="homeV2 hv-section hv-wrap"
      data-hub-starter=""
      data-guest-only=""
      aria-label={t('packTitle')}
    >
      <div className={styles.inner}>
        <LoginBoard
          art={<LoginSceneArt reason={null} />}
          title={t('packTitle')}
          lead={t('packLead')}
          googleWarmup="intent"
          onGoogleSettled={onSignedIn}
        />
      </div>
    </section>
  );
}
