'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useMagicLink } from '@/lib/auth';
import { postLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { routing } from '@/i18n/routing';
import styles from './login.module.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const { sendLink, state: magicState, errorMessage: magicError, reset: magicReset } = useMagicLink();

  const [email, setEmail]           = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  // Already signed in? Route them straight away.
  useEffect(() => {
    if (loading || !user) return;
    void postLoginRedirect(user.uid, router, locale);
  }, [user, loading, router, locale]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    const home = locale === routing.defaultLocale ? '/' : `/${locale}`;
    router.replace(home);
  }, [router, locale]);

  const handleGoogle = useCallback(async () => {
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      // postLoginRedirect runs via the useEffect above once user state updates.
    } catch {
      setGoogleBusy(false);
    }
  }, [signInWithGoogle]);

  const agbHref = locale === routing.defaultLocale ? '/agb' : `/${locale}/agb`;
  const dsHref  = locale === routing.defaultLocale ? '/datenschutz' : `/${locale}/datenschutz`;

  return (
    <main className={styles.page}>
      <button
        type="button"
        className={styles.backBtn}
        onClick={handleBack}
        aria-label={t('modals.login.backBtn')}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <section className={styles.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pics/login/Black screen.webp"
          alt=""
          className={styles.heroImg}
          decoding="async"
        />
        <div className={styles.heroScrim} />
        <div className={styles.heroLogo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/login/eat 1.webp"
            alt="Eat This"
            className={styles.heroLogoMark}
          />
          <h1 className={styles.heroHeadline}>
            Hundreds of Must Eats<br />to discover
          </h1>
        </div>
      </section>

      <section className={styles.body}>
        <p className={styles.eyebrow}>Berlin · Food Guide</p>
        <h2 className={styles.title}>{t('modals.login.titleLogin')}</h2>
        <p className={styles.subtitle}>{t('modals.login.subtitleLogin')}</p>

        {magicState === 'sent' ? (
          <div className={styles.sentBox}>
            <p className={styles.sentTitle}>Check deine Inbox</p>
            <p className={styles.sentBody}>{t('modals.login.linkSentHint')}</p>
            <button
              type="button"
              className={styles.sentLink}
              onClick={() => { magicReset(); setEmail(''); }}
            >
              {t('modals.login.resendBtn')}
            </button>
          </div>
        ) : (
          <form
            className={styles.form}
            noValidate
            onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
          >
            <input
              className={styles.input}
              type="email"
              placeholder={t('modals.login.emailPlaceholder')}
              required
              autoComplete="email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {magicState === 'error' && (
              <p className={styles.error}>{magicError}</p>
            )}
            <button
              type="submit"
              className={styles.cta}
              disabled={magicState === 'sending'}
            >
              <span>{t('modals.login.sendLinkBtn')}</span>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>
        )}

        <div className={styles.divider}>oder</div>

        <button
          type="button"
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={googleBusy}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/login/Google.webp"
            alt=""
            className={styles.googleIcon}
            width={18}
            height={18}
          />
          <span>{t('modals.login.googleBtn')}</span>
        </button>

        <p className={styles.terms}>
          <span>{t('modals.login.termsText')}</span>{' '}
          <a className={styles.termsLink} href={agbHref}>{t('modals.login.termsLink')}</a>{' '}
          <span>{t('modals.login.termsAnd')}</span>{' '}
          <a className={styles.termsLink} href={dsHref}>{t('modals.login.privacyLink')}</a>
          <span>.</span>
        </p>
      </section>
    </main>
  );
}
