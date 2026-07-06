import { Link } from '@/i18n/navigation';
import SiteFooter from './SiteFooter';
import type { NewsArticle } from '@/lib/types';
import { NEWS_GUIDES } from '@/lib/news-guides';
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
    ? 'Neue Stories, klare Empfehlungen und Listen, wenn du sofort wissen willst, wo du hingehen sollst.'
    : 'Fresh stories, clear recommendations and lists for when you need to know where to go next.';
  const latestTitle = de ? 'Neueste Stories' : 'Latest stories';
  const guideTitle = de ? 'Direkt zu den Empfehlungen' : 'Jump into guides';
  const readMore = de ? 'Story lesen' : 'Read story';
  const rowCta = de ? 'Lesen' : 'Read';
  const guideCta = de ? 'Guide öffnen' : 'Open guide';
  const mapCta = de ? 'Auf der Map suchen' : 'Search the map';
  const emptyMsg = de
    ? 'Aktuell keine Artikel — schau bald wieder vorbei.'
    : 'No articles right now — check back soon.';

  const articleTitle = (a: NewsArticle) => (de && a.titleDe ? a.titleDe : a.title);
  const articleExcerpt = (a: NewsArticle) => (de && a.excerptDe ? a.excerptDe : a.excerpt || '');
  const articleCategory = (a: NewsArticle) =>
    de && a.categoryLabelDe ? a.categoryLabelDe : a.categoryLabel || '';

  return (
    <div className={`app-page active ${styles.page}`} data-page="news">
      <main id="news" className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>{coverTitle}</h1>
            <p className={styles.heroSub}>{coverSub}</p>
          </div>
        </header>

        {lead ? (
          <section className={styles.leadSection} aria-label={de ? 'Aktuelle Titelstory' : 'Current lead story'}>
            <Link href={`/news/${lead.slug}`} className={styles.leadCard}>
              {lead.imageUrl && (
                <div className={styles.leadImage}>
                  <div
                    className={styles.imageFill}
                    style={{ backgroundImage: `url(${lead.imageUrl})` }}
                    role="img"
                    aria-label={lead.alt || articleTitle(lead)}
                  />
                </div>
              )}
              <div className={styles.leadCopy}>
                <h2>{articleTitle(lead)}</h2>
                {articleCategory(lead) && (
                  <div className={styles.metaLine}>
                    <span>{articleCategory(lead)}</span>
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

        <section className={styles.guideSection}>
          <div className={styles.sectionHead}>
            <h2>{guideTitle}</h2>
            <Link href="/map" className={styles.mapLink}>{mapCta}</Link>
          </div>
          <div className={styles.guideGrid}>
            {NEWS_GUIDES.map((guide, index) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className={`${styles.guideCard} ${styles[`guideCard_${guide.accent}`]}`}
              >
                <span className={styles.guideNo}>{String(index + 1).padStart(2, '0')}</span>
                <div className={styles.guideArt}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={guide.art} alt="" loading="lazy" />
                </div>
                <h3>{guide.title[locale]}</h3>
                <p>{guide.promise[locale]}</p>
                <span className={styles.guideCta}>{guideCta}</span>
              </Link>
            ))}
          </div>
        </section>

        {latest.length > 0 && (
          <section className={styles.latestSection}>
            <div className={styles.sectionHead}>
              <h2>{latestTitle}</h2>
            </div>
            <ul className={styles.latestList} role="list">
              {latest.map((a) => {
                const title = articleTitle(a);
                const excerpt = articleExcerpt(a);

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
