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

      <aside className={styles.mapBlock}>
        <span className={styles.kicker}>{de ? 'Die Map' : 'The Map'}</span>
        <h2 className={styles.h2}>
          {de
            ? `Alle Spots in ${bezirkName} auf der Karte`
            : `All spots in ${bezirkName} on the map`}
        </h2>
        <p className={styles.body}>
          {de
            ? `Sieh dir die kuratierten Spots in ${bezirkName} auf einer interaktiven Karte an — mit Filter, Liste und Detailansicht.`
            : `See the curated spots in ${bezirkName} on an interactive map — with filter, list, and detail view.`}
        </p>
        <Link href={mapHref} className={styles.cta}>
          {de ? 'Map öffnen →' : 'Open map →'}
        </Link>
      </aside>

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
