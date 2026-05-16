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

// Per-phone product pitch. Each screen sells one concrete capability:
// the live map, the filter, the spot detail. Copy is product-advertising
// — declarative beats, not generic taglines. Hardcoded next to the
// screenshots (which are also hardcoded) so the two travel together.
const PHONE_CONTENT: {
  titleDe: string
  titleEn: string
  bodyDe: string
  bodyEn: string
}[] = [
  {
    titleDe: 'Live auf einer Map',
    titleEn: 'Live on one map',
    bodyDe: 'Jeder Spot, live auf der Map. Berlin auf einen Blick. Mit deinem Standort verknüpft.',
    bodyEn: 'Every spot, live on the map. Berlin at a glance. Wired to your location.',
  },
  {
    titleDe: 'Dein Berlin.',
    titleEn: 'Your Berlin.',
    bodyDe: 'Nach Bezirk. Nach Kategorie. Nach Standort. Oder nur was gerade offen hat.',
    bodyEn: 'By district. By category. By location. Or just what\'s open right now.',
  },
  {
    titleDe: 'Alles zu jedem Spot',
    titleEn: 'Everything about every spot',
    bodyDe: 'Hours, Preise, Bilder, Must Eats und Insider-Tipps. Plus ein Tap, um sicher überall hin zu navigieren.',
    bodyEn: 'Hours, prices, photos, Must Eats and insider tips. Plus one tap to navigate anywhere with confidence.',
  },
]

export default function MapTeaser({ headline, screenshotUrls, locale = 'de' }: Props) {
  const screenshots = [0, 1, 2].map((i) => screenshotUrls?.[i] || DEFAULT_SCREENSHOTS[i])
  void headline

  return (
    <section className={styles.mapTeaser}>
      <div className={styles.mapTeaserDivider} aria-hidden="true">
        <span className={styles.mapTeaserDividerLabel}>
          {locale === 'de' ? 'Die Map' : 'The Map'}
        </span>
      </div>
      <div className={styles.mapFeatures}>
        {screenshots.map((src, i) => {
          const phone = PHONE_CONTENT[i]
          const title = locale === 'de' ? phone.titleDe : phone.titleEn
          const body = locale === 'de' ? phone.bodyDe : phone.bodyEn
          return (
            <article key={i} className={styles.mapFeature}>
              <div className={styles.mapFeatureFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" decoding="async" />
              </div>
              <h3 className={styles.mapFeatureTitle}>{title}</h3>
              <p className={styles.mapFeatureBody}>{body}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
