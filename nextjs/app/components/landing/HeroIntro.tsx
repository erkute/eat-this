'use client';

import { useState } from 'react';
import styles from './landing.module.css';
import { useAuth, useMagicLink } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

export default function HeroIntro() {
  const { user } = useAuth();
  const { sendLink, state, errorMessage } = useMagicLink();
  const [email, setEmail] = useState('');
  const { t } = useTranslation();

  // HeroIntro is a pure signup CTA — no content value for signed-in users (unlike BoosterPack/Newsletter)
  if (user) return null;

  return (
    <section className={styles.heroIntro}>
      <span className={styles.heroIntroStats}>
        {t('landing.stats')}
      </span>
      <h1 className={styles.heroIntroHeadline}>
        {t('landing.heroHeadline')}
      </h1>
      {state === 'sent' ? (
        <p className={styles.magicSent}>
          {t('landing.heroSent')}
        </p>
      ) : (
        <>
          <p className={styles.heroIntroSubtitle}>
            {t('landing.heroSubtitle')}
          </p>
          <form
            className={styles.heroIntroForm}
            onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
          >
            <input
              className={styles.heroIntroInput}
              type="email"
              placeholder={t('landing.heroEmailPlaceholder')}
              aria-label={t('landing.emailAriaLabel')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              className={styles.heroIntroSubmit}
              type="submit"
              disabled={state === 'sending'}
            >
              {state === 'sending' ? t('landing.sending') : t('landing.heroSubmit')}
            </button>
          </form>
          {state === 'error' && (
            <p className={styles.magicError}>{errorMessage}</p>
          )}
        </>
      )}
    </section>
  );
}
