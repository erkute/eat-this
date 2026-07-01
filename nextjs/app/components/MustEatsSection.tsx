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
    closeKicker: 'Noch verdeckt',
    closeTitle: ['Mehr', 'aufdecken.'],
    closeBody:
      'Booster Packs bringen dir neue Spots — viele mit einem oder mehreren Must Eats. Aufgedeckt wird vor Ort: geh hin und dreh die Karte mit einem Tap um.',
    closeCta: 'Packs ansehen',
  },
  en: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: 'Our clear pick for each spot: the dish you should order there. A few cards are face-up; you reveal the rest yourself, on site.',
    closeKicker: 'Still face-down',
    closeTitle: ['Reveal', 'more.'],
    closeBody:
      'Booster Packs bring you new spots — many with one or more Must Eats. Revealing happens on site: go there and tap the card to flip it.',
    closeCta: 'View packs',
  },
} as const

const CARD_BACK = '/pics/card-back.webp?v=6'

export default function MustEatsSection({ initialMapData, locale }: Props) {
  const c = COPY[locale]
  const packsHref = locale === 'en' ? '/en#hub-packs' : '/#hub-packs'
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
        <div className={styles.closeK}>{c.closeKicker}</div>
        <h2 className={styles.closeTitle}>
          {c.closeTitle[0]}
          <br />
          {c.closeTitle[1]}
        </h2>
        <p className={styles.closeBody}>{c.closeBody}</p>
        <a href={packsHref} className={styles.closeCta}>
          {c.closeCta}
        </a>
      </div>

      <SiteFooter />
    </div>
  )
}
