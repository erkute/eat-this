import Image from 'next/image';
import MapIntentLink from './MapIntentLink';
import styles from './MapPromoCTA.module.css';

type Kind = 'restaurant' | 'bezirk' | 'kategorie';

interface Props {
  kind: Kind;
  /** Restaurant / Bezirk / Kategorie name for {name} interpolation. */
  name: string;
  /** Locale-relative deep-link into /map — immer mit Query (`?r=`, `?bezirk=`,
   *  `?cat=`), deshalb tragen alle drei Varianten unten rel="nofollow". */
  mapHref: string;
  locale: 'de' | 'en';
  variant?: 'block' | 'chip' | 'band';
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

const pin = (
  <svg
    width="22"
    height="26"
    viewBox="0 0 22 26"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 24.5C11 24.5 19.5 16.6 19.5 10.5a8.5 8.5 0 1 0-17 0C2.5 16.6 11 24.5 11 24.5Z" />
    <circle cx="11" cy="10.4" r="3.1" />
  </svg>
);

export default function MapPromoCTA({ kind, name, mapHref, locale, variant = 'block' }: Props) {
  const { sub } = getCopy(kind, name, locale);
  const ctaLabel = locale === 'de' ? 'Map öffnen' : 'Open the map';

  // Die frühe Map-CTA unter dem Opener — derselbe Knopf wie im Hero der
  // Startseite, nur mit dem gelben Pin davor.
  if (variant === 'band') {
    const label = chipLabel(locale);
    return (
      <MapIntentLink href={mapHref} rel="nofollow" className={styles.band} aria-label={label}>
        <span className={styles.bandMark}>{pin}</span>
        <span>{label}</span>
      </MapIntentLink>
    );
  }

  if (variant === 'chip') {
    const label = chipLabel(locale);
    return (
      <MapIntentLink href={mapHref} rel="nofollow" className={styles.chip} aria-label={label}>
        <span>{label}</span>
      </MapIntentLink>
    );
  }

  return (
    <section className={styles.promo} aria-label={SLOGAN}>
      <div className={styles.copy}>
        {/* Die Marke als Absender über dem Versprechen. Als Grafik, nicht als
            gesetzter Text: die Wortmarke ist gezeichnet, jede Nachbildung in
            Providence bleibt eine Näherung (dieselbe Regel wie auf den
            Kategorie-Seiten). Auf der Ink-Tafel trägt sie über ihre creme
            Füllung, wie im SiteNav. Nicht `aria-hidden`: der Absender gehört
            vorgelesen. */}
        <Image
          src="/pics/eat-this-logo.webp?v=6"
          alt="Eat This"
          width={1660}
          height={667}
          sizes="min(46vw, 190px)"
          className={styles.brandMark}
        />
        <h2 className={`${styles.title} ${styles.titleRestaurant}`}>
          <span>The map for people</span> <span>who care about food.</span>
        </h2>
        <p className={styles.sub}>{sub}</p>
        {/* rel="nofollow" bleibt, aber nicht mehr wegen `noindex`: /map ist seit
            dem 01.09.2026 indexierbar und die Landingpage für „Berlin Food Map".
            Der Grund ist jetzt allein die Aufzählung — `mapHref` trägt hier immer
            eine Query, und ohne nofollow listet die Search Console jede
            ?r=/?bezirk=/?cat=-Variante einzeln auf. Die FOLGBAREN Links auf das
            blanke /map stehen im Hero der Startseite und auf /about. */}
        <MapIntentLink href={mapHref} rel="nofollow" className={styles.cta}>
          <span>{ctaLabel}</span>
        </MapIntentLink>
      </div>
      {/* The map IS the product. The device shot bleeds off the bottom edge so
          the board reads as a window into the app rather than a poster about it.
          Zwei Geräte statt einem, dieselbe Staffelung wie im Hero der
          Startseite: die Map vorn, eine Spot-Seite dahinter. Ein einzelnes
          Telefon zeigt nur die Karte — das Paar zeigt, dass hinter jedem Pin
          noch etwas liegt. */}
      <div className={styles.shot} aria-hidden="true">
        <Image
          src="/pics/home-phones/phone-restaurant.webp"
          alt=""
          width={855}
          height={1736}
          sizes="(max-width: 719px) 48vw, 280px"
          className={styles.shotBack}
        />
        <Image
          src="/pics/home-phones/phone-map.webp"
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
