import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import type { RestaurantCard } from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { normalizeName } from '@/lib/normalizeName';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { HubFilterCard, HubFilterGroup } from './HubFilter';
import styles from './HubPage.module.css';

/**
 * Die Spots der Hub-Seiten (/bezirk, /kategorie und ihre Detailseiten) in drei
 * Fassungen, eine pro Aufgabe:
 *
 * - `HubSpotCards` — die kuratierte Bestenliste: großes Foto, Platzziffer,
 *   Name, Metazeile, Beschreibung. Wenige Einträge, jeder soll gesehen werden.
 * - `HubSpotRows`  — das Verzeichnis darunter: kleines Quadrat, Name,
 *   Metazeile, zwei Zeilen Text. Bis 25.09.2026 war auch das Verzeichnis ein
 *   Raster großer Fotokarten — Kreuzberg maß damit auf dem Telefon rund
 *   42.000px, und wer einen Namen suchte, scrollte an 150 Fotos vorbei.
 * - `HubSpotShelf` — die Regale der Index-Seiten: vier Karten ohne Text, auf
 *   dem Telefon ein wischbares Rail, ab Tablet ein Raster.
 *
 * Alle drei teilen die Metazeile (Küche gelb, dann Bezirk und Preis), damit ein
 * Spot überall gleich beschriftet ist.
 */

type Spot = Pick<RestaurantCard, '_id' | 'name' | 'slug' | 'cuisineType' | 'priceRange' | 'photo'> &
  Partial<
    Pick<RestaurantCard, 'district' | 'shortDescription' | 'shortDescriptionEn' | 'tip' | 'tipEn'>
  >;

type Locale = 'de' | 'en';

/**
 * Titelgröße nach Textlänge: die H1 der Hub-Seiten steht auf dem Telefon in
 * einer Zeile („eine Zeile Headlines"), auch „Friedrichshain" und „Berlin nach
 * Bezirk". `cqi` misst an der Kopfspalte (`.heroCopy` ist der Container).
 */
export function hubTitleStyle(text: string): CSSProperties {
  return { '--title-fit': `${Math.min(17, 150 / Math.max(text.length, 1))}cqi` } as CSSProperties;
}

interface ListProps<T extends Spot> {
  restaurants: T[];
  locale: Locale;
  /** Facetten-Slugs je Spot für den Chip-Filter; ohne Angabe kein Filter. */
  facetsOf?: (r: T) => string[];
  /** Bezirk in der Metazeile — nur dort, wo er nicht schon die Seite ist. */
  showDistrict?: boolean;
}

function Meta({ r, locale, showDistrict }: { r: Spot; locale: Locale; showDistrict?: boolean }) {
  const price = formatPriceLabel(r, locale);
  const district = showDistrict ? r.district : undefined;
  if (!r.cuisineType && !district && !price) return null;
  return (
    <p className={styles.meta}>
      {r.cuisineType && (
        <span className={styles.metaCuisine}>{localizedCuisine(r.cuisineType, locale)}</span>
      )}
      {district && <span>{district}</span>}
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
  eager = false,
  className,
  children,
}: {
  r: Spot;
  sizes: string;
  widths: number[];
  eager?: boolean;
  className: string;
  children?: React.ReactNode;
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
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
        />
      ) : (
        <span className={styles.initial} aria-hidden="true">
          {normalizeName(r.name).charAt(0)}
        </span>
      )}
      {children}
    </div>
  );
}

function Slot<T extends Spot>({
  r,
  facetsOf,
  children,
}: {
  r: T;
  facetsOf?: (r: T) => string[];
  children: React.ReactNode;
}) {
  if (!facetsOf) return <>{children}</>;
  return <HubFilterCard slugs={facetsOf(r)}>{children}</HubFilterCard>;
}

function description(r: Spot, locale: Locale): string | undefined {
  return (
    pickLocale(r.shortDescription, r.shortDescriptionEn, locale) ||
    pickLocale(r.tip, r.tipEn, locale)
  );
}

/**
 * `ranked` blendet die Platzziffer ein — nur die kuratierte Bestenliste trägt
 * sie. `eagerFirst` nimmt dem ersten Foto das Lazy-Loading: auf einer Seite
 * ohne Bannerbild ist es das Leitbild, und ein Bild, das erst beim Scrollen
 * lädt, taugt weder als LCP noch für Googles Thumbnail-Wahl.
 */
export function HubSpotCards<T extends Spot>({
  restaurants,
  locale,
  facetsOf,
  showDistrict,
  ranked = false,
  eagerFirst = false,
}: ListProps<T> & { ranked?: boolean; eagerFirst?: boolean }) {
  const lead = eagerFirst ? restaurants.findIndex((r) => r.photo) : -1;
  return (
    <div className={styles.cards}>
      {restaurants.map((r, i) => {
        const text = description(r, locale);
        return (
          <Slot key={r._id} r={r} facetsOf={facetsOf}>
            <Link href={`/restaurant/${r.slug}`} className={styles.card}>
              <Photo
                r={r}
                className={styles.cardPhoto}
                widths={[480, 800, 1200]}
                sizes="(max-width: 699px) 100vw, (max-width: 1099px) 50vw, 400px"
                eager={i === lead}
              >
                {ranked && (
                  <span className={styles.rank} aria-hidden="true">
                    {i + 1}
                  </span>
                )}
              </Photo>
              <h3 className={styles.cardName}>
                {/* Vorleser hören den Rang mit, der Badge selbst ist stumm. */}
                {ranked && <span className={styles.srOnly}>{i + 1}. </span>}
                {normalizeName(r.name)}
              </h3>
              <Meta r={r} locale={locale} showDistrict={showDistrict} />
              {text && <p className={styles.cardText}>{text}</p>}
            </Link>
          </Slot>
        );
      })}
    </div>
  );
}

/** Ab so vielen Zeilen bekommt das Verzeichnis Buchstaben-Marken. */
const LETTER_MARKS_FROM = 30;

/** Die Marke eines Namens: Grundbuchstabe ohne Akzent, Ziffern unter „#". */
function letterOf(name: string): string {
  const first = normalizeName(name).normalize('NFD').charAt(0).toUpperCase();
  return /\p{L}/u.test(first) ? first : '#';
}

/** Aufeinanderfolgende Spots mit derselben Marke — die Liste kommt schon
 *  alphabetisch (siehe directoryOrder in lib/curated-ranking.ts). */
function byLetter<T extends Spot>(restaurants: T[]): { letter: string; items: T[] }[] {
  const groups: { letter: string; items: T[] }[] = [];
  for (const r of restaurants) {
    const letter = letterOf(r.name);
    const last = groups[groups.length - 1];
    if (last?.letter === letter) last.items.push(r);
    else groups.push({ letter, items: [r] });
  }
  return groups;
}

function Rows<T extends Spot>({ restaurants, locale, facetsOf, showDistrict }: ListProps<T>) {
  return (
    <div className={styles.rows}>
      {restaurants.map((r) => {
        const text = description(r, locale);
        return (
          <Slot key={r._id} r={r} facetsOf={facetsOf}>
            <Link href={`/restaurant/${r.slug}`} className={styles.row}>
              <Photo r={r} className={styles.rowThumb} widths={[160, 240]} sizes="96px" />
              <div className={styles.rowBody}>
                <h3 className={styles.rowName}>{normalizeName(r.name)}</h3>
                <Meta r={r} locale={locale} showDistrict={showDistrict} />
                {text && <p className={styles.rowText}>{text}</p>}
              </div>
            </Link>
          </Slot>
        );
      })}
    </div>
  );
}

/**
 * Lange Verzeichnisse (Dinner: 266 Spots) tragen Buchstaben-Marken wie ein
 * Register — beim Scrollen weiß man, wo im Alphabet man steht. Jede Gruppe
 * blendet sich mit dem Filter aus, wenn keiner ihrer Spots passt; sonst stünde
 * ein „Q" über nichts.
 */
export function HubSpotRows<T extends Spot>(props: ListProps<T>) {
  const { restaurants, facetsOf } = props;
  if (restaurants.length < LETTER_MARKS_FROM) return <Rows {...props} />;
  return (
    <div className={styles.letterGroups}>
      {byLetter(restaurants).map(({ letter, items }) => {
        const group = (
          <div className={styles.letterGroup}>
            <p className={styles.letter} aria-hidden="true">
              {letter}
            </p>
            <Rows {...props} restaurants={items} />
          </div>
        );
        return facetsOf ? (
          <HubFilterGroup key={letter} slugs={[...new Set(items.flatMap(facetsOf))]}>
            {group}
          </HubFilterGroup>
        ) : (
          <div key={letter}>{group}</div>
        );
      })}
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
