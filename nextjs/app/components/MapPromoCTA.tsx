import Image from 'next/image';
import MapIntentLink from './MapIntentLink';
import styles from './MapPromoCTA.module.css';

type Kind = 'restaurant' | 'bezirk' | 'kategorie';

interface Props {
  kind: Kind;
  /** Restaurant / Bezirk / Kategorie name for {name} interpolation. */
  name: string;
  /** Locale-relative deep-link to the (paywall-gated, noindex) /map route. */
  mapHref: string;
  locale: 'de' | 'en';
  variant?: 'block' | 'chip';
}

// All map-promo wording lives here — single place to wordsmith. Brand voice:
// declarative, no "gratis/free", no spot counts, no cheesy framing.
// Der Slogan bleibt auch auf DE englisch. `chipTitle` trägt die schmale Pille,
// in der der Slogan als Label viel zu lang wäre — dort steht stattdessen der
// ortsspezifische Einstieg.
/** Headline des Banners — auf jeder Fläche dieselbe, das ist die Marke. */
const SLOGAN = 'The map for people who care about food.';

function getCopy(
  kind: Kind,
  name: string,
  locale: 'de' | 'en'
): { sub: string; chipTitle: string } {
  const de = locale === 'de';
  switch (kind) {
    case 'restaurant':
      return de
        ? {
            sub: `${name} liegt auf der Eat This Map — zusammen mit weiteren kuratierten Restaurants, Cafés und Bars in Berlin.`,
            chipTitle: 'Auf der Map öffnen',
          }
        : {
            sub: `${name} is on the Eat This map — along with more curated restaurants, cafés and bars in Berlin.`,
            chipTitle: 'Open on the map',
          };
    // Bezirk und Kategorie sind nur die Tür: die Map ist stadtweit. Die alten
    // Einzeiler („Die besten Spots in der Gegend.") ließen sie wie einen
    // Ausschnitt der Seite aussehen, auf der sie steht, und gaben keinen Grund
    // zu klicken. Genannt werden nur Filter, die es wirklich gibt —
    // Kategorie, Bezirk, Küche (siehe map/MapListHeader).
    case 'bezirk':
      return de
        ? {
            sub: `Die Map hört nicht an der Bezirksgrenze auf: jedes kuratierte Restaurant, jedes Café und jede Bar in Berlin — filterbar nach Kategorie, Bezirk und Küche.`,
            chipTitle: `Ganz ${name} auf der Map`,
          }
        : {
            sub: `The map doesn't stop at the district line: every curated restaurant, café and bar in Berlin — filter by category, district and cuisine.`,
            chipTitle: `All of ${name} on the map`,
          };
    case 'kategorie':
      return de
        ? {
            sub: `Auf der Map steht nicht nur ${name}: jedes kuratierte Restaurant, jedes Café und jede Bar in Berlin — filterbar nach Kategorie, Bezirk und Küche.`,
            chipTitle: `${name} auf der Map`,
          }
        : {
            sub: `The map holds more than ${name}: every curated restaurant, café and bar in Berlin — filter by category, district and cuisine.`,
            chipTitle: `${name} on the map`,
          };
  }
}

const arrow = (
  <svg
    width="28"
    height="18"
    viewBox="0 0 32 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 10 L24 10" />
    <path d="M18 3 L27 10 L18 17" />
  </svg>
);

export default function MapPromoCTA({ kind, name, mapHref, locale, variant = 'block' }: Props) {
  const { sub, chipTitle } = getCopy(kind, name, locale);
  const ctaLabel = locale === 'de' ? 'Map öffnen' : 'Open the map';

  if (variant === 'chip') {
    return (
      <MapIntentLink href={mapHref} rel="nofollow" className={styles.chip} aria-label={chipTitle}>
        <span>{chipTitle}</span>
        {arrow}
      </MapIntentLink>
    );
  }

  return (
    <section className={styles.promo} aria-label={SLOGAN}>
      <div className={styles.copy}>
        <h2 className={`${styles.title} ${styles.titleRestaurant}`}>
          <span>The map for people</span> <span>who care about food.</span>
        </h2>
        <p className={styles.sub}>{sub}</p>
        {/* rel="nofollow" — /map is noindex; without it Google enumerates every
            ?r=/?bezirk=/?cat= variant in GSC. See feedback_seo_nofollow_into_noindex. */}
        <MapIntentLink href={mapHref} rel="nofollow" className={styles.cta}>
          <span>{ctaLabel}</span>
          {arrow}
        </MapIntentLink>
      </div>
      {/* The map IS the product — a black slab of type sold it badly. The
          device shot bleeds off the bottom edge so the banner reads as a
          window into the app rather than a poster about it. */}
      <div className={styles.shot} aria-hidden="true">
        <Image
          src="/pics/map-teaser/map_app.webp"
          alt=""
          width={855}
          height={1736}
          sizes="(max-width: 719px) 62vw, 360px"
          className={styles.shotImg}
        />
      </div>
    </section>
  );
}
