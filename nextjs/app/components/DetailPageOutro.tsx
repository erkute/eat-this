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

export default function DetailPageOutro({
  bezirkSlug,
  bezirkName,
  latestNews,
  locale,
}: DetailPageOutroProps) {
  const newsToShow = latestNews.slice(0, 2)

  return (
    <section className={styles.outro}>
      <hr className={styles.divider} />
      <MapPromoBlock bezirkSlug={bezirkSlug} bezirkName={bezirkName} locale={locale} />
      {newsToShow.length > 0 && <LatestNewsGrid articles={newsToShow} locale={locale} />}
    </section>
  )
}

/* ────────── Map promo (mobile portrait + desktop landscape) ────────── */

interface MapPromoBlockProps {
  bezirkSlug: string
  bezirkName: string
  locale: 'de' | 'en'
}

function MapPromoBlock({ bezirkSlug, bezirkName, locale }: MapPromoBlockProps) {
  const de = locale === 'de'
  const mapHref = `/map?bezirk=${bezirkSlug}`
  const ariaLabel = de ? `Entdecke ${bezirkName}` : `Discover ${bezirkName}`
  const ctaLabel = ariaLabel

  return (
    <div className={styles.mapBlock}>
      <div className={styles.mapBlockMobileWrap}>
        <Link href={mapHref} className={styles.mapBlockImageLink} aria-label={ariaLabel}>
          <Image
            src="/pics/map-promo-mobile.png"
            alt=""
            width={918}
            height={1256}
            className={styles.mapBlockPromoMobile}
            sizes="100vw"
          />
        </Link>
        <Link href={mapHref} className={styles.mapBlockCta}>
          {ctaLabel}
          <span className={styles.mapBlockCtaArrow} aria-hidden="true">→</span>
        </Link>
      </div>
      <Link href={mapHref} className={styles.mapBlockDesktopLink} aria-label={ariaLabel}>
        <Image
          src="/pics/map-promo.png"
          alt=""
          width={1802}
          height={873}
          className={styles.mapBlockPromoDesktop}
          sizes="760px"
        />
      </Link>
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
