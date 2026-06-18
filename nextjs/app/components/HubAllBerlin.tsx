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
  const sumCents = categoryPacks.reduce((s, p) => s + p.amountCents, 0)
  const fanArt = categoryPacks
    .map((p) => categoryArt(p.slug as string))
    .filter((a): a is string => Boolean(a))

  return (
    <section className={styles.section} data-hub-allberlin="">
      <div className={styles.copyBlock}>
        <p className={styles.kicker}>{t('kicker')}</p>
        <h2 className={styles.heading}>All<br />Berlin</h2>
        <p className={styles.copy}>
          {t.rich('copy', { b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <p className={styles.dealSummary}>
          <span>9 Packs. </span>
          <span>{t('compare', { amount: formatPrice(sumCents) })}. </span>
          <strong>{formatPrice(allBerlin.amountCents)}. </strong>
          <span>{t('save', { amount: formatPrice(sumCents - allBerlin.amountCents) })}.</span>
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
          <span className={styles.ctaPrice} aria-hidden="true">
            {formatPrice(allBerlin.amountCents)}
          </span>
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
