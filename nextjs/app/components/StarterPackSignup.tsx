'use client';

import { useLocale, useTranslations } from 'next-intl';
import LoginBoard from './LoginBoard';
import Image from './SiteImage';
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
 * der Wartescreen liegt als Portal darueber und bleibt die Haltezeit stehen.
 * Ein neues Konto bekommt danach die Starter-Pack-Einblendung (siehe
 * signInArrival).
 */
export default function StarterPackSignup() {
  const t = useTranslations('modals.login');
  const en = useLocale() === 'en';

  return (
    <section
      // Anchor target: the Must-Eats onboarding sends logged-out visitors here
      // from its last slide (#hub-starter), same convention as #hub-fragremy.
      id="hub-starter"
      className={`homeV2 hv-section hv-wrap ${styles.scene}`}
      data-hub-starter=""
      data-guest-only=""
      aria-label={t('packTitle')}
    >
      <div>
        <LoginBoard
          editorial
          art={<Image className={styles.pack} src="/pics/booster/booster_free.webp?v=2" alt="" width={1038} height={1516} sizes="(max-width: 820px) 264px, 370px" />}


          title={en ? 'Your first deck.' : 'Dein erstes Deck.'}
          lead={t('packLead')}
          googleWarmup="intent"
        />
      </div>
    </section>
  );
}
