import Image from 'next/image';
import { PortableTextRenderer, extractHeadings } from '@/lib/PortableTextRenderer';
import { Link } from '@/i18n/navigation';
import type { NewsArticle, MustEatCardBlock } from '@/lib/types';
import { normalizeName } from '@/lib/normalizeName';
import SiteFooter from './SiteFooter';
import NewsArticleShare from './NewsArticleShare';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import styles from './NewsArticleShell.module.css';

interface Props {
  article?: NewsArticle | null;
  relatedArticles?: NewsArticle[];
  locale?: string;
  isActive?: boolean;
}

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Article detail — Chewy magazine feature (mockup-chewy screen 8). Inline
// must-eat cards are driven by mustEatCard reference blocks in the body;
// TOC + drop-cap come from the body.
export default function NewsArticleShell({
  article,
  relatedArticles = [],
  locale = 'de',
  isActive = false,
}: Props) {
  if (!article) return null;

  const de = locale === 'de';
  const title =
    (de ? article.titleDe : article.title) || article.title || article.titleDe || '';
  const excerpt =
    (de ? article.excerptDe : article.excerpt) || article.excerpt || '';
  const categoryLabel =
    (de ? article.categoryLabelDe : article.categoryLabel) || article.categoryLabel || '';
  const content =
    (de ? article.contentDe : article.content) || article.content || [];
  const dateFormatted = formatDate(article.date, locale);

  const headings = extractHeadings(content);
  const showToc = headings.length >= 2;
  const tocLabel = de ? 'In diesem Artikel' : 'In this article';

  // Inline "Must Eat" banner — dark poster block in the article column, same
  // sticker language as MapPromoCTA. The image is the full collectible trading
  // card, floating freigestellt with a tilt. The whole banner links to the
  // Must-Eat detail on the map (?me=<id>), mirroring an in-app tap.
  const renderMustEatCard = (block: MustEatCardBlock) => {
    if (!block.dish && !block.dishImage) return null;
    // "Must Eat" lives in the kicker only — the CTA uses the canonical map
    // wording so the label doesn't repeat itself.
    const ctaLabel = de ? 'Auf die Map' : 'To the map';
    const restName = block.restaurantName ? normalizeName(block.restaurantName) : '';
    const description =
      (de ? block.dishDescription : block.dishDescriptionEn || block.dishDescription) || '';
    // Natural sentence instead of "@ Name · Bezirk" metadata soup.
    const whereLine = restName
      ? de
        ? `Gibt's bei ${restName}${block.district ? ` in ${block.district}` : ''}`
        : `Get it at ${restName}${block.district ? ` in ${block.district}` : ''}`
      : block.district || '';
    const inner = (
      <>
        {block.dishImage && (
          <div className={styles.mustEatPh}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.dishImage} alt={block.dish || ''} />
          </div>
        )}
        <div className={styles.mustEatBody}>
          <span className={styles.mustEatKicker}>Must Eat</span>
          {block.dish && <h3 className={styles.mustEatName}>{block.dish}</h3>}
          {description && <p className={styles.mustEatDesc}>{description}</p>}
          {whereLine && <span className={styles.mustEatRest}>{whereLine}</span>}
          <span className={styles.mustEatCta}>
            <span>{ctaLabel}</span>
            <svg
              width="26" height="17" viewBox="0 0 32 20" fill="none"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true"
            >
              <path d="M3 10 L24 10" />
              <path d="M18 3 L27 10 L18 17" />
            </svg>
          </span>
        </div>
      </>
    );
    return block.mustEatId ? (
      <Link
        href={`/map?me=${block.mustEatId}`}
        rel="nofollow"
        className={styles.mustEat}
        aria-label={`${block.dish || 'Must Eat'}${restName ? ` — ${restName}` : ''}`}
      >
        {inner}
      </Link>
    ) : (
      <div className={styles.mustEat}>{inner}</div>
    );
  };

  const homeLabel = de ? 'Start' : 'Home';
  const newsLabel = de ? 'Auf dem Teller' : 'On the Menu';
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: homeLabel, href: '/' },
    { name: newsLabel, href: '/news' },
    { name: title },
  ];

  const recommendations = relatedArticles
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);
  const moreLabel = de ? 'Weiter auf dem Teller' : 'More on the menu';

  return (
    <div
      className={`app-page news-article-page${isActive ? ' active' : ''} ${styles.page}`}
      data-page="news-article"
      id="newsModal"
    >
      <article className={styles.article}>
        {article.imageUrl && (
          // Hero = LCP element. fill + the Sanity loader serve a width-matched
          // srcset (mobile no longer downloads the w=1200 desktop file).
          <div className={styles.heroWrap}>
            <Image
              src={article.imageUrl}
              alt={title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 720px"
              className={styles.hero}
            />
          </div>
        )}

        <div className={styles.byline}>
          <span>{categoryLabel || 'Berlin · Die Kolumne'}</span>
          {dateFormatted && <time dateTime={article.date}>{dateFormatted}</time>}
        </div>

        <h1 className={styles.title}>{title}</h1>

        {excerpt && <p className={styles.lede}>{excerpt}</p>}

        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs
            items={breadcrumbItems}
            ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
          />
        </div>

        {showToc && (
          <nav className={styles.toc} aria-label={tocLabel}>
            <p className={styles.tocLabel}>{tocLabel}</p>
            <ol className={styles.tocList}>
              {headings.map((h) => (
                <li key={h.id} className={styles.tocItem}>
                  <a href={`#${h.id}`} className={styles.tocLink}>{h.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className={styles.content}>
          <PortableTextRenderer blocks={content} renderMustEatCard={renderMustEatCard} />
        </div>

        <div className={styles.shareRow}>
          <NewsArticleShare
            title={title}
            excerpt={excerpt}
            label={de ? 'Teilen' : 'Share'}
            className={styles.shareBtn}
          />
        </div>

        {recommendations.length > 0 && (
          <section className={styles.related}>
            <h2 className={styles.relatedHeading}>{moreLabel}</h2>
            <ul className={styles.relatedGrid} role="list">
              {recommendations.map((rec) => {
                const recTitle = (de ? rec.titleDe : rec.title) || rec.title || '';
                const recCategory =
                  (de ? rec.categoryLabelDe : rec.categoryLabel) || rec.categoryLabel || '';
                return (
                  <li key={rec.slug}>
                    <Link href={`/news/${rec.slug}`} className={styles.relatedCard}>
                      <div
                        className={styles.relatedImage}
                        style={rec.imageUrl ? { backgroundImage: `url(${rec.imageUrl})` } : undefined}
                        role="img"
                        aria-label={recTitle}
                      />
                      <div className={styles.relatedBody}>
                        {recCategory && <span className={styles.relatedCategory}>{recCategory}</span>}
                        <h3 className={styles.relatedHeadline}>{recTitle}</h3>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
