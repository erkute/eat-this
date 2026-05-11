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
// together as one explainer unit. The `eyebrow` is a numbered tag above
// each phone H3 ("01 · MAP" etc.) - gives the trio a magazine-spread
// rhythm so users scan it as 3 chapters, not 3 feature columns.
const PHONE_CONTENT: {
  eyebrowDe: string
  eyebrowEn: string
  headlineDe: string
  headlineEn: string
  bulletsDe: string[]
  bulletsEn: string[]
}[] = [
  {
    eyebrowDe: '01 · DIE MAP',
    eyebrowEn: '01 · THE MAP',
    headlineDe: 'Alle Spots auf einer Map',
    headlineEn: 'Every spot on one map',
    bulletsDe: [
      '171+ Spots. Handverlesen.',
      'Live mit deinem Standort.',
      'Nur, was wir empfehlen.',
    ],
    bulletsEn: [
      '171+ spots. Hand-picked.',
      'Live with your location.',
      'Only what we recommend.',
    ],
  },
  {
    eyebrowDe: '02 · DER FILTER',
    eyebrowEn: '02 · THE FILTER',
    headlineDe: 'Berlin, gefiltert',
    headlineEn: 'Berlin, filtered',
    bulletsDe: [
      'Bezirksfilter. Mitte bis Wedding.',
      'Radius live um dich rum.',
      '„Geöffnet". Nur, was gerade läuft.',
    ],
    bulletsEn: [
      'District filter. Mitte to Wedding.',
      'Radius live around you.',
      '“Open now.” Only what’s open.',
    ],
  },
  {
    eyebrowDe: '03 · DER SPOT',
    eyebrowEn: '03 · THE SPOT',
    headlineDe: 'Alles zu jedem Spot',
    headlineEn: 'Everything about every spot',
    bulletsDe: [
      'Must Eats. Vor Ort aufdecken.',
      'Adresse. Öffnungszeiten. Bilder.',
      'Direkt aus der Map.',
    ],
    bulletsEn: [
      'Must Eats. Reveal on site.',
      'Address. Hours. Photos.',
      'Right from the map.',
    ],
  },
]

export default function MapTeaser({ headline, screenshotUrls, locale = 'de' }: Props) {
  const screenshots = [0, 1, 2].map((i) => screenshotUrls?.[i] || DEFAULT_SCREENSHOTS[i])
  // Override the CMS headline with the punchier editorial line. Leaves
  // `headline` in the props signature so the CMS column still ships.
  const sectionEyebrow = locale === 'de' ? 'Die Map' : 'The Map'
  const sectionTitle = locale === 'de'
    ? 'Direkt zu den Spots, die zählen'
    : 'Straight to the spots that matter'
  const sectionLead = locale === 'de'
    ? 'Persönlich kuratiert. Live auf einer Map.'
    : 'Personally curated. Live on one map.'
  void headline

  return (
    <section className={styles.mapTeaser}>
      <div className={styles.mapTeaserHead}>
        <span className={styles.mapTeaserEyebrow}>{sectionEyebrow}</span>
        <h2>{sectionTitle}</h2>
        <p>{sectionLead}</p>
      </div>
      <div className={styles.mapFeatures}>
        {screenshots.map((src, i) => {
          const phone = PHONE_CONTENT[i]
          const phoneEyebrow = locale === 'de' ? phone.eyebrowDe : phone.eyebrowEn
          const phoneHeadline = locale === 'de' ? phone.headlineDe : phone.headlineEn
          const phoneBullets = locale === 'de' ? phone.bulletsDe : phone.bulletsEn
          return (
            <article key={i} className={styles.mapFeature}>
              <div className={styles.mapFeatureFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" decoding="async" />
              </div>
              <span className={styles.mapFeatureEyebrow}>{phoneEyebrow}</span>
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
