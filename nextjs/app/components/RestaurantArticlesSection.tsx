import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { RestaurantArticleCard } from '@/lib/types';
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
 */
export default function RestaurantArticlesSection({ articles, locale }: Props) {
  if (articles.length === 0) return null;
  const de = locale === 'de';

  const heading = de ? 'Im Magazin' : 'In the magazine';
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

  return (
    <section className={styles.row} aria-label={heading}>
      <h2 className={styles.head}>
        <Link href="/news" className={styles.headLink}>
          {heading}
        </Link>
      </h2>
      <div className={styles.cards} data-count={articles.length}>
        {articles.map((a) => {
          const title = (de && a.titleDe ? a.titleDe : a.title) || '';
          const kicker = (de ? a.categoryLabelDe : a.categoryLabel) || a.categoryLabel || '';
          const date = formatDate(a.date);
          return (
            <Link key={a._id} href={`/news/${a.slug}`} className={styles.card}>
              {a.imageUrl && (
                <div className={styles.photo}>
                  <Image
                    src={a.imageUrl}
                    alt={a.alt || ''}
                    fill
                    sizes="(max-width: 700px) 92vw, 300px"
                  />
                </div>
              )}
              <span className={styles.overlay}>
                {kicker && <span className={styles.kicker}>{kicker}</span>}
                <span className={styles.title}>{title}</span>
                {date && (
                  <time className={styles.date} dateTime={a.date}>
                    {date}
                  </time>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
