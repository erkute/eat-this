import { Link } from '@/i18n/navigation';
import SiteFooter from './SiteFooter';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import type { NewsArticle } from '@/lib/types';
import styles from './NewsSection.module.css';

interface NewsSectionProps {
  articles: NewsArticle[];
  locale: 'de' | 'en';
}

export default function NewsSection({ articles, locale }: NewsSectionProps) {
  const de = locale === 'de';
  const [lead, ...latest] = articles;

  const coverTitle = de ? 'Auf dem Teller' : 'Food News';
  const coverSub = de
    ? 'Restaurantgeschichten, Empfehlungen und Beobachtungen aus Berlin. Orte, Gerichte und Szenen, die uns auffallen - manchmal neu, manchmal vertraut, meistens ziemlich gut.'
    : 'Restaurant stories, recommendations and observations from Berlin. Places, dishes and scenes that catch our eye - sometimes new, sometimes familiar, usually pretty good.';
  const latestTitle = de ? 'Alle Stories' : 'All stories';
  const readMore = de ? 'Lesen' : 'Read';
  const rowCta = de ? 'Story lesen' : 'Read story';
  const emptyMsg = de
    ? 'Aktuell keine Artikel — schau bald wieder vorbei.'
    : 'No articles right now — check back soon.';

  const articleTitle = (a: NewsArticle) => (de && a.titleDe ? a.titleDe : a.title);
  const articleExcerpt = (a: NewsArticle) => (de && a.excerptDe ? a.excerptDe : a.excerpt || '');
  const formatDate = (iso: string | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(de ? 'de-DE' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  const leadDate = lead ? formatDate(lead.date) : '';
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/', logo: 'eat-this' },
    { name: coverTitle },
  ];

  return (
    <div className={`app-page active ${styles.page}`} data-page="news">
      <main id="news" className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.breadcrumbWrap}>
            <Breadcrumbs
              items={breadcrumbItems}
              ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
            />
          </div>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>{coverTitle}</h1>
            <p className={styles.heroSub}>{coverSub}</p>
          </div>
        </header>

        {lead ? (
          <section className={styles.leadSection} aria-label={de ? 'Aktuelle Titelstory' : 'Current lead story'}>
            <Link href={`/news/${lead.slug}`} className={styles.leadCard}>
              <div className={styles.leadFrame}>
                {lead.imageUrl ? (
                  <div
                    className={styles.imageFill}
                    style={{ backgroundImage: `url(${lead.imageUrl})` }}
                    role="img"
                    aria-label={lead.alt || articleTitle(lead)}
                  />
                ) : (
                  <div className={styles.leadFallback} aria-hidden="true" />
                )}
                <div className={styles.leadOverlay}>
                  <h2>{articleTitle(lead)}</h2>
                </div>
              </div>
              <div className={styles.leadText}>
                {leadDate && (
                  <div className={styles.metaLine}>
                    <time dateTime={lead.date}>{leadDate}</time>
                  </div>
                )}
                {articleExcerpt(lead) && <p>{articleExcerpt(lead)}</p>}
                <span className={styles.primaryCta}>{readMore}</span>
              </div>
            </Link>
          </section>
        ) : (
          <p className={styles.empty}>{emptyMsg}</p>
        )}

        {latest.length > 0 && (
          <section className={styles.latestSection}>
            <div className={styles.sectionHead}>
              <h2>{latestTitle}</h2>
            </div>
            <ul className={styles.latestList} role="list">
              {latest.map((a) => {
                const title = articleTitle(a);
                const excerpt = articleExcerpt(a);
                const date = formatDate(a.date);

                return (
                  <li key={a.slug}>
                    <Link href={`/news/${a.slug}`} className={styles.storyRow}>
                      <div className={styles.storyImage}>
                        {a.imageUrl ? (
                          <div
                            className={styles.imageFill}
                            style={{ backgroundImage: `url(${a.imageUrl})` }}
                            role="img"
                            aria-label={a.alt || title}
                          />
                        ) : (
                          <div className={styles.storyImageFallback} aria-hidden="true" />
                        )}
                      </div>
                      <div className={styles.storyCopy}>
                        {date && (
                          <div className={styles.storyMeta}>
                            <time dateTime={a.date}>{date}</time>
                          </div>
                        )}
                        <h3>{title}</h3>
                        {excerpt && <p>{excerpt}</p>}
                        <span className={styles.storyCta}>{rowCta}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
