import { PortableTextRenderer } from '@/lib/PortableTextRenderer';
import type { NewsArticle } from '@/lib/types';
import SiteFooter from './SiteFooter';
import NewsArticleShare from './NewsArticleShare';

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
    month: 'long',
    day: 'numeric',
  });
}

// Server-rendered article body. Replaces the empty-shell + legacy-JS-filler
// dance (app.min.js's de()/ne()/pt()/dt()) — Google now sees the full article
// in the SSR'd HTML, no client-side fetch step.
export default function NewsArticleShell({ article, relatedArticles = [], locale = 'de', isActive = false }: Props) {
  // /news (without slug) and other SPA routes don't render the article shell.
  if (!article) return null;

  const de = locale === 'de';
  const title = (de ? article.titleDe : article.title) || article.title || article.titleDe || '';
  const excerpt = (de ? article.excerptDe : article.excerpt) || article.excerpt || '';
  const categoryLabel = (de ? article.categoryLabelDe : article.categoryLabel) || article.categoryLabel || '';
  const content = (de ? article.contentDe : article.content) || article.content || [];
  const dateFormatted = formatDate(article.date, locale);
  const moreLabel = de ? 'Weitere News' : 'More news';
  const recommendations = relatedArticles
    .filter(a => a.slug !== article.slug)
    .slice(0, 3);

  return (
    <div
      className={`app-page news-article-page${isActive ? ' active' : ''}`}
      data-page="news-article"
      id="newsModal"
    >
      <article className="news-article">
        <div className="news-article-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {article.imageUrl && <img src={article.imageUrl} alt={title} />}
        </div>
        <div className="news-article-body">
          <div className="news-article-meta">
            <span className="news-modal-category">{categoryLabel}</span>
            <time className="news-modal-date" dateTime={article.date}>{dateFormatted}</time>
          </div>
          <h1 className="news-modal-title">{title}</h1>
          <NewsArticleShare title={title} excerpt={excerpt} />
          <div className="news-modal-content">
            <PortableTextRenderer blocks={content} />
          </div>
        </div>
        {recommendations.length > 0 && (
          <section className="news-article-more">
            <div className="news-article-more-inner">
              <p className="news-article-more-label">{moreLabel}</p>
              <div className="news-article-more-grid">
                {recommendations.map(rec => {
                  const recTitle = (de ? rec.titleDe : rec.title) || rec.title || '';
                  const recCategory = (de ? rec.categoryLabelDe : rec.categoryLabel) || rec.categoryLabel || '';
                  const href = locale === 'de' ? `/news/${rec.slug}` : `/${locale}/news/${rec.slug}`;
                  return (
                    <article key={rec.slug} className="news-rec-card">
                      <a href={href}>
                        <div className="news-rec-img">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {rec.imageUrl && <img src={rec.imageUrl} alt={recTitle} loading="lazy" />}
                        </div>
                        <div className="news-rec-body">
                          <span className="news-rec-category">{recCategory}</span>
                          <h4 className="news-rec-headline">{recTitle}</h4>
                        </div>
                      </a>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </article>
      <SiteFooter />
    </div>
  );
}
