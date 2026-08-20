'use client';

import { useId, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useMagicLink } from '@/lib/auth';
import styles from './StarterPackSignup.module.css';

/**
 * Email capture for the free Starter Pack. Previously this lived as the first
 * tile inside the categories rail, where it read as one more purchasable pack
 * next to "Fine Dining Pack — Öffnen" (1 signup in 14 days). It is now its own
 * section: the offer is named, the price is stated, and the magic-link step is
 * announced up front so the mail that follows isn't a surprise.
 *
 * One placement only, directly under the hero. A second copy lower down was
 * tried and dropped: once it carried the same pack and panel as this one it
 * read as repetition, and at this page's traffic the difference could never
 * be measured either way.
 */
interface Props {
  locale: 'de' | 'en';
}

const copy = {
  de: {
    kicker: 'Gratis',
    title: 'Starter Pack',
    lead: 'Melde dich an und schalte weitere Spots samt ihren Must Eats auf deiner Map frei. Kostenlos.',
    hint: 'Wir schicken dir einen Link zum Einloggen.',
    emailAria: 'E-Mail Adresse',
    emailPlaceholder: 'deine@email.com',
    submit: 'Starter Pack holen',
    sending: 'Sende…',
    sent: 'Check deine Mail',
    sentLead: 'Wir haben dir den Link geschickt. Ein Klick und du bist drin.',
    emptyEmail: 'Bitte gib deine E-Mail ein.',
    invalidEmail: 'Das sieht noch nicht nach einer E-Mail aus.',
    imgAlt: 'Eat This Starter Pack',
  },
  en: {
    kicker: 'Free',
    title: 'Starter Pack',
    lead: 'Sign up and unlock more spots and their Must Eats on your map. Free.',
    hint: 'We send you a sign-in link.',
    emailAria: 'Email address',
    emailPlaceholder: 'your@email.com',
    submit: 'Get the Starter Pack',
    sending: 'Sending…',
    sent: 'Check your mail',
    sentLead: "We've sent your link. One click and you're in.",
    emptyEmail: 'Add your email first.',
    invalidEmail: 'That does not look like an email yet.',
    imgAlt: 'Eat This Starter Pack',
  },
} as const;

export default function StarterPackSignup({ locale }: Props) {
  const t = copy[locale];
  const { sendLink, state, errorMessage, reset } = useMagicLink();
  const emailId = useId();
  const errorId = `${emailId}-error`;
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const feedback = validationError || errorMessage;
  const sent = state === 'sent';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === 'sending') return;
    const trimmed = email.trim();
    if (!trimmed) {
      setValidationError(t.emptyEmail);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setValidationError(t.invalidEmail);
      return;
    }
    setValidationError('');
    void sendLink(trimmed);
  };

  return (
    <section
      className="homeV2 hv-section hv-wrap"
      data-hub-starter=""
      data-guest-only=""
      aria-label={t.title}
    >
      <div className={styles.inner}>
        <div className={styles.art}>
          <Image
            src="/pics/booster/booster_free.webp"
            alt={t.imgAlt}
            fill
            sizes="(max-width: 760px) 168px, 220px"
            priority={false}
          />
        </div>

        <div className={styles.head}>
          <span className={`hv-cap ${styles.kicker}`}>{t.kicker}</span>
          <h2 className={`hv-title ${styles.title}`}>{t.title}</h2>
        </div>

        <div className={styles.body}>
          <p className={styles.lead}>{sent ? t.sentLead : t.lead}</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.srOnly} htmlFor={emailId}>
              {t.emailAria}
            </label>
            <input
              id={emailId}
              className={styles.input}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setValidationError('');
                if (state !== 'idle') reset();
              }}
              aria-invalid={Boolean(feedback)}
              aria-describedby={feedback ? errorId : undefined}
              required
            />
            <button className={styles.button} type="submit" disabled={state === 'sending'}>
              {sent ? t.sent : state === 'sending' ? t.sending : t.submit}
            </button>
          </form>

          {feedback ? (
            <span id={errorId} className={styles.error} role="alert">
              {feedback}
            </span>
          ) : (
            !sent && <span className={styles.hint}>{t.hint}</span>
          )}
        </div>
      </div>
    </section>
  );
}
