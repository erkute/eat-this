import { Link } from '@/i18n/navigation';
import SiteFooter from './SiteFooter';
import SeoSignupCTA from './SeoSignupCTA';
import type { NewsArticle } from '@/lib/types';
import styles from './NewsSection.module.css';

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

// "Auf dem Teller" — the magazine index, mockup-chewy screen 7.
export default function NewsSection({ articles, locale }: NewsSectionProps) {
  const de = locale === 'de';

  const eyebrow = 'Berlin · Stories';
  const coverTitle = de ? 'Auf dem Teller' : 'On the Menu';
  const coverSub = de
    ? 'Was wir essen, wo wir hingehen, was uns aufregt.'
    : 'What we eat, where we go, what gets us going.';
  const readMore = de ? 'Weiterlesen →' : 'Read more →';
  const emptyMsg = de
    ? 'Aktuell keine Artikel — schau bald wieder vorbei.'
    : 'No articles right now — check back soon.';

  return (
    <div className={`app-page active ${styles.page}`} data-page="news">
      <section id="news">
        <header className={styles.cover}>
          <div className={styles.coverRule} aria-hidden="true" />
          <p className={styles.coverEyebrow}>{eyebrow}</p>
          <h1 className={styles.coverH}>{coverTitle}</h1>
          <p className={styles.coverSub}>{coverSub}</p>
        </header>

        {articles.length === 0 ? (
          <p className={styles.empty}>{emptyMsg}</p>
        ) : (
          <ul className={styles.list} role="list">
            {articles.map((a) => {
              const title = de && a.titleDe ? a.titleDe : a.title;
              const excerpt = de && a.excerptDe ? a.excerptDe : a.excerpt || '';
              const categoryLabel =
                de && a.categoryLabelDe ? a.categoryLabelDe : a.categoryLabel || '';
              const dateFormatted = formatDate(a.date, locale);

              return (
                <li key={a.slug}>
                  <Link href={`/news/${a.slug}`} className={styles.feat}>
                    {a.imageUrl && (
                      <div
                        className={styles.featImg}
                        style={{ backgroundImage: `url(${a.imageUrl})` }}
                        role="img"
                        aria-label={a.alt || title}
                      />
                    )}
                    <div className={styles.featMeta}>
                      {categoryLabel && <span className={styles.featTag}>{categoryLabel}</span>}
                      <span className={styles.featRule} aria-hidden="true" />
                      {dateFormatted && (
                        <time className={styles.featByline} dateTime={a.date}>
                          {dateFormatted}
                        </time>
                      )}
                    </div>
                    <h2 className={styles.featH}>{title}</h2>
                    {excerpt && <p className={styles.featLede}>{excerpt}</p>}
                    <span className={styles.featCta}>{readMore}</span>
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
