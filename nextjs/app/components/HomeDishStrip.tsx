import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import styles from './HomeDishStrip.module.css';

// Freigestellte Gerichte (cutout dishes on transparent bg) — the brand's
// signature discovery element. Each dish links to that restaurant's public page.
const dishes = [
  {
    dish: 'Burger',
    restaurant: 'All In',
    src: '/pics/home-dishes/allin-single-burger.webp',
    href: '/restaurant/all-in',
  },
  {
    dish: 'Pizza',
    restaurant: 'Gazzo',
    src: '/pics/home-dishes/gazzo-aubergine.webp',
    href: '/restaurant/gazzo',
  },
  {
    dish: 'Sardinen',
    restaurant: 'Sardinen Bar',
    src: '/pics/home-dishes/sardinen-print.webp',
    href: '/restaurant/sardinen-bar',
  },
  {
    dish: 'Rinderschaufel',
    restaurant: 'Schüsseldienst',
    src: '/pics/home-dishes/rinderschaufel-print.webp',
    href: '/restaurant/schuesseldienst',
  },
  {
    dish: 'Döner',
    restaurant: 'Uludag',
    src: '/pics/home-dishes/uludag-doener-print.webp',
    href: '/restaurant/bursa-uludag-kebapcisi',
  },
  {
    dish: 'Galette',
    restaurant: 'Bubar',
    src: '/pics/home-dishes/bubar-galette-print.webp',
    href: '/restaurant/bubar-crepes-und-galettes',
  },
  {
    dish: 'Grilled Cheese',
    restaurant: 'AERA',
    src: '/pics/home-dishes/grilled-cheese-print.webp',
    href: '/restaurant/aera',
  },
  {
    dish: 'Pizza',
    restaurant: 'The Grain',
    src: '/pics/home-dishes/the-grain-pizza-print.webp',
    href: '/restaurant/the-grain',
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
            <Link
              href={d.href}
              className={styles.dishLink}
              aria-label={`${d.dish} ${locale === 'en' ? `at ${d.restaurant} — restaurant page` : `bei ${d.restaurant} — Restaurantseite`}`}
            >
              <span className={styles.dishImg}>
                <Image
                  src={d.src}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 150px, (max-width: 1360px) 18vw, 220px"
                />
              </span>
            </Link>
            <span className={styles.dishName}>{d.dish}</span>
            <Link href={d.href} className={styles.rest}>
              {d.restaurant}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
