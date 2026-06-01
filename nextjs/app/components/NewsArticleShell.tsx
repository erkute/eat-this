import { PortableTextRenderer, extractHeadings } from '@/lib/PortableTextRenderer';
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

// Article detail — Chewy magazine feature (mockup-chewy screen 8). The mockup's
// inline must-eat, pull-quote and spot-rail have no CMS data source, so they're
// omitted (not invented); TOC + drop-cap are generated from the body.
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
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={article.imageUrl} alt={title} className={styles.hero} />
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
          <PortableTextRenderer blocks={content} />
        </div>

        <div className={styles.shareRow}>
          <span className={styles.shareLabel}>{de ? 'Teilen' : 'Share'}</span>
          <NewsArticleShare title={title} excerpt={excerpt} />
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
      <SeoSignupCTA />
      <SiteFooter />
    </div>
  );
}
