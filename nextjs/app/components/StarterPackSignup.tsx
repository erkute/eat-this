'use client';

import { useTranslations } from 'next-intl';
import LoginBoard from './LoginBoard';
import StarterPack3D from './StarterPack3D';
import styles from './StarterPackSignup.module.css';

/**
 * Die Starter-Pack-Anmeldung am Ende der Startseite nutzt dasselbe Formular
 * wie das Anmelde-Modal (LoginBoard).
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
      aria-label={t('homePackTitle')}
    >
      <div>
        <LoginBoard
          editorial
          art={<StarterPack3D />}
          title={t('homePackTitle')}
          lead={t('homePackLead')}
          googleWarmup="intent"
        />
      </div>
    </section>
  );
}
