import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import SiteFooter from './SiteFooter';
import MagazineCover from './MagazineCover';
import type { NewsArticle } from '@/lib/types';
import styles from './NewsSection.module.css';

/** How many older issues lie under the current one in the head. */
const PILE = 2;

interface NewsSectionProps {
  /** All articles, newest first — the order the issue numbers count down in. */
  articles: NewsArticle[];
  locale: 'de' | 'en';
}

/**
 * Der Magazin-Index als Heft-Archiv (02.10.2026), dasselbe Objekt wie „Auf dem
 * Teller" auf der Startseite: jeder Artikel ist die Titelseite einer Ausgabe
 * (MagazineCover), gezählt ab dem ältesten (Issue 1).
 *
 * Oben die aktuelle Ausgabe gross und leicht in den Raum gedreht, die zwei
 * davor liegen schräg darunter wie ein Stapel auf dem Tisch; daneben der
 * Vorspann der Ausgabe und „Lesen". Darunter alle früheren Ausgaben als
 * Auslage, jede leicht anders gedreht.
 *
 * Bewegung nur, wo der Leser sie anstösst: unter der Maus hebt sich ein Heft
 * und der Stapel oben fächert auf. Kein Scroll-Effekt, kein Werfen — anders als
 * auf der Startseite ist das hier eine Seite zum Stöbern.
 */
export default function NewsSection({ articles, locale }: NewsSectionProps) {
  const de = locale === 'de';

  const labels = {
    kicker: de ? 'Magazin' : 'Magazine',
    title: de ? 'Auf dem Teller' : 'Food News',
    sub: de
      ? 'Restaurantgeschichten, Empfehlungen und Beobachtungen aus Berlin. Orte, Gerichte und Szenen, die uns auffallen - manchmal neu, manchmal vertraut, meistens ziemlich gut.'
      : 'Restaurant stories, recommendations and observations from Berlin. Places, dishes and scenes that catch our eye - sometimes new, sometimes familiar, usually pretty good.',
    current: de ? 'Aktuelle Ausgabe' : 'Current issue',
    read: de ? 'Lesen' : 'Read',
    archive: de ? 'Frühere Ausgaben' : 'Back issues',
    empty: de
      ? 'Aktuell keine Artikel — schau bald wieder vorbei.'
      : 'No articles right now — check back soon.',
  };

  const titleOf = (a: NewsArticle) => (de && a.titleDe ? a.titleDe : a.title);
  const kickerOf = (a: NewsArticle) =>
    (de && a.categoryLabelDe ? a.categoryLabelDe : a.categoryLabel) || '';
  const excerptOf = (a: NewsArticle) => (de && a.excerptDe ? a.excerptDe : a.excerpt) || '';
  // Newest first, so the first is the highest issue and they count down —
  // the same count as the covers on the home page (getHomeData).
  const issueOf = (i: number) => articles.length - i;

  if (!articles.length) {
    return (
      <div className={`app-page active ${styles.page}`} data-page="news">
        <main id="news" className={styles.shell}>
          <header className={styles.intro}>
            <span className={styles.kicker}>{labels.kicker}</span>
            <h1 className={styles.heroTitle}>{labels.title}</h1>
          </header>
          <p className={styles.empty}>{labels.empty}</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const [current, ...older] = articles;
  const pile = older.slice(0, PILE);
  const currentTitle = titleOf(current);
  const currentExcerpt = excerptOf(current);

  return (
    <div className={`app-page active ${styles.page}`} data-page="news">
      <main id="news" className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.intro}>
            <span className={styles.kicker}>{labels.kicker}</span>
            <h1 className={styles.heroTitle}>{labels.title}</h1>
            <p className={styles.heroSub}>{labels.sub}</p>
          </div>

          {/* Die aktuelle Ausgabe: das Heft ist der Link, die älteren liegen
              nur als Stapel darunter (ohne eigenes Ziel — sie stehen unten
              in der Auslage). */}
          <div className={styles.issue}>
            <div className={styles.pile}>
              {pile.map((a, i) => (
                <span
                  key={a.slug}
                  className={styles.pileCover}
                  style={{ '--d': i + 1 } as CSSProperties}
                  aria-hidden="true"
                >
                  <MagazineCover
                    title={titleOf(a)}
                    image={a.imageUrl}
                    kicker={kickerOf(a)}
                    issue={issueOf(i + 1)}
                    date={a.date}
                    locale={locale}
                    look={i + 1}
                    sizes="(max-width: 767.98px) 74vw, 440px"
                    widths={[480, 800]}
                    decorative
                  />
                </span>
              ))}
              <Link href={`/news/${current.slug}`} className={styles.front}>
                <MagazineCover
                  title={currentTitle}
                  image={current.imageUrl}
                  kicker={kickerOf(current)}
                  issue={issueOf(0)}
                  date={current.date}
                  locale={locale}
                  look={0}
                  sizes="(max-width: 767.98px) 74vw, 440px"
                  widths={[480, 800, 1200]}
                  priority
                />
              </Link>
            </div>

            <div className={styles.issueText}>
              <span className={styles.issueLabel}>
                {labels.current}
                <span className={styles.issueNo}>
                  {' · '}Issue {issueOf(0)}
                </span>
              </span>
              {currentExcerpt && <p className={styles.issueExcerpt}>{currentExcerpt}</p>}
              <Link
                href={`/news/${current.slug}`}
                className={styles.read}
                aria-label={`${labels.read}: ${currentTitle}`}
              >
                {labels.read}
              </Link>
            </div>
          </div>
        </header>

        {older.length > 0 && (
          <section className={styles.archive} aria-labelledby="news-archive">
            <div className={styles.sectionHead}>
              <span className={styles.sectionMark} aria-hidden="true" />
              <h2 id="news-archive">{labels.archive}</h2>
            </div>
            <ul className={styles.shelf} role="list">
              {older.map((a, i) => (
                <li key={a.slug} className={styles.slot} style={{ '--n': i } as CSSProperties}>
                  <Link href={`/news/${a.slug}`} className={styles.mag}>
                    <MagazineCover
                      title={titleOf(a)}
                      image={a.imageUrl}
                      kicker={kickerOf(a)}
                      issue={issueOf(i + 1)}
                      date={a.date}
                      locale={locale}
                      look={i + 1}
                      sizes="(max-width: 767.98px) 46vw, (max-width: 1099.98px) 30vw, 260px"
                      widths={[320, 480, 800]}
                      compact
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
