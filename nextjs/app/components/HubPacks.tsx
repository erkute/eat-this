import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { CATALOG } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import HubPackBuyButton from './HubPackBuyButton'
import HubWelcomePack from './HubWelcomePack'
import styles from './HubPacks.module.css'

interface Props {
  categoryNames: Record<string, string>
}

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

export default function HubPacks({ categoryNames }: Props) {
  const t = useTranslations('hub.packs')
  const loc: 'de' | 'en' = useLocale() === 'de' ? 'de' : 'en'
  const ownedHref = loc === 'de' ? '/map' : '/en/map'
  const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category' && p.slug)
  return (
    <section className={styles.section} id="hub-packs" data-hub-packs="">
      <h2 className={styles.heading}>{t('title')}</h2>
      <div className={styles.scroller}>
        <HubWelcomePack />
        {categoryPacks.map((p) => {
          const slug = p.slug as string
          const name = categoryNames[slug] ?? p.displayName
          const art = categoryArt(slug)
          return (
            <article key={p.packId} className={styles.pack}>
              <div className={styles.packArt}>
                {art && <Image src={art} alt="" fill sizes="200px" className={styles.artImg} />}
              </div>
              <p className={styles.packCat}>{t('cat', { name })}</p>
              <h3 className={styles.packName}>{name}</h3>
              <p className={styles.packMeta}>
                <span className={styles.tags}>{p.spectrum[loc]}</span>
                {p.description[loc]}
              </p>
              <div className={styles.packFoot}>
                <HubPackBuyButton
                  packId={p.packId}
                  packName={p.displayName}
                  amountCents={p.amountCents}
                  locale={loc}
                  label={t('buy', { price: formatPrice(p.amountCents) })}
                  pendingLabel={t('pending')}
                  ownedLabel={t('owned')}
                  ownedHref={ownedHref}
                  errorLabel={t('error')}
                  className={`${styles.packCta} homeCta homeCtaPrimary`}
                  errorClassName={styles.packError}
                  ariaLabel={t('buyAria', { name })}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
