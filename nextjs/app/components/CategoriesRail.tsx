import Image from 'next/image';
import { categoryArt } from '@/lib/categoryArt';
import MapIntentLink from './MapIntentLink';
import styles from './CategoriesRail.module.css';

interface Props {
  categoryNames: Record<string, string>;
  locale: 'de' | 'en';
}

export default function CategoriesRail({ categoryNames, locale }: Props) {
  const entries = Object.entries(categoryNames);
  if (!entries.length) return null;
  return (
    <section
      className="homeV2 hv-section hv-wrap"
      aria-label={locale === 'en' ? 'Categories' : 'Kategorien'}
    >
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'What are you craving?' : 'Worauf hast du Lust?'}
        </h2>
        <span className="hv-link">{locale === 'en' ? 'Categories' : 'Kategorien'} →</span>
      </div>
      <div className="hv-rail">
        {entries.map(([slug, name]) => {
          const art = categoryArt(slug);
          return (
            <MapIntentLink
              key={slug}
              href={`/map?cat=${slug}`}
              rel="nofollow"
              className={styles.card}
            >
              <span className={`hv-photo ${styles.photo}`}>
                {art && <Image src={art} alt="" fill sizes="120px" />}
              </span>
              <span className="hv-cap">{name}</span>
            </MapIntentLink>
          );
        })}
      </div>
    </section>
  );
}
