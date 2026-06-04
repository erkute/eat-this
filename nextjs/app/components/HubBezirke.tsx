import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { HubBezirkChip } from '@/lib/home/getHomeData'
import styles from './HubBezirke.module.css'

interface Props {
  bezirke: HubBezirkChip[]
}

// Browse-by-district: each chip deep-links to the map with that bezirk filter
// pre-applied (?bezirk=<slug>). rel="nofollow" — the map is the noindex tool.
export default function HubBezirke({ bezirke }: Props) {
  const t = useTranslations('hub.bezirke')
  if (bezirke.length === 0) return null
  return (
    <section className={styles.section} data-hub-bezirke="">
      <h2 className={styles.heading}>{t('title')}</h2>
      <p className={styles.sub}>{t('sub')}</p>
      <div className={styles.grid}>
        {bezirke.map((b) => (
          <Link key={b.slug} href={`/map?bezirk=${b.slug}`} rel="nofollow" className={styles.chip}>
            <span className={styles.name}>{b.name}</span>
            <span className={styles.arrow} aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
