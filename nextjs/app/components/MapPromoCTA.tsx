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
// Der Slogan bleibt auch auf DE englisch. Die schmale Pille trägt ihn nicht —
// dort steht `chipLabel`, siehe unten.
/** Headline des Banners — auf jeder Fläche dieselbe, das ist die Marke. */
const SLOGAN = 'The map for people who care about food.';

/** Pillen-Label — bewusst neutral: auf welcher Seite man steht, sagt die Seite
 *  selbst, die Pille muss nur den Weg zur Map zeigen. */
const chipLabel = (locale: 'de' | 'en') =>
  locale === 'de' ? 'Auf der Map öffnen' : 'Open on the map';

function getCopy(kind: Kind, name: string, locale: 'de' | 'en'): { sub: string } {
  const de = locale === 'de';
  switch (kind) {
    // Drei Sätze, immer dieselbe Form: wo du gerade bist ist nur die Tür —
    // was die Map verspricht — was du tun sollst. Vorher stand hier eine
    // Funktionsliste („filterbar nach Kategorie, Bezirk und Küche"), die
    // beschrieb, was die Map kann, statt warum man sie aufmacht.
    case 'restaurant':
      return de
        ? {
            sub: `${name} ist nur einer der Pins. Auf der Map steht, wo wir selbst essen — Restaurants, Cafés und Bars in ganz Berlin. Mach sie auf und schau, was noch in der Nähe liegt.`,
          }
        : {
            sub: `${name} is one pin of many. The map is where we actually eat — restaurants, cafés and bars across Berlin. Open it and see what else is close.`,
          };
    case 'bezirk':
      return de
        ? {
            sub: `Die Map hört nicht an der Bezirksgrenze auf. Auf ihr steht, wo wir selbst essen — Restaurants, Cafés und Bars in ganz Berlin. Mach sie auf und schau, was in deiner Nähe gut ist.`,
          }
        : {
            sub: `The map doesn't stop at the district line. It's where we actually eat — restaurants, cafés and bars across Berlin. Open it and see what's good near you.`,
          };
    case 'kategorie':
      return de
        ? {
            sub: `Auf der Map steht nicht nur ${name}. Sie zeigt, wo wir selbst essen — Restaurants, Cafés und Bars in ganz Berlin. Mach sie auf und schau, was in deiner Nähe gut ist.`,
          }
        : {
            sub: `The map holds more than ${name}. It's where we actually eat — restaurants, cafés and bars across Berlin. Open it and see what's good near you.`,
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
  const { sub } = getCopy(kind, name, locale);
  const ctaLabel = locale === 'de' ? 'Map öffnen' : 'Open the map';

  if (variant === 'chip') {
    const label = chipLabel(locale);
    return (
      <MapIntentLink href={mapHref} rel="nofollow" className={styles.chip} aria-label={label}>
        <span>{label}</span>
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
