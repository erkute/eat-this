'use client';

import { useId, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useMagicLink } from '@/lib/auth';
import { categoryArt } from '@/lib/categoryArt';
import styles from './CategoriesRail.module.css';

interface Props {
  categoryNames: Record<string, string>;
  locale: 'de' | 'en';
}

export default function CategoriesRail({ categoryNames, locale }: Props) {
  const entries = Object.entries(categoryNames);
  const { sendLink, state: magicState, errorMessage: magicError, reset: resetMagicLink } = useMagicLink();
  const emailId = useId();
  const emailErrorId = `${emailId}-error`;
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  if (!entries.length) return null;

  const copy =
    locale === 'en'
      ? {
          emailAria: 'Email address',
          emailPlaceholder: 'your@email.com',
          sending: 'Sending...',
          sent: 'Check your mail',
          packCta: 'Open',
          submit: 'Sign in',
          emptyEmail: 'Add your email first.',
          invalidEmail: 'That does not look like an email yet.',
        }
      : {
          emailAria: 'E-Mail Adresse',
          emailPlaceholder: 'deine@email.com',
          sending: 'Sende...',
          sent: 'Check deine Mail',
          packCta: 'Öffnen',
          submit: 'Anmelden',
          emptyEmail: 'Bitte gib deine E-Mail ein.',
          invalidEmail: 'Das sieht noch nicht nach einer E-Mail aus.',
        };
  const emailFeedback = validationError || magicError;
  const handleStarterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (magicState === 'sending') return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError(copy.emptyEmail);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError(copy.invalidEmail);
      return;
    }
    setValidationError('');
    void sendLink(trimmedEmail);
  };

  return (
    <section
      className="homeV2 hv-section hv-wrap"
      aria-label={locale === 'en' ? 'Categories' : 'Kategorien'}
    >
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'What are you craving?' : 'Worauf hast du Lust?'}
        </h2>
      </div>
      <div className={styles.grid}>
        <form className={`${styles.card} ${styles.starterCard}`} onSubmit={handleStarterSubmit} noValidate>
          <span className={`hv-cap ${styles.starterTitle}`}>Starter Pack</span>
          <span className={styles.photo}>
            <Image src="/pics/booster/booster_free.webp" alt="" fill sizes="(max-width:760px) 58vw, 220px" />
          </span>
          <label className={styles.emailLabel} htmlFor={emailId}>
            {copy.emailAria}
          </label>
          <input
            id={emailId}
            className={styles.emailInput}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setValidationError('');
              if (magicState !== 'idle') resetMagicLink();
            }}
            aria-invalid={Boolean(emailFeedback)}
            aria-describedby={emailFeedback ? emailErrorId : undefined}
            required
          />
          <button
            className={styles.emailButton}
            type="submit"
            disabled={magicState === 'sending'}
          >
            {magicState === 'sent' ? copy.sent : magicState === 'sending' ? copy.sending : copy.submit}
          </button>
          {emailFeedback && (
            <span id={emailErrorId} className={styles.emailError} role="alert">
              {emailFeedback}
            </span>
          )}
        </form>
        {entries.map(([slug, name], index) => {
          const art = categoryArt(slug);
          return (
            <article
              key={slug}
              className={styles.card}
            >
              <span className={`hv-cap ${styles.packTitle}`}>{name}</span>
              <span className={styles.photo}>
                {art && <Image src={art} alt="" fill priority={index === 0} sizes="132px" />}
              </span>
              <Link href={`/pack/${slug}`} className={styles.packButton}>
                {copy.packCta}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
