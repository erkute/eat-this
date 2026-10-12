import { Link } from '@/i18n/navigation';
import type { RestaurantCard } from '@/lib/types';
import { normalizeName } from '@/lib/normalizeName';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { localizedCategoryName } from '@/lib/categories';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import { categoryArt } from '@/lib/categoryArt';
import Image from './SiteImage';
import { formatPriceLabel } from './map/restaurantDetail.helpers';
import styles from './RestaurantDiscovery.module.css';

export default function RestaurantDiscovery({
  categories,
  siblings,
  district,
  locale,
}: {
  categories: { slug: string; name: string; nameEn?: string }[];
  siblings: RestaurantCard[];
  district?: { slug: string; name: string };
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  if (!categories.length && !district) return null;
  const next = siblings;
  return (
    <section className={styles.discovery} aria-labelledby="discovery-next">
      <div className={styles.heading}>
        <h2 id="discovery-next">{de ? 'Noch nicht satt?' : 'Still hungry?'}</h2>
        {categories.length > 0 && (
          <nav aria-label={de ? 'Kategorien dieses Spots' : 'Categories of this spot'}>
            <ul className={styles.categories}>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/kategorie/${c.slug}`}>
                    {categoryArt(c.slug) && (
                      <Image src={categoryArt(c.slug)!} alt="" width={160} height={240}
                        sizes="(max-width: 767px) 104px, 144px" className={styles.packArt} />
                    )}
                    {localizedCategoryName(c, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      {district && (
        <>
          <h3 className={styles.district}>
            {de ? `Weiter in ${district.name}` : `More in ${district.name}`}
          </h3>
          {next.length > 0 && (
            <ul className={styles.spots}>
              {next.map((spot) => (
                <li key={spot._id}>
                  <Link className={styles.spot} href={`/restaurant/${spot.slug}`}>
                    {spot.photo && (
                      <span className={styles.photo}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={spot.photo}
                          srcSet={sanitySrcSet(spot.photo, [400, 640, 960])}
                          sizes="(max-width: 767px) 44vw, 270px"
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                    )}
                    <span className={styles.name}>{normalizeName(spot.name)}</span>
                    <span className={styles.meta}>
                      {[
                        spot.cuisineType && localizedCuisine(spot.cuisineType, locale),
                        formatPriceLabel(spot, locale),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
