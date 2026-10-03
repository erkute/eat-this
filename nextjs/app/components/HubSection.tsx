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
import HubNearby from './HubNearby';
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

// The mockups render ~235px wide on phones and ~290px on desktop. Shipping the
// 855px master to every viewport cost 250KB in the hero — more than the rest of
// the page's images put together — for slots a quarter that size.
const PHONE_WIDTHS = [300, 480, 600, 855];
const PHONE_SIZES = '(max-width: 920px) 240px, 290px';

function phoneSrcSet(name: string): string {
  return PHONE_WIDTHS.map(
    (w) => `/pics/home-phones/${name}${w === 855 ? '' : `-${w}`}.webp ${w}w`
  ).join(', ');
}

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  const t = copy[locale];
  // Server date seeds HubNearby's no-location rotation. Taken here rather than
  // in the client island so SSR and the first client render can't disagree
  // across a midnight boundary. The page is force-dynamic, so it stays fresh.
  const today = new Date().toISOString().slice(0, 10);

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.phoneBack}
                src="/pics/home-phones/phone-restaurant-ink-480.webp"
                srcSet={phoneSrcSet('phone-restaurant-ink')}
                sizes={PHONE_SIZES}
                alt=""
                width={855}
                height={1736}
                loading="lazy"
                decoding="async"
              />
              {/* LCP element — the map phone is what the hero is actually about. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.phoneFront}
                src="/pics/home-phones/phone-map-ink-480.webp"
                srcSet={phoneSrcSet('phone-map-ink')}
                sizes={PHONE_SIZES}
                alt={t.heroPhonesAlt}
                width={855}
                height={1736}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </MapIntentLink>
          </div>
        </div>
      </section>
      <HeroMarkFlight />
      <HubMotion />
      <HomeMapDataProvider initialMapData={initialMapData}>
        {/* Ansage 01.10.2026: das Magazin direkt unter den Hero, „Worauf hast
          du Lust" unter das Starter Pack. Daraus vier Kapitel: lesen
          (Teller) → entdecken (was ist um dich) → sammeln (Must Eats und
          das Starter Pack, das die ersten Karten bringt) → noch
          unentschlossen: Remys Tafel fragt „Worauf hast du Lust?", die
          Kategorien sind die Antworten, und wer keine hat, fragt Remy →
          FAQ. Packs verkauft die Startseite nicht mehr, den Spot des Tages
          gibt es seit 01.10.2026 nicht mehr. */}
        <MagazineGrid articles={initialData.magazine} locale={locale} />
        <HubNearby locale={locale} today={today} />
        <HubMustEatsTeaser />
        <StarterPackSignup />
      </HomeMapDataProvider>
      <HubFragRemy categoryNames={initialData.categoryNames} />
      <HubFaq locale={locale} />
      <SiteFooter home />
    </main>
  );
}
