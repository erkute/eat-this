'use client';

// Die 500, geteilt von app/[locale]/error.tsx (Seite kaputt, Layout steht)
// und app/global-error.tsx (Layout selbst kaputt). Hängt an nichts außer
// seinem CSS-Modul und usePathname: eine Fehlergrenze darf nichts
// mitschleppen, was selbst Teil des Fehlers sein kann — keine Provider, keine
// Übersetzung, kein BuddyAvatar.
import { usePathname } from 'next/navigation';
import styles from '../not-found.module.css';

// Remys O-Mund aus dem 'thinking'-Frame — schaut, wie man schaut, wenn man
// sich verschluckt hat (User, 2026-08-27).
const REMY_CHOKING = '/buddy/buddy-think.webp';

const COPY = {
  de: {
    headline: 'Kurz verschluckt.',
    sub: 'Da ist gerade etwas schiefgelaufen. Versuch es gleich nochmal.',
    retry: 'Nochmal',
    home: 'Startseite',
  },
  en: {
    headline: 'That went down the wrong pipe.',
    sub: 'Something just went wrong. Give it another go.',
    retry: 'Retry',
    home: 'Home',
  },
} as const;

export default function ServerErrorContent({ onRetry }: { onRetry: () => void }) {
  // Kein i18n-Provider hier, mit Absicht — die Sprache steht in der Adresse.
  const pathname = usePathname() ?? '/';
  const locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'de';
  const copy = COPY[locale];

  return (
    <main
      className={`${styles.page} ${styles.errorPage}`}
      data-page="error"
      aria-labelledby="error-title"
    >
      <section className={styles.hero}>
        {/* Die letzte Null ist Remys Kopf. Reines Dekor — die Überschrift
            trägt die Aussage. */}
        <p className={styles.numeral} aria-hidden="true">
          <span>5</span>
          <span>0</span>
          <span className={`${styles.zero} ${styles.zeroRemy}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={REMY_CHOKING} alt="" width={927} height={997} decoding="async" />
          </span>
        </p>
        <div className={styles.copy}>
          <h1 className={`${styles.title} ${styles.errorTitle}`} id="error-title">
            {copy.headline}
          </h1>
          <p className={styles.sub}>{copy.sub}</p>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onRetry}
              className={`${styles.primaryCta} ${styles.ctaButton}`}
            >
              {copy.retry}
            </button>
            {/* Ein echter Seitenaufruf statt Soft-Nav: der Router kann Teil
                des Fehlers sein. */}
            <a href={locale === 'en' ? '/en' : '/'} className={styles.secondaryCta}>
              {copy.home}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
