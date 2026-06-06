import { UserLocationProvider } from '@/lib/map/UserLocationContext'
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
    sub: 'Jedes Top-Restaurant hat ein Gericht, das du probiert haben musst — sein Must Eat. Ein paar Karten liegen schon offen. Den Rest deckst du vor Ort auf.',
    closeKicker: 'Noch verdeckt',
    closeTitle: ['Mehr', 'aufdecken.'],
    closeBody:
      'Booster Packs bringen dir neue Spots — viele mit einem Must Eat. Aufgedeckt wird vor Ort: komm dem Spot nah, dreht sich die Karte von selbst um.',
    closeCta: 'Packs ansehen →',
  },
  en: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: "Every top restaurant has one dish you need to try — its Must Eat. A few cards are already face-up. The rest you reveal on site.",
    closeKicker: 'Still face-down',
    closeTitle: ['Reveal', 'more.'],
    closeBody:
      'Booster Packs bring you new spots — many with a Must Eat. Revealing happens on site: get close to the spot and the card flips by itself.',
    closeCta: 'View packs →',
  },
} as const

export default function MustEatsSection({ initialMapData, locale }: Props) {
  const c = COPY[locale]
  const packsHref = locale === 'en' ? '/en#hub-packs' : '/#hub-packs'

  return (
    <div className="page" style={{ display: 'flow-root' }} data-must-eats="">
      <UserLocationProvider>
        <div className={styles.head}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1 className={styles.title}>
            {c.title[0]}
            <br />
            {c.title[1]}
          </h1>
          <p className={styles.sub}>{c.sub}</p>
          <MustEatsOnboarding initialMapData={initialMapData} />
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
      </UserLocationProvider>
    </div>
  )
}
