'use client';
import { Link } from '@/i18n/navigation';
import type { RestaurantArticleCard } from '@/lib/types';
import { articleCardText } from '@/lib/articleCard';
import detail from './MapDetails.module.css';
import styles from './RestaurantDetailArticles.module.css';

interface Props {
  articles: RestaurantArticleCard[];
  locale: 'de' | 'en';
}

/**
 * „Im Magazin" im Map-Sheet: die Artikel, in denen dieser Spot vorkommt —
 * dieselbe Auswahl wie auf der Restaurant-Seite (articlesAboutRestaurant).
 *
 * Kopf, Abstand und Unterzeile sind die des Must-Eats-Blocks darüber, damit
 * beide Abschnitte als Geschwister lesen. Der erste Artikel steht als
 * Bildkarte wie auf der Restaurant-Seite; alle weiteren als Zeile mit
 * Vorschaubild — drei Bildkarten untereinander wären in der schmalen Spalte
 * rund 700px Scrollweg für einen Nebenabschnitt.
 */
export default function RestaurantDetailArticles({ articles, locale }: Props) {
  if (articles.length === 0) return null;
  const de = locale === 'de';
  const heading = de ? 'Im Magazin' : 'In the magazine';
  const [lead, ...rest] = articles;
  const leadText = articleCardText(lead, locale);

  return (
    <section className={detail.rdMustSection} aria-label={heading}>
      <div className={detail.rdMustHead}>
        <h2 className={detail.rdSecH}>{heading}</h2>
        <p className={detail.rdMustSub}>
          {de ? 'Hier haben wir über den Laden geschrieben.' : 'We wrote about this place.'}
        </p>
      </div>
      <ul className={styles.list}>
        <li>
          <Link href={`/news/${lead.slug}`} className={styles.lead}>
            {lead.imageUrl && (
              <span className={styles.leadPhoto}>
                <img src={lead.imageUrl} alt={lead.alt || ''} loading="lazy" />
              </span>
            )}
            <span className={styles.leadCopy}>
              {leadText.kicker && <span className={styles.kicker}>{leadText.kicker}</span>}
              <span className={styles.leadTitle}>{leadText.title}</span>
              {leadText.date && (
                <time className={styles.date} dateTime={lead.date}>
                  {leadText.date}
                </time>
              )}
            </span>
          </Link>
        </li>
        {rest.map((a) => {
          const { title, kicker, date } = articleCardText(a, locale);
          return (
            <li key={a._id}>
              <Link href={`/news/${a.slug}`} className={styles.row}>
                <span className={styles.thumb}>
                  {a.imageUrl && <img src={a.imageUrl} alt={a.alt || ''} loading="lazy" />}
                </span>
                <span className={styles.rowCopy}>
                  {kicker && <span className={styles.kicker}>{kicker}</span>}
                  <span className={styles.rowTitle}>{title}</span>
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
  );
}
