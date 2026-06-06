import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { categoryArt } from '@/lib/categoryArt'
import type { HubCategory } from '@/lib/home/getHomeData'
import styles from './HubCategories.module.css'

interface Props {
  categories: HubCategory[]
}

export default function HubCategories({ categories }: Props) {
  const t = useTranslations('hub.categories')
  if (categories.length === 0) return null
  return (
    <section className={styles.section} data-hub-categories="">
      <h2 className={styles.heading}>{t('title')}</h2>
      <p className={styles.sub}>{t('curated')}</p>
      <div className={styles.stack}>
        {categories.map((c) => {
          const art = categoryArt(c.slug)
          return (
            <Link key={c.slug} href={`/map?cat=${c.slug}`} rel="nofollow" className={styles.card}>
              {art && (
                <Image src={art} alt="" width={110} height={172} className={styles.art} />
              )}
              <div className={styles.body}>
                <p className={styles.meta}>{t('label')}</p>
                <h3 className={styles.name}>{c.name}</h3>
                {c.line && <p className={styles.line}>{c.line}</p>}
                <span className={styles.cta}>{t('toMap')}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
