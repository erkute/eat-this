import { useTranslations } from 'next-intl'
import { CATALOG } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import { Link } from '@/i18n/navigation'
import styles from './HubAllBerlin.module.css'

export default function HubAllBerlin() {
  const t = useTranslations('hub.allBerlin')
  const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category' && p.slug)
  const fanArt = categoryPacks
    .map((p) => categoryArt(p.slug as string))
    .filter((a): a is string => Boolean(a))

  return (
    <section className={styles.section} id="hub-allberlin" data-hub-allberlin="">
      <div className={styles.copyBlock}>
        <p className={styles.kicker}>{t('kicker')}</p>
        <h2 className={styles.heading}>All<br />Berlin</h2>
        <p className={styles.copy}>
          {t.rich('copy', { b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <div className={styles.ctaWrap}>
          <Link
            href="/pack/all-berlin"
            className={`${styles.cta} homeCta homeCtaPrimary`}
            aria-label={t('viewAria')}
          >
            {t('buy')}
          </Link>
        </div>
      </div>

      <div className={styles.visual} aria-hidden="true">
        <div className={styles.fan}>
          {fanArt.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" loading="lazy" />
          ))}
        </div>
      </div>
    </section>
  )
}
