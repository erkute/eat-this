import type { RestaurantArticleCard } from '@/lib/types';
import { articleCardText } from '@/lib/articleCard';
import MagazineCover from './MagazineCover';
import MagazineLink from './MagazineLink';
import styles from './RestaurantArticlesSection.module.css';

interface Props {
  articles: RestaurantArticleCard[];
  locale: 'de' | 'en';
  /** Abschnitt und Zwischentitel setzt die Spot-Seite. */
  classNames: { section: string; heading: string };
}

/**
 * Die Artikel, in denen dieser Spot vorkommt — seit 03.10.2026 als Hefte wie
 * auf /news (MagazineCover), ein Tipp schlägt das Heft auf (MagazineLink).
 * Daneben Rubrik, Datum und Titel.
 *
 * Die Reihenfolge kommt aus der Query — je weniger Spots ein Artikel nennt,
 * desto weiter oben steht er. Der Link zeigt Google ausserdem, welche der
 * beiden Seiten die Entität ist: Restaurant-Seite und Ein-Spot-Artikel
 * konkurrieren sonst um dieselbe Marken-Suche.
 */
export default function RestaurantArticlesSection({ articles, locale, classNames }: Props) {
  if (articles.length === 0) return null;
  const de = locale === 'de';

  return (
    <section className={classNames.section} aria-labelledby="spot-articles">
      <h2 id="spot-articles" className={classNames.heading}>
        {de ? 'Im Magazin' : 'In the magazine'}
      </h2>
      <div className={styles.issues}>
        {articles.map((a) => {
          const { title, kicker, date } = articleCardText(a, locale);
          return (
            <MagazineLink key={a._id} href={`/news/${a.slug}`} className={styles.issue}>
              <span className={styles.cover}>
                <MagazineCover
                  title={title}
                  image={a.imageUrl}
                  issue={a.issue}
                  date={a.date}
                  locale={locale}
                  cover={a.cover}
                  sizes="(max-width: 767px) 130px, 200px"
                  widths={[320, 480]}
                />
              </span>
              <span className={styles.text}>
                {(kicker || date) && (
                  <span className={styles.meta}>{[kicker, date].filter(Boolean).join(' · ')}</span>
                )}
                <span className={styles.title}>{title}</span>
              </span>
            </MagazineLink>
          );
        })}
      </div>
    </section>
  );
}
