import { Link } from '@/i18n/navigation'
import styles from './HubMapCTA.module.css'

interface Props {
  /** Locale-relative deep-link to the filtered map view, e.g. `/map?bezirk=mitte`. */
  href: string
  /** Primary headline, already localized. */
  title: string
  /** Optional sub-line, already localized. */
  subline?: string
  /** Visual variant. `'chip'` = inline yellow chip with arrow (default).
   *  `'block'` = larger block variant used inside the dark Final-CTA section. */
  variant?: 'chip' | 'block'
}

export default function HubMapCTA({ href, title, subline, variant = 'chip' }: Props) {
  const cls = variant === 'block' ? styles.ctaBlock : styles.ctaChip
  return (
    // rel="nofollow" — map deep-links target the noindex /map route, so
    // we don't want Google to enumerate every bezirk/category variant in
    // GSC. See memory feedback_seo_nofollow_into_noindex.md.
    <Link href={href} rel="nofollow" className={cls} aria-label={title}>
      <span className={styles.title}>{title}</span>
      {subline && <span className={styles.subline}>{subline}</span>}
      <svg
        className={styles.arrow}
        width="28" height="18" viewBox="0 0 32 20"
        fill="none" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      >
        <path d="M3 10 L24 10" />
        <path d="M18 3 L27 10 L18 17" />
      </svg>
    </Link>
  )
}
