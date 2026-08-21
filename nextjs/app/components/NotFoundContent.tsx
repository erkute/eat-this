import { Link } from '@/i18n/navigation';
import styles from '../not-found.module.css';

type Locale = 'de' | 'en';

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
    sub: "This page is not on any map. Head back — that is where the good stuff lives.",
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
            <Link href="/map" className={styles.primaryCta}>
              {copy.primary}
            </Link>
            <Link href="/must-eats" className={styles.secondaryCta}>
              {copy.secondary}
            </Link>
          </div>
        </div>

        <nav className={styles.more} aria-label={copy.moreLabel}>
          <p className={styles.moreLabel}>{copy.moreLabel}</p>
          {copy.more.map((item) => (
            <Link key={item.href} href={item.href} className={styles.moreLink}>
              {item.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
