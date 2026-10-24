'use client';

// Die 500, geteilt von app/[locale]/error.tsx (Seite kaputt, Layout steht)
// und app/global-error.tsx (Layout selbst kaputt). Hängt an nichts außer
// seinem CSS-Modul und usePathname: eine Fehlergrenze darf nichts
// mitschleppen, was selbst Teil des Fehlers sein kann — keine Provider, keine
// Übersetzung, kein BuddyAvatar.
import { usePathname } from 'next/navigation';
import styles from '../not-found.module.css';
import ErrorNumeral from './ErrorNumeral';

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
      className={styles.page}
      data-page="error"
      aria-labelledby="error-title"
    >
      <section className={styles.hero}>
        <p className={styles.edition} aria-hidden="true">500<br />Eat This</p>
        <ErrorNumeral value="500" />
        <div className={styles.copy}>
          <p className={styles.code} aria-hidden="true">500</p>
          <h1 className={styles.title} id="error-title">
            {copy.headline}
          </h1>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onRetry}
              className={`et-btn et-btn-error ${styles.primaryCta}`}
            >
              {copy.retry}
            </button>
            {/* Ein echter Seitenaufruf statt Soft-Nav: der Router kann Teil
                des Fehlers sein. */}
            <a href={locale === 'en' ? '/en' : '/'} className={`et-btn et-btn-error ${styles.secondaryCta}`}>
              {copy.home}
            </a>
          </div>
        </div>
        <p className={styles.sub}>{copy.sub}</p>
      </section>
    </main>
  );
}
