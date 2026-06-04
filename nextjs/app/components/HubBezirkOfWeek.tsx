import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { normalizeName } from '@/lib/normalizeName'
import type { HubBezirk } from '@/lib/home/getHomeData'
import styles from './HubBezirkOfWeek.module.css'

interface Props {
  bezirk: HubBezirk | null
}

export default function HubBezirkOfWeek({ bezirk }: Props) {
  const t = useTranslations('hub.bezirkOfWeek')
  if (!bezirk || !bezirk.name) return null
  const spots = bezirk.spots ?? []
  return (
    <section className={styles.section} data-hub-bezirk="">
      <p className={styles.kicker}>{t('kicker')}</p>
      <h2 className={styles.heading}>{bezirk.name}</h2>
      {bezirk.tagline && <p className={styles.tag}>{bezirk.tagline}</p>}
      <div className={styles.grid}>
        {spots.map((s) => (
          <Link key={s._id} href={`/map?r=${s.slug}`} rel="nofollow" className={styles.tile}>
            {s.image && (
              <div className={styles.tileImage}>
                <Image src={s.image} alt="" fill sizes="(max-width: 720px) 50vw, 240px" />
              </div>
            )}
            <div className={styles.tileBody}>
              <h3 className={styles.tileName}>{normalizeName(s.name)}</h3>
              {s.category && <p className={styles.tileMeta}>{s.category}</p>}
            </div>
          </Link>
        ))}
      </div>
      <p className={styles.foot}>
        <Link href={`/map?bezirk=${bezirk.slug}`} rel="nofollow" className={styles.footLink}>
          {t('more', { name: bezirk.name })}
        </Link>
      </p>
    </section>
  )
}
