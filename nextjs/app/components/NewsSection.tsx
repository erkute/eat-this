import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import SiteFooter from './SiteFooter';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import type { NewsArticle } from '@/lib/types';
import styles from './NewsSection.module.css';

/* Das Raster ist zweispaltig; unter 700px läuft die erste Story als Aufmacher
   über beide Spalten. Ohne den eigenen Hinweis zöge der Browser dort die
   46vw-Variante und skalierte sie auf die doppelte Breite hoch — genau die
   Unschärfe, die der Aufmacher vermeiden soll. */
const GRID_SIZES = '(max-width: 960px) 46vw, 380px';
const LEAD_SIZES = `(max-width: 700px) 92vw, ${GRID_SIZES}`;

interface NewsSectionProps {
  articles: NewsArticle[];
  locale: 'de' | 'en';
}

// The magazine index. One card language across the site: the tile here is the
// same photo-first card the home rail and the article footer use — photo 4/5,
// title inside the photo, yellow kicker. The old row list ran a different
// design (16/10 photo, all-caps headline, excerpt, red text link) and made the
// phone page 4343px long for seven stories — 1800px as tiles.
export default function NewsSection({ articles, locale }: NewsSectionProps) {
  const de = locale === 'de';

  const coverTitle = de ? 'Auf dem Teller' : 'Food News';
  const coverSub = de
    ? 'Restaurantgeschichten, Empfehlungen und Beobachtungen aus Berlin. Orte, Gerichte und Szenen, die uns auffallen - manchmal neu, manchmal vertraut, meistens ziemlich gut.'
    : 'Restaurant stories, recommendations and observations from Berlin. Places, dishes and scenes that catch our eye - sometimes new, sometimes familiar, usually pretty good.';
  const latestTitle = de ? 'Alle Stories' : 'All stories';
  const emptyMsg = de
    ? 'Aktuell keine Artikel — schau bald wieder vorbei.'
    : 'No articles right now — check back soon.';

  const articleTitle = (a: NewsArticle) => (de && a.titleDe ? a.titleDe : a.title);
  const articleKicker = (a: NewsArticle) =>
    (de && a.categoryLabelDe ? a.categoryLabelDe : a.categoryLabel) || '';
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

        {articles.length > 0 ? (
          <section>
            <div className={styles.sectionHead}>
              <span className={styles.sectionMark} aria-hidden="true" />
              <h2>{latestTitle}</h2>
            </div>
            <ul className={styles.grid} role="list">
              {articles.map((a, i) => {
                const isLead = i === 0;
                const title = articleTitle(a);
                const kicker = articleKicker(a);
                const date = formatDate(a.date);
                return (
                  <li key={a.slug}>
                    <Link href={`/news/${a.slug}`} className={styles.card}>
                      <span className={styles.photo}>
                        {a.imageUrl ? (
                          <Image
                            src={(isLead && a.imageUrlLead) || a.imageUrl}
                            alt={a.alt || title}
                            fill
                            // Only the first tile is above the fold.
                            priority={isLead}
                            sizes={isLead ? LEAD_SIZES : GRID_SIZES}
                            className={styles.imageFill}
                          />
                        ) : (
                          <span className={styles.photoFallback} aria-hidden="true" />
                        )}
                      </span>
                      <span className={styles.text}>
                        {kicker && <span className={styles.kicker}>{kicker}</span>}
                        <span className={styles.title}>{title}</span>
                        {date && (
                          <time className={styles.date} dateTime={a.date}>
                            {date}
                          </time>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <p className={styles.empty}>{emptyMsg}</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
