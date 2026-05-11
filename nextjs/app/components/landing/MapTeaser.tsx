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

const PHONE_COUNT = 3

// Chunk the flat items[] array into PHONE_COUNT roughly-equal slices so each
// phone gets its own bullet list directly below it. Six items → 2 per phone.
function chunkForPhones(items: string[]): string[][] {
  const out: string[][] = Array.from({ length: PHONE_COUNT }, () => [])
  items.forEach((item, i) => {
    out[i % PHONE_COUNT].push(item)
  })
  // Reorder so first phone gets items [0,1], second [2,3], third [4,5]
  const perPhone = Math.ceil(items.length / PHONE_COUNT)
  const grouped: string[][] = []
  for (let p = 0; p < PHONE_COUNT; p++) {
    grouped.push(items.slice(p * perPhone, (p + 1) * perPhone))
  }
  return grouped
}

export default function MapTeaser({ headline, bodyItems, screenshotUrls }: Props) {
  const screenshots = [0, 1, 2].map((i) => screenshotUrls?.[i] || DEFAULT_SCREENSHOTS[i])
  const groupedItems = chunkForPhones(bodyItems)

  return (
    <section className={styles.mapTeaser}>
      <div className={styles.mapTeaserHead}>
        <h2>{headline}</h2>
      </div>
      <div className={styles.mapFeatures}>
        {screenshots.map((src, i) => (
          <article key={i} className={styles.mapFeature}>
            <div className={styles.mapFeatureFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" decoding="async" />
            </div>
            {groupedItems[i] && groupedItems[i].length > 0 && (
              <ul className={styles.mapFeatureItems}>
                {groupedItems[i].map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
