'use client'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

/**
 * Shown inside the list (restaurants OR must-eats) when the active filters
 * produce zero results. Landing-Voice: Bowlby-Caps-Headline + Saira-Caps-Body
 * + freigestellte Katze als Editorial-Sticker. Match die Hero/FeaturedSpots-
 * Stimme so der leere Zustand wie ein bewusster Brand-Moment wirkt, nicht
 * wie ein technischer Default.
 */
export default function MapListEmpty() {
  const { t } = useTranslation()
  return (
    <div className={styles.listEmpty} role="status">
      <img
        src="/pics/cat.webp"
        alt=""
        aria-hidden="true"
        className={styles.listEmptyCat}
        width={406}
        height={396}
        loading="lazy"
        decoding="async"
      />
      <p className={styles.listEmptyTitle}>{t('map.emptyTitle')}</p>
      <p className={styles.listEmptyBody}>{t('map.emptyBody')}</p>
    </div>
  )
}
