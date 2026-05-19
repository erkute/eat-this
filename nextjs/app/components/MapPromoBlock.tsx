import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import styles from './MapPromoBlock.module.css'

interface Props {
  /** Locale-relative deep-link to the (paywall-gated) map view. */
  mapHref: string
  /** Localized aria-label for the banner link. */
  ariaLabel: string
}

/**
 * Freigestelltes Map-Promo-Banner: the editorial map-CTA used at the bottom
 * of restaurant, bezirk and kategorie detail pages. The wording ("the map
 * for people who care about food.") is baked into the WebP — there's no
 * additional button text, the whole banner is the click target.
 */
export default function MapPromoBlock({ mapHref, ariaLabel }: Props) {
  return (
    <Link href={mapHref} className={styles.mapBlock} aria-label={ariaLabel}>
      <Image
        src="/pics/map-promo.webp"
        alt=""
        width={1536}
        height={1024}
        className={styles.mapBlockPromo}
        sizes="(min-width: 720px) 1032px, calc(100vw - 48px)"
      />
    </Link>
  )
}
