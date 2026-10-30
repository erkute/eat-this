'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ShareButton from '../ShareButton';
import { useReferralCount } from '@/lib/firebase/useReferralCount';
import { SITE_URL } from '@/lib/constants';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';
import styles from './Profile.module.css';

const CARD_BACK = '/pics/card-back.webp?v=20261028';
const FAN_SIZE = 3;

// Der Einstieg ins Einladen: geteilt wird das eigene Deck
// (/deck/<uid>?ref=<uid>), das erst zeigt, wie viel von Berlin auf der Map
// liegt — die Einladung ist der Nebeneffekt. Die Middleware fängt `?ref` ab,
// /api/referral/confirm schreibt beiden Seiten ihre Karte gut.
//
// Die Höhe des Bonus steht bewusst nicht im Text (siehe REFERRAL_BONUS_SIZE).
// Die Zahl der Eingeladenen schon: sie zählt keine Spots, sondern sagt, ob je
// jemand über den Link gekommen ist.
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
  const inviteUrl = `${origin}${locale === 'en' ? '/en' : ''}/deck/${uid}?ref=${uid}`;

  /* Immer drei, egal wie viel schon aufgedeckt ist: ein Faecher aus zwei
     Karten sieht aus wie ein Fehler, und wer noch nichts hat, haelt eben drei
     Rueckseiten hin — auch das ist ein Deck. */
  const fan = [...cards, CARD_BACK, CARD_BACK, CARD_BACK].slice(0, FAN_SIZE);

  return (
    <div className={styles.invite} data-red-sheet>
      {/* Ein paar Karten, aufgefächert wie eine hingehaltene Hand: sie zeigen, was
          der andere zu sehen bekommt.

          `aria-hidden`: die Überschrift daneben sagt schon, worum es geht,
          und die einzelnen Gerichte sind hier Dekor, keine Auskunft. */}
      <span className={styles.inviteFan} aria-hidden="true">
        {fan.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={mustEatCardSrc(src, 180)}
            srcSet={mustEatCardSrcSet(src)}
            sizes="68px"
            alt=""
            loading="lazy"
            decoding="async"
          />
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
        {}
        <ShareButton
          className="et-btn et-btn-lg"
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
