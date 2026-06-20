import { useLocale, useTranslations } from 'next-intl'
import { CATALOG } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import HubPackBuyButton from './HubPackBuyButton'
import styles from './HubAllBerlin.module.css'

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

export default function HubAllBerlin() {
  const t = useTranslations('hub.allBerlin')
  const loc: 'de' | 'en' = useLocale() === 'de' ? 'de' : 'en'
  const ownedHref = loc === 'de' ? '/map' : '/en/map'
  const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category' && p.slug)
  const allBerlin = CATALOG['all-berlin']
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
          <HubPackBuyButton
            packId={allBerlin.packId}
            packName={allBerlin.displayName}
            amountCents={allBerlin.amountCents}
            locale={loc}
            label={t('buyDirect', { price: formatPrice(allBerlin.amountCents) })}
            pendingLabel={t('pending')}
            ownedLabel={t('owned')}
            ownedHref={ownedHref}
            errorLabel={t('error')}
            className={`${styles.cta} homeCta homeCtaPrimary`}
            errorClassName={styles.error}
            ariaLabel={t('viewAria')}
          />
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
