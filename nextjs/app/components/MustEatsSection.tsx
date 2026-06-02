import { UserLocationProvider } from '@/lib/map/UserLocationContext'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import MustEatsGallery from './MustEatsGallery'
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
    sub: 'Manche liegen offen. Der Rest wartet hinter Booster Packs.',
    closeKicker: 'Noch verdeckt',
    closeTitle: ['Mehr', 'aufdecken.'],
    closeBody:
      'Booster Packs öffnen Kategorien auf einen Schlag. Oder geh einfach zum Spot — vor Ort dreht sich die Karte von selbst um.',
    closeCta: 'Packs ansehen →',
  },
  en: {
    kicker: 'In Berlin',
    title: ['Must', 'Eats'],
    sub: 'Some are face-up. The rest waits behind Booster Packs.',
    closeKicker: 'Still face-down',
    closeTitle: ['Reveal', 'more.'],
    closeBody:
      'Booster Packs unlock whole categories at once. Or just go to the spot — on site the card flips by itself.',
    closeCta: 'View packs →',
  },
} as const

export default function MustEatsSection({ initialMapData, locale }: Props) {
  const c = COPY[locale]
  const packsHref = locale === 'en' ? '/en/home#hub-packs' : '/home#hub-packs'

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
