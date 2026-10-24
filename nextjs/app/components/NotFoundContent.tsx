import styles from '../not-found.module.css';
import ErrorNumeral from './ErrorNumeral';
import ErrorTheme from './ErrorTheme';

// Plain <a> with a hand-built prefix instead of next-intl's `Link`.
//
// This is a SERVER component, and `not-found.tsx` sits in the tree of every
// route. next-intl's `Link` resolves the active locale through the request
// config on the server, which reads headers() — and a single headers() read
// anywhere in a route's tree makes that route dynamic. It made ALL of them
// dynamic: `next build --debug` reported "Static generation failed … reason:
// headers" 791 times, the build wrote zero prerendered HTML files, and every
// page, including the ~690 restaurant pages, was re-rendered per request and
// answered `no-store`. Keep this file free of next-intl server APIs.
//
// The locale is a prop here, never inferred, so the prefix is just string
// work. `localePrefix: 'as-needed'` means DE is unprefixed and EN is `/en`.
// Cost: these links do a full page load instead of a soft nav. On a 404 that
// is the right trade.
type Locale = 'de' | 'en';

const linkTo = (locale: Locale, href: string) => (locale === 'en' ? `/en${href}` : href);

const COPY = {
  de: {
    headline: 'Falsch abgebogen.',
    sub: 'Diese Seite steht auf keiner Karte. Zurück zur Map — da liegt das gute Zeug.',
    primary: 'Zur Map',
    secondary: 'Must Eats',
    actionsLabel: 'Weiter',
  },
  en: {
    headline: 'Wrong turn.',
    sub: 'This page is not on any map. Head back — that is where the good stuff lives.',
    primary: 'Open map',
    secondary: 'Must Eats',
    actionsLabel: 'Continue',
  },
} satisfies Record<Locale, unknown>;

export default function NotFoundContent({ locale = 'de' }: { locale?: Locale }) {
  const copy = COPY[locale];

  return (
    <main
      className={styles.page}
      data-page="not-found"
      data-menu=""
      aria-labelledby="not-found-title"
    >
      <ErrorTheme />
      <section className={styles.hero} aria-labelledby="not-found-title">
        <p className={styles.edition} aria-hidden="true">404<br />Eat This</p>
        <ErrorNumeral value="404" />

        <div className={styles.copy}>
          <p className={styles.code} aria-hidden="true">404</p>
          <h1 className={styles.title} id="not-found-title">
            {copy.headline}
          </h1>

          <div className={styles.actions} aria-label={copy.actionsLabel}>
            <a href={linkTo(locale, '/map')} className={`et-btn et-btn-error ${styles.primaryCta}`}>
              {copy.primary}
            </a>
            <a href={linkTo(locale, '/must-eats')} className={`et-btn et-btn-error ${styles.secondaryCta}`}>
              {copy.secondary}
            </a>
          </div>
        </div>

        <p className={styles.sub}>{copy.sub}</p>
      </section>
    </main>
  );
}
