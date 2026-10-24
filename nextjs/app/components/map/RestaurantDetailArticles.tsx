'use client';
import MagazineCover from '../MagazineCover';
import MagazineLink from '../MagazineLink';
import type { RestaurantArticleCard } from '@/lib/types';
import { articleCardText } from '@/lib/articleCard';
import detail from './RestaurantDetail.module.css';
import styles from './RestaurantDetailArticles.module.css';

interface Props {
  articles: RestaurantArticleCard[];
  locale: 'de' | 'en';
}

/** The same magazine covers and opening interaction as the restaurant page,
 * sized for the map detail's narrow column. */
export default function RestaurantDetailArticles({ articles, locale }: Props) {
  if (articles.length === 0) return null;
  const de = locale === 'de';
  const heading = de ? 'Im Magazin' : 'In the magazine';

  return (
    <section className={detail.rdMustSection} aria-label={heading}>
      <div className={`${detail.rdMustHead} ${styles.header}`}>
        <h3 className={`et-label ${detail.rdSecH}`}>{heading}</h3>
        <p className={detail.rdMustSub}>
          {de ? 'Hier haben wir über diesen Spot geschrieben.' : 'We wrote about this place.'}
        </p>
      </div>
      <ul className={styles.list}>
        {articles.map((article) => {
          const { title, kicker, date } = articleCardText(article, locale);
          return (
            <li key={article._id}>
              <MagazineLink href={`/news/${article.slug}`} className={styles.issue}>
                <span className={styles.cover}>
                  <MagazineCover
                    title={title}
                    image={article.imageUrl}
                    issue={article.issue}
                    date={article.date}
                    locale={locale}
                    cover={article.cover}
                    sizes="112px"
                    widths={[240, 360, 480]}
                  />
                </span>
                <span className={styles.copy}>
                  {(kicker || date) && (
                    <span className={styles.meta}>{[kicker, date].filter(Boolean).join(' · ')}</span>
                  )}
                  <span className={styles.title}>{title}</span>
                </span>
              </MagazineLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
