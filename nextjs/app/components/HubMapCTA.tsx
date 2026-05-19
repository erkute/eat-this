import { Link } from '@/i18n/navigation'
import styles from './HubMapCTA.module.css'

interface Props {
  /** Locale-relative deep-link to the filtered map view, e.g. `/map?bezirk=mitte`. */
  href: string
  /** Primary headline, already localized. e.g. "23 Mitte-Spots auf der Map" */
  title: string
  /** Optional sub-line, already localized. e.g. "Geo-clustered, mit Must-Eats." */
  subline?: string
}

/**
 * Top-of-page CTA banner for hub pages (`/bezirk/[slug]`, `/kategorie/[slug]`).
 * Sits above the restaurant grid so inbound SEO traffic sees the conversion
 * path before scrolling past the full list. Deep-links into the Map filtered
 * by bezirk or category — that surface is paywall-gated for non-paid users,
 * so the click drives Pack conversion.
 */
export default function HubMapCTA({ href, title, subline }: Props) {
  return (
    <Link href={href} className={styles.cta} aria-label={title}>
      <div className={styles.body}>
        <span className={styles.title}>{title}</span>
        {subline && <span className={styles.subline}>{subline}</span>}
      </div>
      <svg
        className={styles.arrow}
        width="32"
        height="20"
        viewBox="0 0 32 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 10 L24 10" />
        <path d="M18 3 L27 10 L18 17" />
      </svg>
    </Link>
  )
}
