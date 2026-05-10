import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import type { NewsArticle, RestaurantCard } from '@/lib/types'
import { localizedCategoryName, type CategoryDef } from '@/lib/categories'
import styles from './DetailPageOutro.module.css'

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
      <hr className={styles.divider} />
      {hasSiblings && (
        <SiblingLinks
          locale={locale}
          bezirkSlug={bezirkSlug}
          bezirkName={bezirkName}
          siblingsBezirk={siblingsBezirk}
          siblingsCategory={siblingsCategory}
          categoryDef={categoryDef}
        />
      )}
      <MapPromoBlock bezirkSlug={bezirkSlug} bezirkName={bezirkName} locale={locale} />
      {newsToShow.length > 0 && <LatestNewsGrid articles={newsToShow} locale={locale} />}
    </section>
  )
}

/* ────────── Sibling cross-links (SEO discoverability) ────────── */

interface SiblingLinksProps {
  locale: 'de' | 'en'
  bezirkSlug: string
  bezirkName: string
  siblingsBezirk: RestaurantCard[]
  siblingsCategory: RestaurantCard[]
  categoryDef: CategoryDef | null
}

function SiblingLinks({
  locale,
  bezirkSlug,
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
          locale={locale}
          title={de ? `Mehr in ${bezirkName}` : `More in ${bezirkName}`}
          hubHref={`/bezirk/${bezirkSlug}`}
          restaurants={siblingsBezirk}
        />
      )}
      {siblingsCategory.length > 0 && categoryDef && categoryLabel && (
        <SiblingRow
          locale={locale}
          title={de ? `Mehr ${categoryLabel}` : `More ${categoryLabel.toLowerCase()}`}
          hubHref={`/kategorie/${categoryDef.slug}`}
          restaurants={siblingsCategory}
        />
      )}
    </div>
  )
}

interface SiblingRowProps {
  locale: 'de' | 'en'
  title: string
  hubHref: string
  restaurants: RestaurantCard[]
}

function SiblingRow({ locale, title, hubHref, restaurants }: SiblingRowProps) {
  const de = locale === 'de'
  return (
    <div className={styles.siblingGroup}>
      <div className={styles.siblingHead}>
        <h2 className={styles.siblingTitle}>{title}</h2>
        <Link href={hubHref} className={styles.siblingHubLink}>
          {de ? 'Alle ansehen' : 'See all'}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul className={styles.siblingScroller} role="list">
        {restaurants.map(r => (
          <li key={r._id} className={styles.siblingItem}>
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
                {(r.cuisineType || r.price) && (
                  <div className={styles.siblingCardMeta}>
                    {r.cuisineType && <span>{r.cuisineType}</span>}
                    {r.cuisineType && r.price && <span aria-hidden="true">·</span>}
                    {r.price && <span>{r.price}</span>}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ────────── Map promo banner ────────── */

interface MapPromoBlockProps {
  bezirkSlug: string
  bezirkName: string
  locale: 'de' | 'en'
}

function MapPromoBlock({ bezirkSlug, bezirkName, locale }: MapPromoBlockProps) {
  const de = locale === 'de'
  const mapHref = `/map?bezirk=${bezirkSlug}`
  const ariaLabel = de ? `Entdecke ${bezirkName} auf der Map` : `Discover ${bezirkName} on the map`

  return (
    <Link href={mapHref} className={styles.mapBlock} aria-label={ariaLabel}>
      <Image
        src="/pics/map-promo.webp"
        alt=""
        width={1536}
        height={1024}
        className={styles.mapBlockPromo}
        sizes="(min-width: 720px) 1032px, calc(100vw - 48px)"
      />
    </Link>
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
    <>
      <div className={styles.newsHead}>
        <span className={styles.kicker}>News</span>
        <h2 className={styles.h2}>{de ? 'Aus der Redaktion' : 'From the editors'}</h2>
      </div>
      <div className={styles.newsGrid}>
        {articles.map(article => (
          <NewsCard key={article._id} article={article} locale={locale} />
        ))}
      </div>
    </>
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
