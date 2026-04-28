'use client';

import { useState } from 'react';
import styles from './landing.module.css';
import { useAuth, useMagicLink } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

export default function Newsletter() {
  const { user } = useAuth();
  const { sendLink, state, errorMessage } = useMagicLink();
  const [email, setEmail] = useState('');
  const { t } = useTranslation();

  return (
    <section className={styles.news}>
      <div className={styles.newsInner}>
        <div className={styles.newsVisual}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/booster/booster1.webp"
            alt=""
            className={styles.newsPack}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className={styles.newsCopy}>
          <span className={styles.secLabel}>{t('landing.newsletterEyebrow')}</span>
          <h2>{t('landing.newsletterHeadline')}</h2>
          <p>{t('landing.newsletterBody')}</p>
          {!user && (
            state === 'sent' ? (
              <p className={styles.magicSent}>
                {t('landing.magicSent')}
              </p>
            ) : (
              <>
                <form
                  className={styles.newsForm}
                  onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
                >
                  <input
                    className={styles.newsInput}
                    type="email"
                    placeholder={t('landing.newsletterEmailPlaceholder')}
                    aria-label={t('landing.emailAriaLabel')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    className={styles.newsBtn}
                    type="submit"
                    disabled={state === 'sending'}
                  >
                    {state === 'sending' ? t('landing.sending') : t('landing.newsletterSubmit')}
                  </button>
                </form>
                {state === 'error' && (
                  <p className={styles.magicError}>{errorMessage}</p>
                )}
              </>
            )
          )}
        </div>
      </div>
    </section>
  );
}
