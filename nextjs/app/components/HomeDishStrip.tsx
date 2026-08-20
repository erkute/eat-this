import Image from 'next/image';
import MapIntentLink from './MapIntentLink';
import styles from './HomeDishStrip.module.css';

// Freigestellte Gerichte (cutout dishes on transparent bg) — the brand's
// signature discovery element. Each dish opens that spot on the map: every
// clickable thing on the home page leads back to the product.
const dishes = [
  {
    dish: 'Burger',
    restaurant: 'All In',
    src: '/pics/home-dishes/allin-single-burger.webp',
    slug: 'all-in',
  },
  {
    dish: 'Pizza',
    restaurant: 'Gazzo',
    src: '/pics/home-dishes/gazzo-aubergine.webp',
    slug: 'gazzo',
  },
  {
    dish: 'Sardinen',
    restaurant: 'Sardinen Bar',
    src: '/pics/home-dishes/sardinen-print.webp',
    slug: 'sardinen-bar',
  },
  {
    dish: 'Rinderschaufel',
    restaurant: 'Schüsseldienst',
    src: '/pics/home-dishes/rinderschaufel-print.webp',
    slug: 'schuesseldienst',
  },
  {
    dish: 'Döner',
    restaurant: 'Uludag',
    src: '/pics/home-dishes/uludag-doener-print.webp',
    slug: 'bursa-uludag-kebapcisi',
  },
  {
    dish: 'Galette',
    restaurant: 'Bubar',
    src: '/pics/home-dishes/bubar-galette-print.webp',
    slug: 'bubar-crepes-und-galettes',
  },
  {
    dish: 'Grilled Cheese',
    restaurant: 'AERA',
    src: '/pics/home-dishes/grilled-cheese-print.webp',
    slug: 'aera',
  },
  {
    dish: 'Pizza',
    restaurant: 'The Grain',
    src: '/pics/home-dishes/the-grain-pizza-print.webp',
    slug: 'the-grain',
  },
];

/**
 * Renders inside the Must Eats section (see HubMustEatsTeaser) rather than as
 * its own band — a plain <div>, no heading, so the two food-photo rows read as
 * one idea instead of two competing ones.
 */
export default function HomeDishStrip({ locale }: { locale: 'de' | 'en' }) {
  return (
    <div
      className={styles.embedded}
      role="group"
      aria-label={locale === 'en' ? 'Dishes worth ordering' : 'Gerichte, die sich lohnen'}
    >
      <p className={styles.stripLead}>
        {locale === 'en' ? 'Dishes worth the trip' : 'Gerichte, für die sich der Weg lohnt'}
      </p>
      <div className={styles.grid}>
        {dishes.map((d) => (
          <article key={d.src} className={styles.item}>
            <MapIntentLink
              href={`/map?r=${d.slug}`}
              rel="nofollow"
              className={styles.dishLink}
              aria-label={`${d.dish} ${locale === 'en' ? `at ${d.restaurant} — show on the map` : `bei ${d.restaurant} — auf der Map anzeigen`}`}
            >
              <span className={styles.dishImg}>
                <Image
                  src={d.src}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 150px, (max-width: 1360px) 18vw, 220px"
                />
              </span>
            </MapIntentLink>
            <span className={styles.dishName}>{d.dish}</span>
            <MapIntentLink href={`/map?r=${d.slug}`} rel="nofollow" className={styles.rest}>
              {d.restaurant}
            </MapIntentLink>
          </article>
        ))}
      </div>
    </div>
  );
}
