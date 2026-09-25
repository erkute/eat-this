import Image from '@/app/components/SiteImage';
import { Link } from '@/i18n/navigation';
import type { RestaurantArticleCard } from '@/lib/types';
import { articleCardText } from '@/lib/articleCard';
import hubStyles from './HubPage.module.css';
import styles from './RestaurantArticlesSection.module.css';

interface Props {
  articles: RestaurantArticleCard[];
  locale: 'de' | 'en';
}

/**
 * Die Artikel, in denen dieser Spot vorkommt.
 *
 * Steht bewusst VOR der Bezirks-Zeile: ein Text über genau diesen Laden ist
 * spezifischer als vier weitere Spots aus demselben Bezirk. Die Reihenfolge
 * innerhalb des Blocks kommt aus der Query — je weniger Spots ein Artikel
 * nennt, desto weiter oben steht er.
 *
 * Der Link zeigt Google außerdem, welche der beiden Seiten die Entität ist:
 * Restaurant-Seite und Ein-Spot-Artikel konkurrieren sonst um dieselbe
 * Marken-Suche.
 *
 * Kopf und Karten wie das Bezirks-Regal darunter: Titel mit „Alle", Schlagzeile
 * unter dem Bild statt auf ihm (bis 25.09.2026 lag sie unter einem Verlauf auf
 * dem Foto).
 */
export default function RestaurantArticlesSection({ articles, locale }: Props) {
  if (articles.length === 0) return null;
  const de = locale === 'de';

  const heading = de ? 'Im Magazin' : 'In the magazine';

  return (
    <section aria-labelledby="spot-articles">
      <div className={hubStyles.shelfHead}>
        <h2 id="spot-articles" className={hubStyles.shelfTitle}>
          <Link href="/news">{heading}</Link>
        </h2>
        <Link
          href="/news"
          className={hubStyles.shelfAll}
          aria-label={de ? 'Alle Artikel' : 'All articles'}
        >
          {de ? 'Alle' : 'All'}
        </Link>
      </div>
      <div className={styles.cards} data-count={articles.length}>
        {articles.map((a) => {
          const { title, kicker, date } = articleCardText(a, locale);
          return (
            <Link key={a._id} href={`/news/${a.slug}`} className={styles.card}>
              {a.imageUrl && (
                <div className={styles.photo}>
                  <Image
                    src={a.imageUrl}
                    alt={a.alt || ''}
                    fill
                    sizes="(max-width: 699px) 100vw, (max-width: 1099px) 50vw, 400px"
                  />
                </div>
              )}
              {kicker && <span className={styles.kicker}>{kicker}</span>}
              <span className={styles.title}>{title}</span>
              {date && (
                <time className={styles.date} dateTime={a.date}>
                  {date}
                </time>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
