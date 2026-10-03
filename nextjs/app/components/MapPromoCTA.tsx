import Image from '@/app/components/SiteImage';
import MapIntentLink from './MapIntentLink';
import styles from './MapPromoCTA.module.css';
import { BRAND_LOGO_SRC } from '@/lib/constants';

/** Nur noch die Restaurant-Seite zeigt die Tafel: `restaurant` für einen
 *  Spot auf der Map, `bezirk` für einen, der dort nicht steht (dann führt sie
 *  auf die ganze Map). Bezirks- und Kategorieseiten stehen seit 03.10.2026 im Heftlook und
 *  haben stattdessen ihren „Zur Map"-Knopf (HubIssue). */
type Kind = 'restaurant' | 'bezirk';

interface Props {
  kind: Kind;
  /** Restaurant name for {name} interpolation. */
  name: string;
  /** Locale-relative deep-link into /map. Trägt sie eine Query (`?r=`), wäre
   *  ein gefolgter Link eine eigene Variante in der Search Console — deshalb
   *  rel="nofollow" unten. */
  mapHref: string;
  locale: 'de' | 'en';
}

// All map-promo wording lives here — single place to wordsmith. Brand voice:
// declarative, no "gratis/free", no spot counts, no cheesy framing.
// Der Slogan bleibt auch auf DE englisch.
/** Headline des Banners — auf jeder Fläche dieselbe, das ist die Marke. */
const SLOGAN = 'The map for people who care about food.';

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
            sub: `${name} ist nur einer der Pins. Die Map zeigt dir handverlesene Restaurants, Cafés und Bars in ganz Berlin — und was du dort bestellen solltest. Mach sie auf und schau, was noch in der Nähe liegt.`,
          }
        : {
            sub: `${name} is one pin of many. The map shows you hand-picked restaurants, cafés and bars across Berlin — and what to order there. Open it and see what else is close.`,
          };
    case 'bezirk':
      return de
        ? {
            sub: `Die Map hört nicht an der Bezirksgrenze auf. Sie zeigt dir handverlesene Restaurants, Cafés und Bars in ganz Berlin — und was du dort bestellen solltest. Mach sie auf und schau, was in deiner Nähe liegt.`,
          }
        : {
            sub: `The map doesn't stop at the district line. It shows you hand-picked restaurants, cafés and bars across Berlin — and what to order there. Open it and see what's near you.`,
          };
  }
}

export default function MapPromoCTA({ kind, name, mapHref, locale }: Props) {
  const { sub } = getCopy(kind, name, locale);
  const ctaLabel = locale === 'de' ? 'Map öffnen' : 'Open the map';

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
          src={BRAND_LOGO_SRC}
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
          src="/pics/home-phones/phone-restaurant-ink.webp"
          alt=""
          width={855}
          height={1736}
          sizes="(max-width: 719px) 48vw, 280px"
          className={styles.shotBack}
        />
        <Image
          src="/pics/home-phones/phone-map-ink.webp"
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
