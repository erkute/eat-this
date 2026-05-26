import { CSSProperties } from 'react';
import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import { Link } from '@/i18n/navigation';
import type { NewsArticle } from '@/lib/types';
import SiteFooter from './SiteFooter';
import NewsArticleShare from './NewsArticleShare';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import SeoSignupCTA from './SeoSignupCTA';
import styles from './NewsArticleShell.module.css';

interface Props {
  article?: NewsArticle | null;
  relatedArticles?: NewsArticle[];
  locale?: string;
  isActive?: boolean;
}

const REL_TILTS = [-1.6, 2.0, -1.2];

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Magazine-feature article shell — matches restaurant-detail visual language
// (Ranchers brand-red cover lockup, ink-shadow related cards, cream column).
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
    (de ? article.categoryLabelDe : article.categoryLabel) ||
    article.categoryLabel ||
    '';
  const content =
    (de ? article.contentDe : article.content) || article.content || [];
  const dateFormatted = formatDate(article.date, locale);

  const homeLabel = de ? 'Start' : 'Home';
  const newsLabel = 'News';
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: homeLabel, href: '/' },
    { name: newsLabel, href: '/news' },
    { name: title },
  ];

  const recommendations = relatedArticles
    .filter(a => a.slug !== article.slug)
    .slice(0, 3);
  const moreLabel = de ? 'Weitere News' : 'More news';

  return (
    <div
      className={`app-page news-article-page${isActive ? ' active' : ''} ${styles.page}`}
      data-page="news-article"
      id="newsModal"
    >
      <article className={styles.article}>
        {/* ── Hero — magazine cover lockup over the photo ── */}
        <div className={styles.hero}>
          {article.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={article.imageUrl} alt={title} className={styles.heroImg} />
          )}
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroLockup}>
            {(categoryLabel || dateFormatted) && (
              <p className={styles.heroEyebrow}>
                {categoryLabel && <span>{categoryLabel}</span>}
                {categoryLabel && dateFormatted && (
                  <span className={styles.heroEyebrowDot} aria-hidden="true" />
                )}
                {dateFormatted && (
                  <time dateTime={article.date}>{dateFormatted}</time>
                )}
              </p>
            )}
            <h1 className={styles.heroHeadline}>{title}</h1>
          </div>
        </div>

        {/* ── Editorial column ── */}
        <div className={styles.body}>
          <div className={styles.breadcrumbWrap}>
            <Breadcrumbs
              items={breadcrumbItems}
              ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
            />
          </div>

          <div className={styles.shareRow}>
            <span className={styles.shareLabel}>{de ? 'Teilen' : 'Share'}</span>
            <NewsArticleShare title={title} excerpt={excerpt} />
          </div>

          <div className={styles.content}>
            <PortableTextRenderer blocks={content} />
          </div>
        </div>

        {recommendations.length > 0 && (
          <section className={styles.related}>
            <div className={styles.relatedInner}>
              <h2 className={styles.relatedHeading}>{moreLabel}</h2>
              <ul className={styles.relatedGrid} role="list">
                {recommendations.map((rec, i) => {
                  const recTitle =
                    (de ? rec.titleDe : rec.title) || rec.title || '';
                  const recCategory =
                    (de ? rec.categoryLabelDe : rec.categoryLabel) ||
                    rec.categoryLabel ||
                    '';
                  return (
                    <li
                      key={rec.slug}
                      className={styles.relatedItem}
                      style={
                        {
                          ['--tilt' as string]: `${REL_TILTS[i % REL_TILTS.length]}deg`,
                        } as CSSProperties
                      }
                    >
                      <Link href={`/news/${rec.slug}`} className={styles.relatedCard}>
                        <div className={styles.relatedImage}>
                          {rec.imageUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={rec.imageUrl} alt={recTitle} loading="lazy" />
                          )}
                        </div>
                        <div className={styles.relatedBody}>
                          {recCategory && (
                            <span className={styles.relatedCategory}>{recCategory}</span>
                          )}
                          <h3 className={styles.relatedHeadline}>{recTitle}</h3>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}
      </article>
      <SeoSignupCTA />
      <SiteFooter />
    </div>
  );
}
