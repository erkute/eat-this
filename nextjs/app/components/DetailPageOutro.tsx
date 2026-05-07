import Image from 'next/image'
import Link from 'next/link'
import type { NewsArticle } from '@/lib/types'
import { pickLocale } from '@/lib/i18n/pickLocale'
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
  const mapHref = locale === 'de' ? `/map?bezirk=${bezirkSlug}` : `/en/map?bezirk=${bezirkSlug}`
  const newsHref = (slug: string) => (locale === 'de' ? `/news/${slug}` : `/en/news/${slug}`)
  const newsToShow = latestNews.slice(0, 2)

  return (
    <section className={styles.outro}>
      <hr className={styles.divider} />

      <article className={styles.mapBlock}>
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
      </article>

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
              // News articles: title=EN (base), titleDe=DE (override).
              // pickLocale(base, override, locale) returns override when locale='en'.
              // We pass (titleDe, title, locale) so:
              //   locale='de' → returns titleDe (base arg) ✓
              //   locale='en' → returns title (override arg, which is EN) ✓
              const title = pickLocale(article.titleDe, article.title, locale)
              const excerpt = pickLocale(article.excerptDe, article.excerpt, locale)
              const categoryLabel = pickLocale(
                article.categoryLabelDe,
                article.categoryLabel,
                locale,
              )
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
