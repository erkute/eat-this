import { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import SiteFooter from './SiteFooter';
import NewsTicker from './NewsTicker';
import SeoSignupCTA from './SeoSignupCTA';
import type { NewsArticle } from '@/lib/types';
import styles from './NewsSection.module.css';

interface NewsSectionProps {
  articles: NewsArticle[];
  locale: 'de' | 'en';
}

// Deterministic ±tilt pattern — cards land like trading-cards on the table,
// same gesture used by FeaturedSpots / DetailPageOutro siblings.
const TILTS = [-1.6, 1.8, -1.2, 1.4, -1.8, 1.1, -1.4, 1.6, -1.0, 1.2];

function formatDate(iso: string | undefined, lang: 'de' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    day: 'numeric',
  });
}

export default function NewsSection({ articles, locale }: NewsSectionProps) {
  const de = locale === 'de';

  const tickerTitles = articles
    .map(a => (de && a.titleDe ? a.titleDe : a.title))
    .filter(Boolean);

  const eyebrow = de ? 'Aus der Redaktion' : 'Editorial';
  const wordmark = de ? 'News' : 'News';
  const deck = de
    ? 'Empfehlungen, Storys und Berichte aus Berlins Food-Szene — kuratiert vom Eat-This-Team.'
    : "Recommendations, stories and dispatches from Berlin's food scene — curated by the Eat This team.";
  const emptyMsg = de
    ? 'Aktuell keine Artikel — schau bald wieder vorbei.'
    : 'No articles right now — check back soon.';

  return (
    <div className={`app-page active ${styles.page}`} data-page="news">
      <section className={styles.section} id="news">
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.wordmark}>{wordmark}</h1>
          <p className={styles.deck}>{deck}</p>
        </header>

        {tickerTitles.length > 0 && (
          <div className={styles.tickerWrap}>
            <NewsTicker titles={tickerTitles} />
          </div>
        )}

        {articles.length === 0 ? (
          <p className={styles.empty}>{emptyMsg}</p>
        ) : (
          <ul className={styles.grid} role="list">
            {articles.map((a, i) => {
              const title = de && a.titleDe ? a.titleDe : a.title;
              const excerpt = de && a.excerptDe ? a.excerptDe : a.excerpt || '';
              const categoryLabel =
                de && a.categoryLabelDe ? a.categoryLabelDe : a.categoryLabel || '';
              const dateFormatted = formatDate(a.date, locale);
              const imageUrl = a.imageUrl || '';

              return (
                <li
                  key={a.slug}
                  className={styles.item}
                  style={{ ['--tilt' as string]: `${TILTS[i % TILTS.length]}deg` } as CSSProperties}
                >
                  <Link href={`/news/${a.slug}`} className={styles.card}>
                    <div className={styles.cardImage}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {imageUrl && <img src={imageUrl} alt={a.alt || title} loading="lazy" />}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        {categoryLabel && (
                          <span className={styles.cardCategory}>{categoryLabel}</span>
                        )}
                        {categoryLabel && dateFormatted && (
                          <span className={styles.cardSep} aria-hidden="true">·</span>
                        )}
                        {dateFormatted && (
                          <time className={styles.cardDate} dateTime={a.date}>
                            {dateFormatted}
                          </time>
                        )}
                      </div>
                      <h2 className={styles.cardHeadline}>{title}</h2>
                      {excerpt && <p className={styles.cardExcerpt}>{excerpt}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <SeoSignupCTA />
      <SiteFooter />
    </div>
  );
}
