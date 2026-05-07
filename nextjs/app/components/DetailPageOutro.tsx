import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import type { NewsArticle } from '@/lib/types'
import styles from './DetailPageOutro.module.css'

interface DetailPageOutroProps {
  bezirkSlug: string
  bezirkName: string
  latestNews: NewsArticle[]
  locale: 'de' | 'en'
}

function formatNewsDate(iso: string | undefined, locale: 'de' | 'en'): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
  })
}

export default function DetailPageOutro({
  bezirkSlug,
  bezirkName,
  latestNews,
  locale,
}: DetailPageOutroProps) {
  const de = locale === 'de'
  const mapHref = `/map?bezirk=${bezirkSlug}`
  const newsHref = (slug: string) => `/news/${slug}`
  const newsToShow = latestNews.slice(0, 2)

  return (
    <section className={styles.outro}>
      <hr className={styles.divider} />

      <Link href={mapHref} className={styles.mapBlock} aria-label={de ? `Entdecke ${bezirkName}` : `Discover ${bezirkName}`}>
        <Image
          src="/pics/map-promo-mobile.png"
          alt=""
          width={918}
          height={1256}
          className={styles.mapBlockPromoMobile}
          sizes="100vw"
          priority={false}
        />
        <Image
          src="/pics/map-promo.png"
          alt=""
          width={1802}
          height={873}
          className={styles.mapBlockPromoDesktop}
          sizes="760px"
          priority={false}
        />
        <span className={styles.mapBlockCta}>
          {de ? `Entdecke ${bezirkName}` : `Discover ${bezirkName}`}
          <span className={styles.mapBlockCtaArrow} aria-hidden="true">→</span>
        </span>
      </Link>

      {newsToShow.length > 0 && (
        <>
          <div className={styles.newsHead}>
            <span className={styles.kicker}>News</span>
            <h2 className={styles.h2}>
              {de ? 'Aus der Redaktion' : 'From the editors'}
            </h2>
          </div>
          <div className={styles.newsGrid}>
            {newsToShow.map(article => {
              const title = locale === 'de' ? article.titleDe || article.title : article.title
              const excerpt = locale === 'de' ? article.excerptDe || article.excerpt : article.excerpt
              const categoryLabel = locale === 'de' ? article.categoryLabelDe || article.categoryLabel : article.categoryLabel
              return (
                <Link
                  key={article._id}
                  href={newsHref(article.slug)}
                  className={styles.newsCard}
                >
                  {article.imageUrl && (
                    <div className={styles.newsImage}>
                      <Image
                        src={article.imageUrl}
                        alt={title ?? ''}
                        fill
                        sizes="(max-width: 720px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className={styles.newsBody}>
                    <div className={styles.newsMeta}>
                      {formatNewsDate(article.date, locale)}
                      {categoryLabel ? ` · ${categoryLabel}` : ''}
                    </div>
                    {title && <h3 className={styles.newsTitle}>{title}</h3>}
                    {excerpt && <p className={styles.newsExcerpt}>{excerpt}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
