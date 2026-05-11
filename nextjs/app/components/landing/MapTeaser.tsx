import styles from './landing.module.css'

interface Props {
  headline: string
  screenshotUrls?: (string | undefined)[]
  locale?: 'de' | 'en'
}

const DEFAULT_SCREENSHOTS = [
  '/pics/map-teaser/map_umgebung.webp',
  '/pics/map-teaser/map_filter.webp',
  '/pics/map-teaser/map_restaurant.webp',
]

// Per-phone copy. Each phone shows a specific UI screen, so the captions
// describe exactly what that screen does. Hardcoded here (not CMS-driven)
// because the screenshots themselves are also hardcoded - the two travel
// together as one explainer unit.
const PHONE_CONTENT: {
  headlineDe: string
  headlineEn: string
  bulletsDe: string[]
  bulletsEn: string[]
}[] = [
  {
    headlineDe: 'Alle Spots auf einer Map',
    headlineEn: 'Every spot on one map',
    bulletsDe: [
      '171+ handverlesene Restaurants, Cafés und Bars',
      'Direkt mit deinem Standort verknüpft',
      'Reduziert auf das Wesentliche - nur unsere Empfehlungen sichtbar',
    ],
    bulletsEn: [
      '171+ hand-picked restaurants, cafés and bars',
      'Connected to your live location',
      'Reduced to the essentials - only our picks visible',
    ],
  },
  {
    headlineDe: 'Finde, worauf du Lust hast',
    headlineEn: 'Find what you’re after',
    bulletsDe: [
      'Bezirksfilter - von Mitte bis Wedding',
      '„In deiner Nähe" - Radius live um dich rum',
      '„Geöffnet" - zeigt nur, was gerade aufhat',
    ],
    bulletsEn: [
      'Neighbourhood filter - Mitte to Wedding',
      '“Near me” - live radius around you',
      '“Open now” - only what’s open right now',
    ],
  },
  {
    headlineDe: 'Alles zu jedem Spot',
    headlineEn: 'Everything about every spot',
    bulletsDe: [
      'Verdeckte Must Eats - direkt vor Ort aufdecken',
      'Adresse, Öffnungszeiten und Bilder',
      'Direkter Zugriff aus der Map',
    ],
    bulletsEn: [
      'Hidden Must Eats - uncover on site',
      'Address, hours and photos',
      'Direct access from the map',
    ],
  },
]

export default function MapTeaser({ headline, screenshotUrls, locale = 'de' }: Props) {
  const screenshots = [0, 1, 2].map((i) => screenshotUrls?.[i] || DEFAULT_SCREENSHOTS[i])
  // Override the CMS headline with the punchier editorial line. Leaves
  // `headline` in the props signature so the CMS column still ships.
  const sectionTitle = locale === 'de' ? 'Handverlesen, alles in einer Map' : 'Hand-picked, all on one Map'
  const sectionLead = locale === 'de'
    ? 'Jeder Spot persönlich getestet, direkt auf einer interaktiven Map.'
    : 'Every spot personally tested, all on one interactive map.'
  void headline

  return (
    <section className={styles.mapTeaser}>
      <div className={styles.mapTeaserHead}>
        <h2>{sectionTitle}</h2>
        <p>{sectionLead}</p>
      </div>
      <div className={styles.mapFeatures}>
        {screenshots.map((src, i) => {
          const phone = PHONE_CONTENT[i]
          const phoneHeadline = locale === 'de' ? phone.headlineDe : phone.headlineEn
          const phoneBullets = locale === 'de' ? phone.bulletsDe : phone.bulletsEn
          return (
            <article key={i} className={styles.mapFeature}>
              <div className={styles.mapFeatureFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" decoding="async" />
              </div>
              <h3 className={styles.mapFeatureTitle}>{phoneHeadline}</h3>
              <ul className={styles.mapFeatureItems}>
                {phoneBullets.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}
