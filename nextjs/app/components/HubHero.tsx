import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { normalizeName } from '@/lib/normalizeName'
import HubMapCTA from './HubMapCTA'
import { formatHeroDate } from '@/lib/home/formatHeroDate'
import type { HomeSpot } from '@/lib/home/getHomeData'
import styles from './HubHero.module.css'

interface Props {
  spot: HomeSpot
  /** ISO date (YYYY-MM-DD) for the kicker. */
  today: string
}

export default function HubHero({ spot, today }: Props) {
  const t = useTranslations('hub.hero')
  const locale = useLocale() as 'de' | 'en'
  const dateLabel = formatHeroDate(today, locale)
  return (
    <section className={styles.hero} data-hub-hero="">
      {spot.image && (
        <div className={styles.photo}>
          <Image
            src={spot.image}
            alt={spot.name}
            fill
            sizes="(max-width: 720px) 100vw, 640px"
            priority
          />
        </div>
      )}
      <div className={styles.body}>
        <p className={styles.kicker}>
          {t('kicker')}{dateLabel ? ` · ${dateLabel}` : ''}
        </p>
        <h1 className={styles.headline}>{normalizeName(spot.name)}</h1>
        {spot.sub && <p className={styles.sub}>{spot.sub}</p>}
        <div className={styles.actions}>
          <HubMapCTA href={`/map?r=${spot.slug}`} title={t('toMap')} variant="chip" />
          <Link href={`/restaurant/${spot.slug}`} className={styles.read}>
            {t('read')}
          </Link>
        </div>
      </div>
    </section>
  )
}
