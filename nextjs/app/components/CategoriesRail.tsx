'use client';

import { useId, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useMagicLink } from '@/lib/auth';
import { categoryArt } from '@/lib/categoryArt';
import styles from './CategoriesRail.module.css';

interface Props {
  categoryNames: Record<string, string>;
  categoryImages?: Record<string, string>;
  locale: 'de' | 'en';
}

export default function CategoriesRail({ categoryNames, locale }: Props) {
  const entries = Object.entries(categoryNames);
  const { sendLink, state: magicState, errorMessage: magicError, reset: resetMagicLink } = useMagicLink();
  const emailId = useId();
  const [email, setEmail] = useState('');
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
        }
      : {
          emailAria: 'E-Mail Adresse',
          emailPlaceholder: 'deine@email.com',
          sending: 'Sende...',
          sent: 'Check deine Mail',
          packCta: 'Öffnen',
          submit: 'Anmelden',
        };
  const handleStarterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || magicState === 'sending') return;
    void sendLink(email.trim());
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
        <form className={`${styles.card} ${styles.starterCard}`} onSubmit={handleStarterSubmit}>
          <span className={`hv-cap ${styles.starterTitle}`}>Starter Pack</span>
          <span className={`${styles.photo} ${styles.starterPhoto}`}>
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
              if (magicState !== 'idle') resetMagicLink();
            }}
            required
          />
          <button
            className={styles.emailButton}
            type="submit"
            disabled={magicState === 'sending' || !email.trim()}
          >
            {magicState === 'sent' ? copy.sent : magicState === 'sending' ? copy.sending : copy.submit}
          </button>
          {magicError && <span className={styles.emailError}>{magicError}</span>}
        </form>
        {entries.map(([slug, name]) => {
          const art = categoryArt(slug);
          return (
            <article
              key={slug}
              className={styles.card}
            >
              <span className={`hv-cap ${styles.packTitle}`}>{name}</span>
              <span className={styles.photo}>
                {art && <Image src={art} alt="" fill sizes="132px" />}
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
