import MapIntentLink from './MapIntentLink'
import styles from './MapPromoCTA.module.css'

type Kind = 'restaurant' | 'bezirk' | 'kategorie'

interface Props {
  kind: Kind
  /** Restaurant / Bezirk / Kategorie name for {name} interpolation. */
  name: string
  /** Locale-relative deep-link to the (paywall-gated, noindex) /map route. */
  mapHref: string
  locale: 'de' | 'en'
  variant?: 'block' | 'chip'
}

// All map-promo wording lives here — single place to wordsmith. Brand voice:
// declarative, no "gratis/free", no spot counts, no cheesy framing.
function getCopy(kind: Kind, name: string, locale: 'de' | 'en'): { title: string; sub: string } {
  const de = locale === 'de'
  switch (kind) {
    case 'restaurant':
      // Headline = Brand-Slogan (bleibt auch auf DE englisch).
      return de
        ? { title: 'The map for people who care about food.', sub: 'Mit den besten Restaurants, Cafés und Bars in Berlin.' }
        : { title: 'The map for people who care about food.', sub: 'With the best restaurants, cafés and bars in Berlin.' }
    case 'bezirk':
      return de
        ? { title: `Ganz ${name} auf der Map`, sub: 'Die besten Spots in der Gegend.' }
        : { title: `All of ${name} on the map`, sub: 'The best spots in the area.' }
    case 'kategorie':
      return de
        ? { title: `${name} auf der Map`, sub: 'Unsere ganze Auswahl in Berlin.' }
        : { title: `${name} on the map`, sub: 'Our full selection in Berlin.' }
  }
}

const arrow = (
  <svg
    width="28" height="18" viewBox="0 0 32 20" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true"
  >
    <path d="M3 10 L24 10" />
    <path d="M18 3 L27 10 L18 17" />
  </svg>
)

export default function MapPromoCTA({ kind, name, mapHref, locale, variant = 'block' }: Props) {
  const { title, sub } = getCopy(kind, name, locale)
  const ctaLabel = locale === 'de' ? 'Map öffnen' : 'Open the map'
  const isRestaurant = kind === 'restaurant'

  if (variant === 'chip') {
    return (
      <MapIntentLink href={mapHref} rel="nofollow" className={styles.chip} aria-label={title}>
        <span>{title}</span>
        {arrow}
      </MapIntentLink>
    )
  }

  return (
    <section className={styles.promo} aria-label={title}>
      <h2 className={`${styles.title} ${isRestaurant ? styles.titleRestaurant : ''}`}>
        {isRestaurant ? (
          <>
            <span>The map for people</span>
            {' '}
            <span>who care about food.</span>
          </>
        ) : (
          title
        )}
      </h2>
      <p className={styles.sub}>{sub}</p>
      {/* rel="nofollow" — /map is noindex; without it Google enumerates every
          ?r=/?bezirk=/?cat= variant in GSC. See feedback_seo_nofollow_into_noindex. */}
      <MapIntentLink href={mapHref} rel="nofollow" className={styles.cta}>
        <span>{ctaLabel}</span>
        {arrow}
      </MapIntentLink>
    </section>
  )
}
