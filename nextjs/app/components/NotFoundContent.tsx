import Image from 'next/image'
import Link from 'next/link'
import styles from '../not-found.module.css'

type Locale = 'de' | 'en'

interface NotFoundContentProps {
  locale?: Locale
  /** Locale prefix for the home link. "/" routes back to the DE home hub;
   *  pass "/en" if you can resolve the user's locale upstream. */
  homeHref?: string
}

const COPY = {
  de: {
    brandLabel: 'Eat This Startseite',
    eyebrow: '404',
    headline: 'Nicht auf der Karte.',
    sub: 'Der Link ist falsch abgebogen. Zurück zur Map, da liegt das gute Zeug.',
    navMap: 'Map',
    primary: 'Zur Map',
    secondary: 'Must Eats',
    actionsLabel: 'Weiter',
  },
  en: {
    brandLabel: 'Eat This home',
    eyebrow: '404',
    headline: 'Not on the map.',
    sub: 'This link took a wrong turn. Head back to the map, that is where the good stuff lives.',
    navMap: 'Map',
    primary: 'Open map',
    secondary: 'Must Eats',
    actionsLabel: 'Continue',
  },
} satisfies Record<Locale, Record<string, string>>

function localeHref(locale: Locale, path: `/${string}`): string {
  if (path === '/') return locale === 'en' ? '/en' : '/'
  return locale === 'en' ? `/en${path}` : path
}

export default function NotFoundContent({ locale = 'de', homeHref }: NotFoundContentProps) {
  const copy = COPY[locale]
  const resolvedHomeHref = homeHref ?? localeHref(locale, '/')
  const mapHref = localeHref(locale, '/map')
  const mustEatsHref = localeHref(locale, '/must-eats')

  return (
    <main className={styles.page} data-page="not-found" data-menu="" aria-labelledby="not-found-title">
      <section className={styles.hero} aria-labelledby="not-found-title">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 className={styles.title} id="not-found-title">
            {copy.headline}
          </h1>

          <p className={styles.sub}>
            {copy.sub}
          </p>

          <div className={styles.actions} aria-label={copy.actionsLabel}>
            <Link href={mapHref} className={styles.primaryCta}>
              {copy.primary}
            </Link>
            <Link href={mustEatsHref} className={styles.secondaryCta}>
              {copy.secondary}
            </Link>
            <Link href={resolvedHomeHref} className={styles.secondaryCta} aria-label={copy.brandLabel}>
              Start
            </Link>
          </div>
        </div>

        <div className={styles.cardStage} aria-hidden="true">
          <div className={styles.codeBlock}>
            <span>404</span>
          </div>
          <div className={`${styles.card} ${styles.cardBack}`}>
            <Image
              src="/pics/card-back.webp"
              alt=""
              width={760}
              height={1076}
              sizes="(max-width: 720px) 150px, 230px"
              priority
            />
          </div>
          <div className={`${styles.card} ${styles.cardDish}`}>
            <Image
              src="/pics/home-dishes/gazzo-aubergine-print.webp"
              alt=""
              width={928}
              height={1152}
              sizes="(max-width: 720px) 150px, 230px"
            />
          </div>
        </div>
      </section>
    </main>
  )
}
