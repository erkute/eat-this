import { CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { HubBezirkChip } from '@/lib/home/getHomeData'
import styles from './HubBezirke.module.css'

interface Props {
  bezirke: HubBezirkChip[]
}

// Deterministic tilt per chip (index-based, not random) so SSR and client
// agree — the slight rotation gives the chips a pinned-sticker feel.
const TILTS = [-2.4, 1.6, -1, 2.2, -1.8, 1.2, -2, 0.8]

// Browse-by-district: each chip is a "sticker" deep-linking to the map with
// that bezirk filter pre-applied (?bezirk=<slug>), with its open-spot count as
// a badge. rel="nofollow" — the map is the noindex tool.
export default function HubBezirke({ bezirke }: Props) {
  const t = useTranslations('hub.bezirke')
  if (bezirke.length === 0) return null
  return (
    <section className={styles.section} data-hub-bezirke="">
      <h2 className={styles.heading}>{t('title')}</h2>
      <p className={styles.sub}>{t('sub')}</p>
      <div className={styles.grid}>
        {bezirke.map((b, i) => (
          <Link
            key={b.slug}
            href={`/map?bezirk=${b.slug}`}
            rel="nofollow"
            className={styles.chip}
            style={{ ['--rot' as string]: `${TILTS[i % TILTS.length]}deg` } as CSSProperties}
          >
            <span className={styles.name}>{b.name}</span>
            <span className={styles.count}>{b.count}</span>
            <span className={styles.arrow} aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
