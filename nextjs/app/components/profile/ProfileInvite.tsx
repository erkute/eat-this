'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ShareButton from '../ShareButton';
import { useReferralCount } from '@/lib/firebase/useReferralCount';
import { SITE_URL } from '@/lib/constants';
import styles from './Profile.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';
const FAN_SIZE = 3;

// The referral machinery has been complete on the server since day one
// (middleware captures ?ref=<uid> → /api/referral/confirm awards both sides)
// but had no front door anywhere in the app. This is it.
//
// Geteilt wird seit 31.08.2026 das eigene Deck, nicht mehr die Startseite.
// Ein nackter Link auf `/` mit angehaengtem ?ref war eine Bitte: „mach das
// hier auch mit". /deck/<uid> zeigt erst, wie viel von Berlin auf dieser Map
// liegt — die Einladung ist der Nebeneffekt. Das `?ref` bleibt derselbe
// Parameter an derselben Middleware, nur an einer URL, die fuer sich etwas
// hergibt.
//
// The bonus size is deliberately absent from the copy — see the no-spot-counts
// note on REFERRAL_BONUS_SIZE. Die Zahl der Eingeladenen ist etwas anderes:
// sie zählt keine Spots, sondern beantwortet die einzige Frage, die der Kasten
// bisher offen ließ — ist überhaupt je jemand über meinen Link gekommen?
interface Props {
  uid: string;
  /** Bis zu drei eigene Kartenbilder fuer den Faecher. Weniger ist erlaubt —
   *  aufgefuellt wird mit Rueckseiten. */
  cards: string[];
}

export default function ProfileInvite({ uid, cards }: Props) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const joined = useReferralCount(uid);
  // Same origin the user is on, so an invite copied from staging stays on
  // staging. SSR has no origin; the canonical host is the honest fallback.
  const [origin, setOrigin] = useState(SITE_URL);
  useEffect(() => setOrigin(window.location.origin), []);
  const deckUrl = `${origin}${locale === 'en' ? '/en' : ''}/deck/${uid}`;
  const inviteUrl = `${deckUrl}?ref=${uid}`;

  /* Immer drei, egal wie viel schon aufgedeckt ist: ein Faecher aus zwei
     Karten sieht aus wie ein Fehler, und wer noch nichts hat, haelt eben drei
     Rueckseiten hin — auch das ist ein Deck. */
  const fan = [...cards, CARD_BACK, CARD_BACK, CARD_BACK].slice(0, FAN_SIZE);

  return (
    <div className={styles.invite}>
      {/* Ein paar Karten, aufgefaechert wie eine hingehaltene Hand.
          Die Flaeche war eine gelbe Leiste mit zwei Zeilen und ging zwischen
          Deck und gespeicherten Spots unter (Nutzer, 06.09.2026: „da koennte
          man vielleicht noch so ein paar Karten zeigen"). Mit den Karten ist
          sie ein Gegenstand — und sie zeigt, was der andere zu sehen bekommt.

          `aria-hidden`: die Ueberschrift daneben sagt schon, worum es geht,
          und die einzelnen Gerichte sind hier Dekor, keine Auskunft. */}
      <span className={styles.inviteFan} aria-hidden="true">
        {fan.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${src}-${i}`} src={src} alt="" loading="lazy" decoding="async" />
        ))}
      </span>
      <div className={styles.inviteCopy}>
        <h2 className={styles.inviteTitle}>{t('inviteHeading')}</h2>
        <p className={styles.inviteLine}>{t('inviteLine')}</p>
        {/* Erst ab der ersten Anmeldung. „Noch niemand" wäre eine Bilanz, die
            keiner sehen will, und der Satz darüber erklärt den Handel schon. */}
        {joined !== null && joined > 0 && (
          <p className={styles.inviteJoined}>
            {joined === 1 ? t('inviteJoinedOne') : t('inviteJoinedMany', { count: joined })}
          </p>
        )}
      </div>
      <div className={styles.inviteAction}>
        {/* Statt der nackten URL, die hier als abgeschnittene Zeile stand:
            der Weg auf die Seite selbst. Wer sein Deck herumschickt, will
            vorher wissen, was der andere zu sehen bekommt — und diese Seite
            ist der Grund, dass es sich zu teilen lohnt. Ohne `?ref`: sich
            selbst wirbt niemand.

            Ein einfaches `a`, kein `Link`: /deck/<uid> ist `force-dynamic`
            und traegt fuer den Besitzer nichts, was ein Prefetch ersparen
            wuerde. */}
        <a
          className={styles.invitePreview}
          href={deckUrl}
          target="_blank"
          rel="noreferrer nofollow"
        >
          {t('invitePreview')}
        </a>
        <ShareButton
          className={styles.inviteButton}
          url={inviteUrl}
          title={t('inviteShareTitle')}
          slug={uid}
          contentType="referral_invite"
          label={t('inviteCta')}
          copiedLabel={t('inviteCopied')}
        />
      </div>
    </div>
  );
}
