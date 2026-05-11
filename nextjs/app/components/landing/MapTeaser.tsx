import styles from './landing.module.css'

interface Props {
  headline: string
  bodyItems: string[]
  screenshotUrls?: (string | undefined)[]
}

const DEFAULT_SCREENSHOTS = [
  '/pics/map-teaser/map_umgebung.webp',
  '/pics/map-teaser/map_filter.webp',
  '/pics/map-teaser/map_restaurant.webp',
]

export default function MapTeaser({ headline, bodyItems, screenshotUrls }: Props) {
  const screenshots = [0, 1, 2].map((i) => screenshotUrls?.[i] || DEFAULT_SCREENSHOTS[i])

  return (
    <section className={styles.mapTeaser}>
      <div className={styles.mapTeaserHead}>
        <h2>{headline}</h2>
        {bodyItems.length > 0 && (
          <ul className={styles.mapTeaserList}>
            {bodyItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        )}
      </div>
      <div className={styles.mapFeatures}>
        {screenshots.map((src, i) => (
          <article key={i} className={styles.mapFeature}>
            <div className={styles.mapFeatureFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" decoding="async" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
