import type { HomeData } from '@/lib/home/getHomeData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import HubFaq from './HubFaq';
import HubFragRemy from './HubFragRemy';
import HubHeroCopy from './HubHeroCopy';
import HeroMarkFlight from './HeroMarkFlight';
import HubHashScroll from './HubHashScroll';
import HeroCurtain from './HeroCurtain';
import HubMotion from './HubMotion';
import HubMustEatsTeaser from './HubMustEatsTeaser';
import HubMapPreview from './HubMapPreview';
import MapIntentLink from './MapIntentLink';
import MagazineGrid from './MagazineGrid';
import StarterPackSignup from './StarterPackSignup';
import SiteFooter from './SiteFooter';
import { HomeMapDataProvider } from './HomeMapDataContext';
import styles from './HubSection.module.css';
import { BRAND_LOGO_SRC } from '@/lib/constants';

interface Props {
  initialData: HomeData;
  initialMapData: InitialMapData;
  locale: 'de' | 'en';
}

// `heroPhonesLabel` ist der Ankertext des größten internen Links der Seite —
// die Telefone im Hero sind eine reine Bildstrecke, also ist das aria-label
// alles, was ein Crawler daran liest. Es sagt jetzt, wohin der Link führt
// ("Berlin Food Map"), statt zu beschreiben, was auf dem Bild zu sehen ist —
// dafür ist `heroPhonesAlt` da, das vorher denselben String doppelt benutzte.
const copy = {
  de: {
    heroLabel: 'Eat This — die Food-Map für Berlin',
    heroPhonesLabel: 'Berlin Food Map öffnen',
    heroPhonesAlt: 'Die Eat This Berlin Food Map auf dem Handy',
  },
  en: {
    heroLabel: 'Eat This — the food map for Berlin',
    heroPhonesLabel: 'Open the Berlin food map',
    heroPhonesAlt: 'The Eat This Berlin food map on a phone',
  },
};

// Match the height-driven mockups, including the larger desktop hero. Keep
// small variants for phones and let large/Retina displays request the master.
const PHONE_WIDTHS = [300, 480, 600, 720, 855, 960, 985];
// Container height × each phone's height fraction × the source aspect ratio.
const FRONT_PHONE_SIZES = '(min-width: 1600px) min(34.3vh, 464px), (max-width: 920px) 202px, min(32.4vh, 306px)';
const BACK_PHONE_SIZES = '(min-width: 1600px) min(32.1vh, 434px), (max-width: 920px) 189px, min(30.4vh, 287px)';

function phoneSrcSet(name: string): string {
  return PHONE_WIDTHS.map(
    (w) => `/pics/home-phones/${name}${w === 985 ? '' : `-${w}`}.webp?v=3 ${w}w`
  ).join(', ');
}

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  const t = copy[locale];

  return (
    <main className={`homeV2 ${styles.page}`} data-hub="" data-cassette-home="">
      <HubHashScroll />

      {/* Die gelbe Fläche läuft von Kante zu Kante, der Inhalt bleibt im
          Satzspiegel — deshalb sitzt `hv-wrap` innen und nicht auf der
          Section. */}
      <section className={styles.hero} aria-label={t.heroLabel} data-hub-hero="">
        <HeroCurtain />
        {/* Die grosse Marke des Auftritts: Remy legt sie in der Mitte frei,
            dann wird sie auf den Platz der echten geschubst (HubMotion,
            `finishIntro`) und tritt dort ab. Dieselbe Datei wie die Marke im
            Aufmacher, also keine zweite Anfrage. Ausserhalb des Auftritts
            `display: none`. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.heroIntroMark}
          data-hero-intro-mark=""
          src={BRAND_LOGO_SRC}
          width={1660}
          height={667}
          alt=""
          aria-hidden="true"
          decoding="async"
        />
        <div className={`hv-wrap ${styles.heroInner}`}>
          <div className={styles.heroGrid}>
            <HubHeroCopy locale={locale} />
            {/* The product itself, not a mood shot: the map a visitor is about to
              open, with a spot page staggered behind it. Both mockups are
              cutouts on transparent ground so they float on the white home. */}
            {/* Kein rel="nofollow" mehr: das trug die Seite, solange /map
              `noindex` war. Seit dem 01.09.2026 ist die Karte die Landingpage
              für "Berlin Food Map" — sie braucht diesen Link. Die
              PARAMETRISIERTEN Deep-Links (`?r=`, `?bezirk=`, `?cat=`) behalten
              ihr nofollow, siehe „Zur Map" auf Spot-, Bezirks- und
              Kategorieseiten. */}
            <MapIntentLink
              href="/map"
              className={styles.heroPhones}
              aria-label={t.heroPhonesLabel}
              data-hub-phones=""
            >
              {/* Jedes Telefon schwebt in einer eigenen Hülle: die animiert nur
                  `transform` und läuft so auf der GPU. Am Bild selbst liegen
                  schon Hover, Maus und Scroll-Drift. */}
              <span className={`${styles.phoneFloat} ${styles.phoneFloatBack}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.phoneBack}
                  src="/pics/home-phones/phone-restaurant-red-480.webp?v=3"
                  srcSet={phoneSrcSet('phone-restaurant-red')}
                  sizes={BACK_PHONE_SIZES}
                  alt=""
                  width={985}
                  height={2000}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className={`${styles.phoneFloat} ${styles.phoneFloatFront}`}>
                {/* LCP element — the map phone is what the hero is actually about. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.phoneFront}
                  src="/pics/home-phones/phone-map-red-480.webp?v=3"
                  srcSet={phoneSrcSet('phone-map-red')}
                  sizes={FRONT_PHONE_SIZES}
                  alt={t.heroPhonesAlt}
                  width={985}
                  height={2000}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </span>
            </MapIntentLink>
          </div>
        </div>
      </section>
      <HeroMarkFlight />
      <HubMotion />
      <HomeMapDataProvider initialMapData={initialMapData}>
        {/* Lesen → Map ausprobieren → Must Eats sammeln. */}
        <MagazineGrid articles={initialData.magazine} locale={locale} />
        <HubMapPreview locale={locale} />
        <HubMustEatsTeaser />
      </HomeMapDataProvider>
      <HubFragRemy />
      <HubFaq locale={locale} />
      <StarterPackSignup />
      <SiteFooter home />
    </main>
  );
}
