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

const COPY = {
  de: {
    code: 'Fehler 404',
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
    code: 'Error 404',
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

// A dropped pin at the end of a route that stops short — the wrong turn as
// a picture. Inline so the 404 needs no image request and no Sanity data.
function WrongTurn() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 268 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="14" cy="126" r="4.5" fill="#15120e" />
      <path
        d="M14 126C50 138 76 116 106 106c32-11 56-2 72 16"
        stroke="#15120e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="7 9"
      />
      <ellipse cx="196" cy="123" rx="13" ry="3.5" fill="#15120e" opacity="0.16" />
      <g transform="rotate(-9 196 118)">
        <path
          d="M196 118s28-26 28-44a28 28 0 1 0-56 0c0 18 28 44 28 44Z"
          fill="#ffc600"
          stroke="#15120e"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="196" cy="74" r="10" fill="#15120e" />
      </g>
    </svg>
  );
}

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
        <div className={styles.stage} aria-hidden="true" />

        <WrongTurn />

        <div className={styles.copy}>
          <p className={styles.codeBlock}>{copy.code}</p>

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
          <p className={styles.moreLabel}>{copy.moreLabel}</p>
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
