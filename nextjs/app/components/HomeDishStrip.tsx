import Image from 'next/image';
import MapIntentLink from './MapIntentLink';
import styles from './HomeDishStrip.module.css';

// Freigestellte Gerichte (cutout dishes on transparent bg) — the brand's
// signature discovery element. Each dish opens that restaurant on the map.
const dishes = [
  {
    dish: 'Burger',
    restaurant: 'All In',
    src: '/pics/home-dishes/allin-single-burger.webp',
    href: '/map?r=all-in',
  },
  {
    dish: 'Pizza',
    restaurant: 'Gazzo',
    src: '/pics/home-dishes/gazzo-aubergine.webp',
    href: '/map?r=gazzo',
  },
  {
    dish: 'Sardinen',
    restaurant: 'Sardinen Bar',
    src: '/pics/home-dishes/sardinen-print.webp',
    href: '/map?r=sardinen-bar',
  },
  {
    dish: 'Rinderschaufel',
    restaurant: 'Schüsseldienst',
    src: '/pics/home-dishes/rinderschaufel-print.webp',
    href: '/map?r=schuesseldienst',
  },
  {
    dish: 'Döner',
    restaurant: 'Uludag',
    src: '/pics/home-dishes/uludag-doener-print.webp',
    href: '/map?r=bursa-uludag-kebapcisi',
  },
  {
    dish: 'Galette',
    restaurant: 'Bubar',
    src: '/pics/home-dishes/bubar-galette-print.webp',
    href: '/map?r=bubar-crepes-und-galettes',
  },
  {
    dish: 'Grilled Cheese',
    restaurant: 'AERA',
    src: '/pics/home-dishes/grilled-cheese-print.webp',
    href: '/map?r=aera',
  },
  {
    dish: 'Pizza',
    restaurant: 'The Grain',
    src: '/pics/home-dishes/the-grain-pizza-print.webp',
    href: '/map?r=the-grain',
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
      </div>
      <div className={styles.grid}>
        {dishes.map((d) => (
          <article key={d.src} className={styles.item}>
            <MapIntentLink
              href={d.href}
              rel="nofollow"
              className={styles.dishLink}
              aria-label={`${d.dish} ${locale === 'en' ? `at ${d.restaurant} on the map` : `bei ${d.restaurant} auf der Map`}`}
            >
              <span className={styles.dishImg}>
                <Image src={d.src} alt="" fill sizes="180px" />
              </span>
            </MapIntentLink>
            <span className="hv-cap">{d.dish}</span>
            <MapIntentLink href={d.href} rel="nofollow" className={styles.rest}>
              {d.restaurant}
            </MapIntentLink>
          </article>
        ))}
      </div>
    </section>
  );
}
