import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import MustEatsGallery from './MustEatsGallery'
import MustEatsOnboarding from './MustEatsOnboarding'
import SiteFooter from './SiteFooter'
import styles from './MustEatsSection.module.css'

interface Props {
  initialMapData: InitialMapData
  locale: 'de' | 'en'
}

// Server-rendered head + closing block use locale-keyed strings (a server
// component can't call the client useTranslation). The filter chips + card
// labels live in the MustEatsGallery client island, which uses useTranslation.
const COPY = {
  de: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: 'Unsere klare Empfehlung pro Spot: das Gericht, das du dort bestellen solltest. Einige Karten liegen offen, den Rest deckst du vor Ort selbst auf.',
    closeKicker: 'Booster Packs',
    closeTitle: ['Mehr Must\u00a0Eats', 'und Spots.'],
    closeBody:
      'Kauf ein Booster Pack und schalte neue kuratierte Spots für deine Map frei — inklusive weiterer Must Eats, die du vor Ort aufdecken kannst.',
    closeCta: 'Packs kaufen',
  },
  en: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: 'Our clear pick for each spot: the dish you should order there. A few cards are face-up; you reveal the rest yourself, on site.',
    closeKicker: 'Booster Packs',
    closeTitle: ['More Must\u00a0Eats', 'and spots.'],
    closeBody:
      'Buy a Booster Pack to unlock new curated spots for your map — including more Must Eats you can reveal on site.',
    closeCta: 'Buy packs',
  },
} as const

const CARD_BACK = '/pics/card-back.webp?v=6'
const PACK_ART = [
  '/pics/booster/booster_breakfast.webp',
  '/pics/booster/booster_coffee.webp',
  '/pics/booster/booster_dinner.webp',
  '/pics/booster/booster_drinks.webp',
  '/pics/booster/booster_fastfood.webp',
  '/pics/booster/booster_finedining.webp',
  '/pics/booster/booster_lunch.webp',
  '/pics/booster/booster_pizza.webp',
  '/pics/booster/booster_sweets.webp',
] as const

export default function MustEatsSection({ initialMapData, locale }: Props) {
  const c = COPY[locale]
  const packsHref = locale === 'en' ? '/en/packs' : '/packs'
  const heroCards = initialMapData.mustEats.slice(0, 3)

  return (
    <div className={`page ${styles.page}`} data-page="must-eats" data-must-eats="">
      <div className={styles.head}>
        <div className={styles.headCopy}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1 className={styles.title}>
            {c.title[0]}
            <br />
            {c.title[1]}
          </h1>
          <p className={styles.sub}>{c.sub}</p>
          <MustEatsOnboarding initialMapData={initialMapData} />
        </div>

        <div className={styles.heroDeck} aria-hidden="true">
          {heroCards.map((m, index) => (
            <div key={m._id} className={`${styles.heroCard} ${styles[`heroCard${index + 1}`]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.image ?? CARD_BACK} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>
      </div>

      <MustEatsGallery initialMapData={initialMapData} />

      <div className={styles.close}>
        <div className={styles.closeCopy}>
          <div className={styles.closeK}>{c.closeKicker}</div>
          <h2 className={styles.closeTitle}>
            {c.closeTitle[0]}{' '}
            <br className={styles.closeTitleBreak} />
            {c.closeTitle[1]}
          </h2>
          <p className={styles.closeBody}>{c.closeBody}</p>
          <a href={packsHref} className={styles.closeCta}>
            {c.closeCta}
          </a>
        </div>

        <div className={styles.packStack} aria-hidden="true">
          {PACK_ART.map((src, index) => (
            <div key={src} className={`${styles.packCard} ${styles[`packCard${index + 1}`]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
