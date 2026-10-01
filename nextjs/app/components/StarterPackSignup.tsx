'use client';

import { useTranslations } from 'next-intl';
import LoginBoard from './LoginBoard';
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

  return (
    <section
      // Anchor target: the Must-Eats onboarding sends logged-out visitors here
      // from its last slide (#hub-starter), same convention as #hub-fragremy.
      id="hub-starter"
      className={`homeV2 hv-section hv-wrap ${styles.scene}`}
      data-scrub="--pack-arrival 0 1"
      data-scrub-end="top 25%"
      data-hub-starter=""
      data-guest-only=""
      aria-label={t('packTitle')}
    >
      <div className={styles.inner}>
        <LoginBoard
          art={
            <div className={styles.art} aria-hidden="true">
              <div className={styles.packRig}>
                {/* Pack and figure turn as one: the figure is printed on the
                    foil (Ansage 30.09.2026: „die Figur wieder in das Starter
                    Pack rein"), and the pack keeps its turn into the room. */}
                <div className={styles.pack}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.packFront}
                    src="/pics/home/booster-empty.webp"
                    alt=""
                    width={1008}
                    height={1560}
                  />
                  <div className={styles.character}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/pics/home/booster-cafe-layer.webp" alt="" width={960} height={1600} />
                  </div>
                </div>
              </div>
            </div>
          }
          kicker={t('packKicker')}
          title={t('packTitle')}
          lead={t('packLead')}
          googleWarmup="intent"
        />
      </div>
    </section>
  );
}
