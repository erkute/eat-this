import { getTranslations } from 'next-intl/server';
import SiteFooter from './SiteFooter';
import NewsTicker from './NewsTicker';
import type { NewsArticle } from '@/lib/types';

interface NewsSectionProps {
  articles: NewsArticle[];
  locale: 'de' | 'en';
}

function formatDate(iso: string | undefined, lang: 'de' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    day: 'numeric',
  });
}

export default async function NewsSection({ articles, locale }: NewsSectionProps) {
  const t = await getTranslations();
  const de = locale === 'de';

  const tickerTitles = articles
    .map(a => (de && a.titleDe ? a.titleDe : a.title))
    .filter(Boolean);

  return (
    <div className="app-page active" data-page="news">
      <section className="news-section" id="news">
        <div className="news-header">
          <div className="news-header-top">
            <p className="section-label reveal">{t('news.sectionLabel')}</p>
            <h2 className="news-title">{t('news.sectionTitle')}</h2>
          </div>
        </div>

        <NewsTicker titles={tickerTitles} />

        <div className="news-grid reveal-stagger">
          {articles.length === 0 ? (
            <p className="news-error">{t('news.errorLoad')}</p>
          ) : (
            articles.map(a => {
              const title = de && a.titleDe ? a.titleDe : a.title;
              const excerpt = de && a.excerptDe ? a.excerptDe : a.excerpt || '';
              const categoryLabel =
                de && a.categoryLabelDe ? a.categoryLabelDe : a.categoryLabel || '';
              const dateFormatted = formatDate(a.date, locale);
              const imageUrl = a.imageUrl || '';

              return (
                <article key={a.slug} className="news-card">
                  <a href={`/news/${a.slug}`}>
                    <div className="news-card-img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt={a.alt || title} loading="lazy" />
                    </div>
                    <div className="news-card-body">
                      <div className="news-card-top">
                        <span className="news-card-category">{categoryLabel}</span>
                        <time className="news-card-date" dateTime={a.date}>
                          {dateFormatted}
                        </time>
                      </div>
                      <h3 className="news-card-headline">{title}</h3>
                      <p className="news-card-excerpt">{excerpt}</p>
                    </div>
                  </a>
                </article>
              );
            })
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
