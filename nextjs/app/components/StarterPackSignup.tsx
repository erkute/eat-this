'use client';

import { useLocale, useTranslations } from 'next-intl';
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
 * der Wartescreen liegt als Portal darueber und bleibt die Haltezeit stehen.
 * Ein neues Konto bekommt danach die Starter-Pack-Einblendung (siehe
 * signInArrival).
 */
/* Was Remy sagt, wenn er aus dem Pack springt. Kein Knopftext — der Knopf
   heißt weiter „Anmelden"; das hier ist Remy, der dich anstupst. */
const REMY_SAYS = {
  de: 'Hey, meld dich doch an!',
  en: 'Hey, why not sign up?',
} as const;

/**
 * Das Pack mit Remy davor: er springt heraus, landet vorn am Pack und redet
 * dich an (die Bewegung macht HubMotion, sobald die Tafel ins Bild kommt; ohne
 * JS oder mit reduced motion steht er einfach da und die Blase ist voll).
 * Die Blase führt jedes Zeichen als eigenes Element, damit sie sich tippt,
 * ohne dass etwas an React-eigenen Textknoten herumschneidet. Reine Deko: das
 * Formular daneben sagt dasselbe in Worten, die zählen.
 */
function StarterScene() {
  const locale = useLocale() === 'en' ? 'en' : 'de';
  const says = REMY_SAYS[locale];
  return (
    <div className={styles.scene} data-starter-scene="" aria-hidden="true">
      <div data-starter-pack="">
        <LoginSceneArt reason={null} />
      </div>
      <div className={styles.remy} data-starter-remy="">
        {/* Das Wippen liegt eine Ebene tiefer als der Sprung: GSAP darf am
            äußeren Element nichts von CSS-`translate`/`rotate` vorfinden. */}
        <span className={styles.remyBody}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.remyFace}
            src="/buddy/buddy.webp"
            alt=""
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`${styles.remyFace} ${styles.remyOpen}`}
            src="/buddy/buddy-open.webp"
            alt=""
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
          />
        </span>
      </div>
      <p className={styles.bubble} data-starter-bubble="">
        {Array.from(says).map((c, i) => (
          <span key={i} data-starter-char="">
            {c}
          </span>
        ))}
      </p>
    </div>
  );
}

export default function StarterPackSignup() {
  const t = useTranslations('modals.login');

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
          art={<StarterScene />}
          kicker={t('packKicker')}
          title={t('packTitle')}
          lead={t('packLead')}
          googleWarmup="intent"
        />
      </div>
    </section>
  );
}
