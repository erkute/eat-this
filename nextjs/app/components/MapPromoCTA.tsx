import { Link } from '@/i18n/navigation'
import styles from './MapPromoCTA.module.css'

type Kind = 'restaurant' | 'bezirk' | 'kategorie'

interface Props {
  kind: Kind
  /** Restaurant / Bezirk / Kategorie name for {name} interpolation. */
  name: string
  /** Locale-relative deep-link to the (paywall-gated, noindex) /map route. */
  mapHref: string
  locale: 'de' | 'en'
}

// All map-promo wording lives here — single place to wordsmith. Brand voice:
// declarative, no "gratis/free", no spot counts, no cheesy framing.
function getCopy(kind: Kind, name: string, locale: 'de' | 'en'): { title: string; sub: string } {
  const de = locale === 'de'
  switch (kind) {
    case 'restaurant':
      return de
        ? { title: 'Auf der Map ansehen', sub: 'Dieser Spot und jeder andere handverlesene Tipp in Berlin — interaktiv auf der Karte.' }
        : { title: 'See it on the map', sub: 'This spot and every other hand-picked place in Berlin — live on the map.' }
    case 'bezirk':
      return de
        ? { title: `Ganz ${name} auf der Map`, sub: 'Jeder handverlesene Spot im Kiez, interaktiv auf der Karte.' }
        : { title: `All of ${name} on the map`, sub: 'Every hand-picked spot in the area, live on the map.' }
    case 'kategorie':
      return de
        ? { title: `${name} auf der Map`, sub: 'Die ganze Auswahl, interaktiv auf der Karte.' }
        : { title: `${name} on the map`, sub: 'The full selection, live on the map.' }
  }
}

export default function MapPromoCTA({ kind, name, mapHref, locale }: Props) {
  const { title, sub } = getCopy(kind, name, locale)
  const ctaLabel = locale === 'de' ? 'Zur Map' : 'Open the map'
  return (
    <section className={styles.promo} aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.sub}>{sub}</p>
      {/* rel="nofollow" — /map is noindex; without it Google enumerates every
          ?r=/?bezirk=/?cat= variant in GSC. See feedback_seo_nofollow_into_noindex. */}
      <Link href={mapHref} rel="nofollow" className={styles.cta}>
        <span>{ctaLabel}</span>
        <svg
          width="28" height="18" viewBox="0 0 32 20" fill="none"
          stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true"
        >
          <path d="M3 10 L24 10" />
          <path d="M18 3 L27 10 L18 17" />
        </svg>
      </Link>
    </section>
  )
}
