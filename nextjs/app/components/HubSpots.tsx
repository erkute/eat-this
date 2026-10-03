import { Link } from '@/i18n/navigation';
import type { RestaurantCard } from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { normalizeName } from '@/lib/normalizeName';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import styles from './HubPage.module.css';

/**
 * Das Regal der Restaurant-Seite („Mehr in …"): vier Karten ohne Text, auf
 * dem Telefon ein wischbares Rail, ab Tablet ein Raster. Die Metazeile (Küche
 * gelb, dann Preis) beschriftet einen Spot wie überall.
 *
 * Bis 03.10.2026 lagen hier auch die Bestenliste als Karten und das
 * Verzeichnis als Zeilen der Bezirks- und Kategorieseiten; die stehen seitdem
 * im Heftlook (HubIssue).
 */

type Spot = Pick<RestaurantCard, '_id' | 'name' | 'slug' | 'cuisineType' | 'priceRange' | 'photo'>;

type Locale = 'de' | 'en';

function Meta({ r, locale }: { r: Spot; locale: Locale }) {
  const price = formatPriceLabel(r, locale);
  if (!r.cuisineType && !price) return null;
  return (
    <p className={styles.meta}>
      {r.cuisineType && (
        <span className={styles.metaCuisine}>{localizedCuisine(r.cuisineType, locale)}</span>
      )}
      {price && <span>{price}</span>}
    </p>
  );
}

/** Ohne publizierbares Foto steht eine ruhige Fläche mit der Initiale da —
 *  sonst risse ein fehlendes Bild eine Lücke ins Raster. */
function Photo({
  r,
  sizes,
  widths,
  className,
}: {
  r: Spot;
  sizes: string;
  widths: number[];
  className: string;
}) {
  return (
    <div className={className}>
      {r.photo ? (
        /* Sanity liefert schon WebP/AVIF; ein kurzes srcset erspart Next die
           Serialisierung seiner großen Kandidatenliste für jede Karte. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={r.photo}
          alt=""
          srcSet={sanitySrcSet(r.photo, widths)}
          sizes={sizes}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className={styles.initial} aria-hidden="true">
          {normalizeName(r.name).charAt(0)}
        </span>
      )}
    </div>
  );
}

export function HubSpotShelf({
  restaurants,
  locale,
  label,
}: {
  restaurants: Spot[];
  locale: Locale;
  /** aria-label des Rails, z. B. „Spots in Mitte". */
  label: string;
}) {
  if (restaurants.length === 0) return null;
  return (
    <ul className={styles.shelf} aria-label={label}>
      {restaurants.map((r) => (
        <li key={r._id} className={styles.shelfItem}>
          <Link href={`/restaurant/${r.slug}`} className={styles.shelfCard}>
            <Photo
              r={r}
              className={styles.shelfPhoto}
              widths={[320, 480, 640]}
              sizes="(max-width: 699px) 62vw, 300px"
            />
            <h3 className={styles.shelfName}>{normalizeName(r.name)}</h3>
            <Meta r={r} locale={locale} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
