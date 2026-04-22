'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { NewsArticle } from '@/lib/types';

interface NewsSectionProps {
  articles: NewsArticle[];
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

export default function NewsSection({ articles }: NewsSectionProps) {
  const { t, lang } = useTranslation();
  const de = lang === 'de';
  const tickerSlotRef = useRef<HTMLDivElement>(null);

  // Legacy news.min.js fills .news-ticker with marquee children before React
  // hydrates. Mount the ticker div manually into a slot after hydration so
  // React never owns its children.
  useEffect(() => {
    if (tickerSlotRef.current && !tickerSlotRef.current.firstChild) {
      const ticker = document.createElement('div');
      ticker.className = 'news-ticker';
      ticker.setAttribute('aria-hidden', 'true');
      tickerSlotRef.current.appendChild(ticker);
    }
    window._bindNewsCards?.();
  }, [articles, lang]);

  return (
    <div className="app-page" data-page="news" suppressHydrationWarning>
      <section className="news-section" id="news">
        <div className="news-header">
          <div className="news-header-top">
            <p className="section-label reveal">{t('news.sectionLabel')}</p>
            <h2 className="news-title">{t('news.sectionTitle')}</h2>
          </div>
        </div>

        <div ref={tickerSlotRef} suppressHydrationWarning />


        <div className="news-grid reveal-stagger">
          {articles.length === 0 ? (
            <p className="news-error">{t('news.errorLoad')}</p>
          ) : (
            articles.map((a, i) => {
              const title = de && a.titleDe ? a.titleDe : a.title;
              const excerpt = de && a.excerptDe ? a.excerptDe : a.excerpt || '';
              const categoryLabel =
                de && a.categoryLabelDe ? a.categoryLabelDe : a.categoryLabel || '';
              const content = de && a.contentDe ? a.contentDe : a.content || '';
              const dateFormatted = formatDate(a.date, lang);
              const imageUrl = a.imageUrl || '';
              const contentStr =
                Array.isArray(content) ? JSON.stringify(content) : String(content);

              return (
                <article
                  key={a.slug}
                  className="news-card"
                  data-index={i}
                  data-category={a.category || ''}
                  data-title={title}
                  data-img={imageUrl}
                  data-category-label={categoryLabel}
                  data-date={dateFormatted}
                  data-excerpt={excerpt}
                  data-content={contentStr}
                  data-slug={a.slug}
                >
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
    </div>
  );
}

declare global {
  interface Window {
    _bindNewsCards?: () => void;
  }
}
