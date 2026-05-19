import { CSSProperties } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import type { NewsArticle, RestaurantCard } from '@/lib/types'
import { localizedCategoryName, type CategoryDef } from '@/lib/categories'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import MapPromoBlock from './MapPromoBlock'
import styles from './DetailPageOutro.module.css'

// Deterministic ±tilt arrays — siblings and news cards land like
// trading-cards thrown on the table. Different patterns for siblings vs.
// news so adjacent sections don't tilt the same way.
const SIBLING_TILTS = [-2.6, 1.8, -2.0]
const NEWS_TILTS    = [-1.6, 2.2]

interface DetailPageOutroProps {
  bezirkSlug: string
  bezirkName: string
  latestNews: NewsArticle[]
  locale: 'de' | 'en'
  siblingsBezirk?: RestaurantCard[]
  siblingsCategory?: RestaurantCard[]
  categoryDef?: CategoryDef | null
}

export default function DetailPageOutro({
  bezirkSlug,
  bezirkName,
  latestNews,
  locale,
  siblingsBezirk = [],
  siblingsCategory = [],
  categoryDef = null,
}: DetailPageOutroProps) {
  const newsToShow = latestNews.slice(0, 2)
  const hasSiblings = siblingsBezirk.length > 0 || siblingsCategory.length > 0

  return (
    <section className={styles.outro}>
      {hasSiblings && (
        <SiblingLinks
          locale={locale}
          bezirkName={bezirkName}
          siblingsBezirk={siblingsBezirk}
          siblingsCategory={siblingsCategory}
          categoryDef={categoryDef}
        />
      )}
      <MapPromoBlock
        mapHref={`/map?bezirk=${bezirkSlug}`}
        ariaLabel={locale === 'de' ? `Entdecke ${bezirkName} auf der Map` : `Discover ${bezirkName} on the map`}
      />
      {newsToShow.length > 0 && <LatestNewsGrid articles={newsToShow} locale={locale} />}
    </section>
  )
}

/* ────────── Sibling cross-links (SEO discoverability) ────────── */

interface SiblingLinksProps {
  locale: 'de' | 'en'
  bezirkName: string
  siblingsBezirk: RestaurantCard[]
  siblingsCategory: RestaurantCard[]
  categoryDef: CategoryDef | null
}

function SiblingLinks({
  locale,
  bezirkName,
  siblingsBezirk,
  siblingsCategory,
  categoryDef,
}: SiblingLinksProps) {
  const de = locale === 'de'
  const categoryLabel = categoryDef ? localizedCategoryName(categoryDef, locale) : null
  return (
    <div className={styles.siblings}>
      {siblingsBezirk.length > 0 && (
        <SiblingRow
          title={de ? `Mehr in ${bezirkName}` : `More in ${bezirkName}`}
          restaurants={siblingsBezirk}
        />
      )}
      {siblingsCategory.length > 0 && categoryDef && categoryLabel && (
        <SiblingRow
          title={de ? `Mehr ${categoryLabel}` : `More ${categoryLabel.toLowerCase()}`}
          restaurants={siblingsCategory}
        />
      )}
    </div>
  )
}

interface SiblingRowProps {
  title: string
  restaurants: RestaurantCard[]
}

function SiblingRow({ title, restaurants }: SiblingRowProps) {
  return (
    <div className={styles.siblingGroup}>
      <h2 className={styles.siblingTitle}>{title}</h2>
      <ul className={styles.siblingScroller} role="list">
        {restaurants.map((r, i) => (
          <li
            key={r._id}
            className={styles.siblingItem}
            style={{ ['--tilt' as string]: `${SIBLING_TILTS[i % SIBLING_TILTS.length]}deg` } as CSSProperties}
          >
            <Link href={`/restaurant/${r.slug}`} className={styles.siblingCard}>
              <div className={styles.siblingCardImage}>
                {r.photo && (
                  <Image
                    src={r.photo}
                    alt={r.name}
                    fill
                    sizes="(max-width: 720px) 72vw, 320px"
                  />
                )}
              </div>
              <div className={styles.siblingCardBody}>
                <h3 className={styles.siblingCardName}>{r.name}</h3>
                {(() => {
                  const priceLabel = formatPriceLabel(r)
                  if (!r.cuisineType && !priceLabel) return null
                  return (
                    <div className={styles.siblingCardMeta}>
                      {r.cuisineType && <span>{r.cuisineType}</span>}
                      {r.cuisineType && priceLabel && <span aria-hidden="true">·</span>}
                      {priceLabel && <span>{priceLabel}</span>}
                    </div>
                  )
                })()}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ────────── Latest news grid (2 cards, mobile 1-col / desktop 2-col) ────────── */

interface LatestNewsGridProps {
  articles: NewsArticle[]
  locale: 'de' | 'en'
}

function LatestNewsGrid({ articles, locale }: LatestNewsGridProps) {
  const de = locale === 'de'
  return (
    <div className={styles.news}>
      <h2 className={styles.newsHeading}>{de ? 'Aus der Redaktion' : 'From the editors'}</h2>
      <ul className={styles.newsGrid} role="list">
        {articles.map((article, i) => (
          <li
            key={article._id}
            className={styles.newsItem}
            style={{ ['--tilt' as string]: `${NEWS_TILTS[i % NEWS_TILTS.length]}deg` } as CSSProperties}
          >
            <NewsCard article={article} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function NewsCard({ article, locale }: { article: NewsArticle; locale: 'de' | 'en' }) {
  // News articles use the inverted i18n convention (base = EN, *De = DE).
  // Match the news page's inline pattern instead of the pickLocale helper.
  const title = locale === 'de' ? article.titleDe || article.title : article.title
  const excerpt = locale === 'de' ? article.excerptDe || article.excerpt : article.excerpt
  const categoryLabel = locale === 'de'
    ? article.categoryLabelDe || article.categoryLabel
    : article.categoryLabel

  return (
    <Link href={`/news/${article.slug}`} className={styles.newsCard}>
      {article.imageUrl && (
        <div className={styles.newsImage}>
          <Image
            src={article.imageUrl}
            alt={title ?? ''}
            fill
            sizes="(max-width: 720px) 72vw, 320px"
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
