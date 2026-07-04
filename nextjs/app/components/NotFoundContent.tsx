import Image from 'next/image'
import Link from 'next/link'
import styles from '../not-found.module.css'

type Locale = 'de' | 'en'

interface NotFoundContentProps {
  locale?: Locale
}

const CARD_BACK = '/pics/card-back.webp?v=6'
const REVEALED_CARDS = [
  '/pics/not-found-cards/main-1.webp',
  '/pics/not-found-cards/main-10.webp',
  '/pics/not-found-cards/main-12.webp',
] as const

const COPY = {
  de: {
    headline: 'Nicht auf der Karte.',
    sub: 'Der Link ist falsch abgebogen. Zurück zur Map, da liegt das gute Zeug.',
    navMap: 'Map',
    primary: 'Zur Map',
    secondary: 'Must Eats',
    actionsLabel: 'Weiter',
  },
  en: {
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

export default function NotFoundContent({ locale = 'de' }: NotFoundContentProps) {
  const copy = COPY[locale]
  const mapHref = localeHref(locale, '/map')
  const mustEatsHref = localeHref(locale, '/must-eats')

  return (
    <main className={styles.page} data-page="not-found" data-menu="" aria-labelledby="not-found-title">
      <section className={styles.hero} aria-labelledby="not-found-title">
        <div className={styles.copy}>
          <div className={styles.codeBlock} aria-hidden="true">
            <span>404</span>
          </div>
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
          </div>
        </div>

        <div className={styles.cardStage} aria-hidden="true">
          <div className={`${styles.card} ${styles.cardBack}`}>
            <Image
              src={CARD_BACK}
              alt=""
              width={760}
              height={1076}
              sizes="(max-width: 390px) 102px, (max-width: 720px) 116px, 182px"
              priority
            />
          </div>
          {REVEALED_CARDS.map((src, index) => (
            <div
              className={`${styles.card} ${
                index === 0 ? styles.cardFrontOne : index === 1 ? styles.cardFrontTwo : styles.cardFrontThree
              }`}
              key={src}
            >
              <Image
                src={src}
                alt=""
                width={1539}
                height={2115}
                sizes="(max-width: 390px) 102px, (max-width: 720px) 116px, 182px"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
