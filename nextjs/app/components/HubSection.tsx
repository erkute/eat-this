import { normalizeName } from '@/lib/normalizeName';
import type { HomeData } from '@/lib/home/getHomeData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import HubFaq from './HubFaq';
import HubFragRemy from './HubFragRemy';
import HubHeroCopy from './HubHeroCopy';
import HeroMarkFlight from './HeroMarkFlight';
import HubHashScroll from './HubHashScroll';
import HubMustEatsTeaser from './HubMustEatsTeaser';
import HubNearby from './HubNearby';
import MapIntentLink from './MapIntentLink';
import CategoriesRail from './CategoriesRail';
import MagazineGrid from './MagazineGrid';
import StarterPackSignup from './StarterPackSignup';
import SiteFooter from './SiteFooter';
import { HomeMapDataProvider } from './HomeMapDataContext';
import styles from './HubSection.module.css';

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
    spotDay: 'Spot des Tages',
    spotCta: 'Zur Map',
    heroLabel: 'Eat This — die Food-Map für Berlin',
    heroPhonesLabel: 'Berlin Food Map öffnen',
    heroPhonesAlt: 'Die Eat This Berlin Food Map auf dem Handy',
  },
  en: {
    spotDay: 'Spot of the day',
    spotCta: 'To the map',
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

// Makes "des Tages" literal. Nothing else on the page said the pick is new
// today, so nothing gave a reason to come back tomorrow. Formatted from the
// very string the pick is keyed to, pinned to noon UTC so no zone or DST
// shift can move the label off the day it labels.
function dayLabel(today: string, locale: 'de' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: locale === 'en' ? 'short' : '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${today}T12:00:00Z`));
}

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  const t = copy[locale];
  const spot = initialData.spotOfDay;
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
      <section className={styles.hero} aria-label={t.heroLabel}>
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
              ihr nofollow, siehe MapPromoCTA. */}
            <MapIntentLink
              href="/map"
              className={styles.heroPhones}
              aria-label={t.heroPhonesLabel}
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

      <HomeMapDataProvider initialMapData={initialMapData}>
        {/* What is around you comes first: it needs nothing from the visitor
          but a tap, and it answers "what do I eat now" with their own street.
          The day's pick follows as the editorial answer to the same question.
          Both are full-width sections of their own now — stacked inside one
          section the second heading had to shrink to stay out of the first
          one's way, and neither block led. */}
        <HubNearby locale={locale} today={today} />

        {spot && (
          <section className="homeV2 hv-section hv-wrap">
            <article className={styles.spot}>
              <div className={`hv-head ${styles.spotHead}`}>
                <h2 className="hv-title">
                  <span className="hv-mk" aria-hidden="true" />
                  {t.spotDay}
                </h2>
                <time className={styles.spotDate} dateTime={today}>
                  {dayLabel(today, locale)}
                </time>
              </div>
              {/* Name and reason sit beside the photo, not on it: the pick is a
                different restaurant every day and half the images are bright
                enough to swallow white type. The photo runs out to the page
                edge instead, which is what makes this read as the lead. */}
              <MapIntentLink
                href={`/map?r=${spot.slug}`}
                rel="nofollow"
                className={`${styles.spotCard} ${spot.image ? '' : styles.spotCardTextOnly}`}
              >
                {spot.image && (
                  <span className={`hv-photo ${styles.spotPhoto}`}>
                    {/* Deliberately bypass the App Hosting image proxy: Sanity
                      serves the responsive, format-negotiated variants directly. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.spotImage}
                      src={sanityImageLoader({ src: spot.image, width: 960, quality: 75 })}
                      srcSet={sanitySrcSet(spot.image, [640, 750, 960, 1280], 75)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width:920px) 100vw, (max-width:1200px) 60vw, 780px"
                    />
                  </span>
                )}
                <span className={styles.spotBody}>
                  {spot.district && (
                    <span className={`hv-kicker ${styles.spotKicker}`}>{spot.district}</span>
                  )}
                  <span className={styles.spotName}>{normalizeName(spot.name)}</span>
                  {/* Loaded from Sanity all along and never rendered — it is the
                    reason this spot is today's pick, so it belongs here. */}
                  {spot.sub && <span className={styles.spotSub}>{spot.sub}</span>}
                  <span className={styles.spotCta}>{t.spotCta}</span>
                </span>
              </MapIntentLink>
            </article>
          </section>
        )}

        {/* Order follows what a first-time visitor needs, in that order: what is
          this (hero) → what is around you → the day's pick → proof we know the
          city (magazine) → the free offer → the thing nobody else has (must
          eats) → navigation → Remy and FAQ. Selling packs moved off the home
          page. */}
        <MagazineGrid articles={initialData.magazine} locale={locale} />
        <StarterPackSignup locale={locale} />
        <HubMustEatsTeaser />
      </HomeMapDataProvider>
      <CategoriesRail categoryNames={initialData.categoryNames} locale={locale} />
      <HubFragRemy />
      <HubFaq locale={locale} />
      <SiteFooter />
    </main>
  );
}
