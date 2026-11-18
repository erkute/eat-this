'use client';

import { useTranslations } from 'next-intl';
import LoginBoard from './LoginBoard';
import StarterPack3D from './StarterPack3D';
import styles from './StarterPackSignup.module.css';

/**
 * Die Anmeldung auf der Startseite, direkt unter dem Hero, im selben Aufbau wie
 * das Anmelde-Modal (LoginBoard): das Pack, eine Überschrift, dasselbe
 * Formular.
 *
 * Nur eine Stelle, direkt unter dem Hero. Eine zweite Kopie weiter unten läse
 * sich mit demselben Pack und derselben Tafel als Wiederholung, und zwischen
 * Kaufprodukten im Kategorie-Karussell geht das Formular unter.
 *
 * Nach der Anmeldung versteckt `data-guest-only` diese Tafel (globals.css); der
 * Wartescreen liegt als Portal darüber und bleibt die Haltezeit stehen. Ein
 * neues Konto bekommt danach die Starter-Pack-Einblendung (siehe
 * signInArrival).
 */
export default function StarterPackSignup() {
  const t = useTranslations('modals.login');

  return (
    <section
      // Anchor target: the Must-Eats onboarding sends logged-out visitors here
      // from its last slide (#hub-starter), same convention as #hub-fragremy.
      id="hub-starter"
      className={`homeV2 hv-section hv-wrap ${styles.scene}`}
      data-hub-starter=""
      data-red-sheet=""
      data-guest-only=""
      aria-label={t('packTitle')}
    >
      <div>
        <LoginBoard
          editorial
          art={<StarterPack3D />}
          kicker={t('packKicker')}
          title={t('packTitle')}
          lead={t('packLead')}
          googleWarmup="intent"
        />
      </div>
    </section>
  );
}
