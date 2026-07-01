import MapIntentLink from './MapIntentLink'
import styles from './HubMapCTA.module.css'

interface Props {
  /** Locale-relative deep-link to the filtered map view, e.g. `/map?bezirk=mitte`. */
  href: string
  /** Primary headline, already localized. */
  title: string
  /** Optional sub-line, already localized. */
  subline?: string
  /** Visual variant. `'chip'` = inline CTA (default).
   *  `'block'` = larger block variant used inside the dark Final-CTA section. */
  variant?: 'chip' | 'block'
}

export default function HubMapCTA({ href, title, subline, variant = 'chip' }: Props) {
  const cls = variant === 'block' ? styles.ctaBlock : styles.ctaChip
  const homeCls = variant === 'block' ? 'homeCta homeCtaPrimary' : 'homeCta homeCtaPrimary homeCtaSmall'
  return (
    // rel="nofollow" — map deep-links target the noindex /map route, so
    // we don't want Google to enumerate every bezirk/category variant in
    // GSC. See memory feedback_seo_nofollow_into_noindex.md.
    <MapIntentLink href={href} rel="nofollow" className={`${cls} ${homeCls}`} aria-label={title}>
      <span className={styles.title}>{title}</span>
      {subline && <span className={styles.subline}>{subline}</span>}
    </MapIntentLink>
  )
}
