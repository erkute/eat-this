'use client';

import { useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth, useMagicLink } from '@/lib/auth';
import { isEmailish } from '@/lib/auth/emailShape';
import styles from '@/app/components/profile/Profile.module.css';
import starter from '@/app/components/StarterPackSignup.module.css';
import deck from './Deck.module.css';

const STARTER_ART = '/pics/booster/booster_free.webp';

/**
 * Der Ausgang des geteilten Decks — die einzige Handlung, die die Seite
 * anbietet.
 *
 * Bis zum 06.09.2026 war das ein Link auf die Startseite: „Mach deine eigene
 * Map auf" → `/`. Wer über einen geteilten Link kam, landete damit auf einer
 * Seite, die noch einmal von vorn anfing, und die Anmeldung lag dahinter
 * irgendwo — vom fremden Deck zum eigenen Konto waren es mindestens zwei
 * Seitenwechsel. Nutzer, 06.09.2026: „da muss dann direkt eine Anmeldung
 * folgen."
 *
 * Also steht sie hier: dieselbe Ink-Tafel wie der Starter-Pack-Abschnitt der
 * Startseite (deren Stile diese Datei mitliest, damit es EIN Objekt bleibt
 * und nicht zwei, die sich ähneln), ein Feld, ein Knopf, Magic Link.
 *
 * Kein `continueUrl`: `/welcome` schickt ohne ihn auf die Startseite, und das
 * ist hier das richtige Ziel. Wer sich vom Deck eines Freundes aus anmeldet,
 * will danach seine eigene Map sehen — nicht wieder dessen Deck.
 *
 * Darunter der leise Weg für alle, die noch nicht so weit sind: zur Map. Ohne
 * ihn endet die Seite für sie in einer Sackgasse, und der geteilte Link ist
 * der einzige Kanal, über den ohne Werbebudget jemand herkommt.
 *
 * Das Werben braucht dafür keine eigene Mechanik: der geteilte Link trägt
 * `?ref=<uid>`, die Middleware hat das Cookie längst gesetzt (siehe
 * page.tsx). Wer sich von hier aus anmeldet, ist geworben.
 *
 * Angemeldet gibt es nichts anzumelden — dann führt dieselbe Fläche zum
 * eigenen Deck.
 */
export default function DeckJoin({ name }: { name: string | null }) {
  const t = useTranslations('deck');
  const locale = useLocale();
  const { user } = useAuth();
  const { sendLink, state, errorMessage, reset } = useMagicLink();
  const emailId = useId();
  const errorId = `${emailId}-error`;
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState('');

  if (user) {
    return (
      <div className={styles.invite}>
        <div className={styles.inviteCopy}>
          <h2 className={styles.inviteTitle}>{t('ctaHeadingIn')}</h2>
          <p className={styles.inviteLine}>{t('ctaLineIn')}</p>
        </div>
        <div className={styles.inviteAction}>
          <Link href="/profile" className={styles.inviteButton}>
            {t('ctaIn')}
          </Link>
        </div>
      </div>
    );
  }

  const sent = state === 'sent';
  const feedback = invalid || errorMessage;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === 'sending') return;
    const trimmed = email.trim();
    const shape = isEmailish(trimmed);
    if (shape !== 'ok') {
      setInvalid(t(shape === 'empty' ? 'joinEmptyEmail' : 'joinInvalidEmail'));
      return;
    }
    setInvalid('');
    void sendLink(trimmed);
  };

  return (
    <>
      {/* `data-guest-only`: der Vorab-Bootstrap blendet die Tafel schon vor
          dem ersten Bild aus, wenn das Konto bekannt ist — sonst blitzt für
          einen Angemeldeten eine Sekunde lang „Melde dich an" auf, bis
          Firebase geantwortet hat. */}
      <div className={starter.inner} data-guest-only="">
        <div className={deck.joinArt}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={STARTER_ART} alt={t('joinArtAlt')} loading="lazy" decoding="async" />
        </div>

        <div className={starter.head}>
          <span className={`hv-cap ${starter.kicker}`}>{t('joinKicker')}</span>
          <h2 className={`hv-title ${starter.title}`}>{t('joinTitle')}</h2>
        </div>

        <div className={starter.body}>
          <p className={starter.lead}>
            {sent ? t('joinSentLead') : name ? t('joinLead', { name }) : t('joinLeadAnon')}
          </p>

          <form className={starter.form} onSubmit={handleSubmit} noValidate>
            <label className={starter.srOnly} htmlFor={emailId}>
              {t('joinEmailLabel')}
            </label>
            <input
              id={emailId}
              className={starter.input}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t('joinEmailPlaceholder')}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setInvalid('');
                if (state !== 'idle') reset();
              }}
              aria-invalid={Boolean(feedback)}
              aria-describedby={feedback ? errorId : undefined}
              required
            />
            <button className={starter.button} type="submit" disabled={state === 'sending'}>
              {sent ? t('joinSent') : state === 'sending' ? t('joinSending') : t('joinCta')}
            </button>
          </form>

          {feedback ? (
            <span id={errorId} className={starter.error} role="alert">
              {feedback}
            </span>
          ) : (
            !sent && <span className={starter.hint}>{t('joinHint')}</span>
          )}
        </div>
      </div>

      {/* Kein zweiter Knopf: ein gleich lauter Ausgang neben der Anmeldung
          wäre eine Abzweigung, keine Alternative. */}
      <Link className={deck.browse} href="/map" locale={locale as 'de' | 'en'}>
        {t('browse')}
      </Link>
    </>
  );
}
