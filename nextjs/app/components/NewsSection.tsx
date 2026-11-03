import SiteFooter from './SiteFooter';
import MagazineCover, { formatMonth } from './MagazineCover';
import MagazineLink from './MagazineLink';
import type { NewsArticle } from '@/lib/types';
import styles from './NewsSection.module.css';

interface NewsSectionProps {
  /** Newest first; issue numbers count back from the length of this list. */
  articles: NewsArticle[];
  locale: 'de' | 'en';
}

function IssueMeta({ article, issue, locale }: { article: NewsArticle; issue: number; locale: 'de' | 'en' }) {
  const month = formatMonth(article.date, locale);
  return <p className={styles.meta}>
    <span>Issue {issue}</span>
    {month && <><span aria-hidden="true"> · </span><time dateTime={article.date}>{month}</time></>}
  </p>;
}

/** A tangible, open issue fan leads into the two recent stories and the compact archive. */
export default function NewsSection({ articles, locale }: NewsSectionProps) {
  const de = locale === 'de';
  const titleOf = (article: NewsArticle) => (de && article.titleDe ? article.titleDe : article.title);
  const excerptOf = (article: NewsArticle) => (de
    ? article.previewExcerptDe || article.excerptDe || article.previewExcerpt || article.excerpt
    : article.previewExcerpt || article.excerpt) || '';
  const issueOf = (index: number) => articles.length - index;
  const [current] = articles;
  const recent = articles.slice(1, 3);
  const archive = articles.slice(3);
  const read = de ? 'Lesen' : 'Read';

  return (
    <div className={`app-page active ${styles.page}`} data-page="news">
      <main id="news" className={styles.shell} data-insight-content="">
        <header className={styles.hero} data-insight-header="">
          <h1 className={styles.heroTitle}>{de ? 'Auf dem Teller' : 'On the plate'}</h1>
          {current ? (
            <section className={styles.lead} aria-labelledby="news-current">
              <div className={styles.fan}>
                {recent.map((article, index) => <span key={article.slug} className={`${styles.fanSide} ${index === 0 ? styles.fanLeft : styles.fanRight}`} aria-hidden="true">
                  <MagazineCover title={titleOf(article)} image={article.imageUrl} issue={issueOf(index + 1)} date={article.date}
                    locale={locale} cover={article.cover} priority
                    sizes="(orientation: landscape) and (max-height: 500px) and (max-width: 1023.98px) 51svh, (max-width: 599.98px) 42vw, 320px"
                    widths={[320, 480, 800, 1200]} />
                </span>)}
                <MagazineLink href={`/news/${current.slug}`} className={styles.leadCover} data-current-issue="" aria-label={titleOf(current)}>
                  <MagazineCover
                    title={titleOf(current)} image={current.imageUrl} issue={issueOf(0)} date={current.date}
                    locale={locale} cover={current.cover} priority
                    sizes="(orientation: landscape) and (max-height: 500px) and (max-width: 1023.98px) 51svh, (max-width: 599.98px) 46vw, 320px"
                    widths={[320, 480, 800, 1200]}
                  />
                </MagazineLink>
              </div>
              <div className={styles.leadCopy}>
                <p className={styles.leadMeta}><span className="et-label">{de ? 'Aktuelle Ausgabe' : 'Current issue'} · Issue {issueOf(0)}</span></p>
                <h2 id="news-current" className={styles.currentTitle}>{titleOf(current)}</h2>
                {excerptOf(current) && <p className={styles.issueExcerpt}>{excerptOf(current)}</p>}
                <MagazineLink href={`/news/${current.slug}`} className={`et-btn et-btn-lg ${styles.read}`} coverFrom="[data-current-issue]" aria-label={`${read}: ${titleOf(current)}`}>
                  {read}
                </MagazineLink>
              </div>
            </section>
          ) : <p className={styles.empty}>{de ? 'Aktuell keine Artikel — schau bald wieder vorbei.' : 'No articles right now — check back soon.'}</p>}
        </header>

        {recent.length > 0 && <section className={styles.recent} aria-labelledby="news-recent">
          <h2 id="news-recent" className={styles.sectionTitle}>{de ? 'Zuletzt erschienen' : 'Recent issues'}</h2>
          <ul className={styles.featureList} role="list">
            {recent.map((article, index) => <li key={article.slug} className={styles.feature}>
              <MagazineLink href={`/news/${article.slug}`} className={styles.featureLink} aria-label={titleOf(article)}>
                <span className={styles.featureMedia}>
                  <MagazineCover
                    title={titleOf(article)} image={article.imageUrl} issue={issueOf(index + 1)} date={article.date}
                    locale={locale} cover={article.cover}
                    sizes="(orientation: landscape) and (max-height: 500px) and (max-width: 1023.98px) 50svh, (max-width: 599.98px) 80vw, (max-width: 1099.98px) 30vw, 380px"
                    widths={[320, 480, 800, 1200]}
                  />
                </span>
                <IssueMeta article={article} issue={issueOf(index + 1)} locale={locale} />
                <h3 className={styles.featureTitle}>{titleOf(article)}</h3>
                {excerptOf(article) && <p className={styles.featureExcerpt}>{excerptOf(article)}</p>}
              </MagazineLink>
            </li>)}
          </ul>
        </section>}

        {archive.length > 0 && <section className={styles.archive} aria-labelledby="news-archive">
          <div className={styles.archiveHead}>
            <h2 id="news-archive" className={styles.sectionTitle}>{de ? 'Alle weiteren Ausgaben' : 'All other issues'}</h2>
            <p className={styles.archiveIntro}>{de ? 'Geschichten und Guides aus Berlin.' : 'Stories and guides from Berlin.'}</p>
          </div>
          <ul className={styles.archiveList} role="list">
            {archive.map((article, index) => <li key={article.slug} className={styles.archiveItem}>
              <MagazineLink href={`/news/${article.slug}`} className={styles.archiveLink} aria-label={titleOf(article)}>
                <span className={styles.archiveCover}>
                  <MagazineCover
                    title={titleOf(article)} image={article.imageUrl} issue={issueOf(index + 3)} date={article.date}
                    locale={locale} cover={article.cover} sizes="(orientation: landscape) and (max-height: 500px) and (max-width: 1023.98px) 144px, (max-width: 1099.98px) 116px, 152px"
                    widths={[160, 320, 480]}
                  />
                </span>
                <div className={styles.archiveCopy}>
                  <IssueMeta article={article} issue={issueOf(index + 3)} locale={locale} />
                  <h3 className={styles.archiveTitle}>{titleOf(article)}</h3>
                  {excerptOf(article) && <p className={styles.archiveExcerpt}>{excerptOf(article)}</p>}
                </div>
              </MagazineLink>
            </li>)}
          </ul>
        </section>}
      </main>
      <SiteFooter />
    </div>
  );
}
