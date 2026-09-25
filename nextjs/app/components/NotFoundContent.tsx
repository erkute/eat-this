import styles from '../not-found.module.css';

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

// Dieselbe Rueckseite wie im Deck und im Teaser, samt Cache-Stand — der Browser
// hat sie meist schon.
const CARD_BACK = '/pics/card-back.webp?v=7';

const COPY = {
  de: {
    headline: 'Falsch abgebogen.',
    sub: 'Diese Seite steht auf keiner Karte. Zurück zur Map — da liegt das gute Zeug.',
    primary: 'Zur Map',
    secondary: 'Must Eats',
    actionsLabel: 'Weiter',
    moreLabel: 'Oder direkt',
    more: [
      { href: '/bezirk', label: 'Bezirke' },
      { href: '/packs', label: 'Packs' },
      { href: '/news', label: 'Magazin' },
    ],
  },
  en: {
    headline: 'Wrong turn.',
    sub: 'This page is not on any map. Head back — that is where the good stuff lives.',
    primary: 'Open map',
    secondary: 'Must Eats',
    actionsLabel: 'Continue',
    moreLabel: 'Or try',
    more: [
      { href: '/bezirk', label: 'Districts' },
      { href: '/packs', label: 'Packs' },
      { href: '/news', label: 'Magazine' },
    ],
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
      <section className={styles.hero} aria-labelledby="not-found-title">
        {/* Die Null ist eine verdeckte Must-Eat-Karte: die Karte, die es nicht
            gibt. Reines Bild — die Überschrift trägt die Aussage, der Titel
            des Tabs die Zahl. */}
        <p className={styles.numeral} aria-hidden="true">
          <span>4</span>
          <span className={`${styles.zero} ${styles.zeroCard}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CARD_BACK} alt="" width={760} height={1044} decoding="async" />
          </span>
          <span>4</span>
        </p>

        <div className={styles.copy}>
          <h1 className={styles.title} id="not-found-title">
            {copy.headline}
          </h1>

          <p className={styles.sub}>{copy.sub}</p>

          <div className={styles.actions} aria-label={copy.actionsLabel}>
            <a href={linkTo(locale, '/map')} className={styles.primaryCta}>
              {copy.primary}
            </a>
            <a href={linkTo(locale, '/must-eats')} className={styles.secondaryCta}>
              {copy.secondary}
            </a>
          </div>
        </div>

        <nav className={styles.more} aria-label={copy.moreLabel}>
          {copy.more.map((item) => (
            <a key={item.href} href={linkTo(locale, item.href)} className={styles.moreLink}>
              {item.label}
            </a>
          ))}
        </nav>
      </section>
    </main>
  );
}
