import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { HubArticle } from '@/lib/home/getHomeData'
import styles from './HubMagazine.module.css'

interface Props {
  articles: HubArticle[]
}

export default function HubMagazine({ articles }: Props) {
  const t = useTranslations('hub.magazine')
  if (articles.length === 0) return null
  return (
    <section className={styles.section} data-hub-magazine="">
      <h2 className={styles.heading}>{t('title')}</h2>
      <p className={styles.meta}>
        <Link href="/news" className={styles.metaLink}>
          {t('all')}
        </Link>
      </p>
      <ul className={styles.scroller} role="list">
        {articles.map((a) => (
          <li key={a.slug} className={styles.item}>
            <Link href={`/news/${a.slug}`} className={styles.card}>
              <div className={styles.cardImage}>
                {a.image && (
                  <Image src={a.image} alt={a.title} fill sizes="(max-width: 720px) 80vw, 360px" />
                )}
                {a.kicker && <span className={styles.stamp}>{a.kicker}</span>}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{a.title}</h3>
                <span className={styles.read}>{t('read')}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
