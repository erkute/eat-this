import Image from 'next/image';
import MapIntentLink from './MapIntentLink';
import styles from './HomeDishStrip.module.css';

// Freigestellte Gerichte (cutout dishes on transparent bg) — the brand's
// signature discovery element. Each dish links to the map by category; the
// restaurant name links to that spot on the map.
const dishes = [
  {
    dish: 'Burger',
    restaurant: 'All In',
    src: '/pics/home-dishes/allin-single-burger.webp',
    href: '/map?cat=fast-food',
    restaurantHref: '/map?r=all-in',
  },
  {
    dish: 'Pizza',
    restaurant: 'Gazzo',
    src: '/pics/home-dishes/gazzo-aubergine.webp',
    href: '/map?cat=pizza',
    restaurantHref: '/map?r=gazzo',
  },
  {
    dish: 'Sardinen',
    restaurant: 'Fischladen',
    src: '/pics/home-dishes/sardinen-print.webp',
    href: '/map?cat=lunch',
    restaurantHref: '/map?r=sardinen-bar',
  },
  {
    dish: 'Rinderschaufel',
    restaurant: 'Schüsseldienst',
    src: '/pics/home-dishes/rinderschaufel-print.webp',
    href: '/map?cat=dinner',
    restaurantHref: '/map?r=schuesseldienst',
  },
  {
    dish: 'Döner',
    restaurant: 'Uludag',
    src: '/pics/home-dishes/uludag-doener-print.webp',
    href: '/map?cat=fast-food',
    restaurantHref: '/map?r=bursa-uludag-kebapcisi',
  },
  {
    dish: 'Galette',
    restaurant: 'Bubar',
    src: '/pics/home-dishes/bubar-galette-print.webp',
    href: '/map?cat=lunch',
    restaurantHref: '/map?r=bubar-crepes-und-galettes',
  },
  {
    dish: 'Grilled Cheese',
    restaurant: 'AERA',
    src: '/pics/home-dishes/grilled-cheese-print.webp',
    href: '/map?cat=lunch',
    restaurantHref: '/map?r=aera',
  },
  {
    dish: 'Pizza',
    restaurant: 'The Grain',
    src: '/pics/home-dishes/the-grain-pizza-print.webp',
    href: '/map?cat=dinner',
    restaurantHref: '/map?r=the-grain',
  },
];

export default function HomeDishStrip({ locale }: { locale: 'de' | 'en' }) {
  return (
    <section
      className="homeV2 hv-section hv-wrap"
      aria-label={locale === 'en' ? 'What to eat' : 'Das willst du essen'}
    >
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'en' ? 'This is what to eat' : 'Das willst du essen'}
        </h2>
        <span className="hv-link">{locale === 'en' ? 'On the map' : 'Auf der Map'} →</span>
      </div>
      <div className="hv-rail">
        {dishes.map((d) => (
          <article key={d.src} className={styles.item}>
            <MapIntentLink
              href={d.href}
              rel="nofollow"
              className={styles.dishLink}
              aria-label={`${d.dish} ${locale === 'en' ? 'on the map' : 'auf der Map'}`}
            >
              <span className={styles.dishImg}>
                <Image src={d.src} alt="" fill sizes="180px" />
              </span>
            </MapIntentLink>
            <span className="hv-cap">{d.dish}</span>
            <MapIntentLink href={d.restaurantHref} rel="nofollow" className={styles.rest}>
              {d.restaurant}
            </MapIntentLink>
          </article>
        ))}
      </div>
    </section>
  );
}
