import { Link } from '@/i18n/navigation';
import SiteFooter from './SiteFooter';
import SeoSignupCTA from './SeoSignupCTA';
import type { NewsArticle } from '@/lib/types';
import styles from './NewsSection.module.css';

interface NewsSectionProps {
  articles: NewsArticle[];
  locale: 'de' | 'en';
}

interface ComingItem {
  title: string;
  sub: string;
  month: string;
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

  // Curated coming-soon teasers (editorial, no CMS field yet — mockup screen 7).
  const comingLabel = de ? 'Bald auf dem Teller' : 'Coming up next';
  const coming: ComingItem[] = de
    ? [
        { title: 'Pizza in Berlin', sub: 'Holzofen. Pinsa. NY-Slice.', month: 'Juni' },
        { title: 'Frühstück in Berlin', sub: 'Shakshuka. Sauerteig. Flat White.', month: 'Juli' },
        { title: 'Fine Dining in Berlin', sub: 'Tasting-Menüs. Sternen-Küche. Chef’s Table.', month: 'August' },
      ]
    : [
        { title: 'Pizza in Berlin', sub: 'Wood-fired. Pinsa. NY slice.', month: 'June' },
        { title: 'Breakfast in Berlin', sub: 'Shakshuka. Sourdough. Flat white.', month: 'July' },
        { title: 'Fine Dining in Berlin', sub: 'Tasting menus. Starred kitchens. Chef’s table.', month: 'August' },
      ];

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
                    <span className={styles.featCta}>{readMore}</span>
                  </Link>

                  {excerpt && (
                    <blockquote className={styles.pullquote}>
                      <p className={styles.pqText}>{excerpt}</p>
                      <span className={styles.pqAttr}>
                        — {de ? 'aus' : 'from'} {de ? '„' : '“'}{title}{de ? '“' : '”'}
                      </span>
                    </blockquote>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className={styles.comingLabel}>{comingLabel}</div>
        <div className={styles.coming}>
          {coming.map((c) => (
            <div key={c.title} className={styles.comingRow}>
              <h4 className={styles.comingH}>
                {c.title}
                <em>{c.sub}</em>
              </h4>
              <span className={styles.comingStamp}>{c.month}</span>
            </div>
          ))}
        </div>
      </section>
      <SeoSignupCTA />
      <SiteFooter />
    </div>
  );
}
