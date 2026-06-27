import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { CATALOG } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import { Link } from '@/i18n/navigation'
import HubWelcomePack from './HubWelcomePack'
import styles from './HubPacks.module.css'

interface Props {
  categoryNames: Record<string, string>
}

export default function HubPacks({ categoryNames }: Props) {
  const t = useTranslations('hub.packs')
  const loc: 'de' | 'en' = useLocale() === 'de' ? 'de' : 'en'
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
                <Link
                  href={`/pack/${slug}`}
                  className={`${styles.packCta} homeCta homeCtaPrimary`}
                  aria-label={t('viewAria', { name })}
                >
                  {t('view')}
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
