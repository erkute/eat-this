import { normalizeName } from '@/lib/normalizeName';
import type { HomeData } from '@/lib/home/getHomeData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import HubFaq from './HubFaq';
import HubFragRemy from './HubFragRemy';
import HubHeroCopy from './HubHeroCopy';
import HubHashScroll from './HubHashScroll';
import HubMustEatsTeaser from './HubMustEatsTeaser';
import HubNearby from './HubNearby';
import MapIntentLink from './MapIntentLink';
import CategoriesRail from './CategoriesRail';
import HomeDishStrip from './HomeDishStrip';
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

const copy = {
  de: {
    spotDay: 'Spot des Tages',
    heroLabel: 'Eat This — die Food-Map für Berlin',
    heroPhonesLabel: 'Die Eat This Map auf dem Handy',
    todayLabel: 'Heute essen',
  },
  en: {
    spotDay: 'Spot of the day',
    heroLabel: 'Eat This — the food map for Berlin',
    heroPhonesLabel: 'The Eat This map on your phone',
    todayLabel: 'Eat today',
  },
};

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

      <section className={`hv-wrap ${styles.hero}`} aria-label={t.heroLabel}>
        <div className={styles.heroGrid}>
          <HubHeroCopy locale={locale} />
          {/* The product itself, not a mood shot: the map a visitor is about to
              open, with a spot page staggered behind it. Both mockups are
              cutouts on transparent ground so they float on the white home. */}
          <MapIntentLink
            href="/map"
            rel="nofollow"
            className={styles.heroPhones}
            aria-label={t.heroPhonesLabel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.phoneBack}
              src="/pics/home-phones/phone-restaurant.webp"
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
              src="/pics/home-phones/phone-map.webp"
              alt={t.heroPhonesLabel}
              width={855}
              height={1736}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </MapIntentLink>
        </div>
      </section>

      <HomeMapDataProvider initialMapData={initialMapData}>
        {/* "What should I eat right now" answered once, not twice: the day's pick
          beside what is actually around you. Split into two stacked sections
          they each filled half a desktop row and left the other half empty. */}
        <section className={`homeV2 hv-section hv-wrap ${styles.today}`} aria-label={t.todayLabel}>
          <div className={styles.todayGrid}>
            {spot && (
              <article className={styles.spot}>
                <MapIntentLink
                  href={`/map?r=${spot.slug}`}
                  rel="nofollow"
                  className={`hv-photo ${styles.spotPhoto}`}
                  aria-label={`${normalizeName(spot.name)} — ${t.spotDay}`}
                >
                  {spot.image && (
                    // Deliberately bypass the App Hosting image proxy: Sanity
                    // serves the responsive, format-negotiated variants directly.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.spotImage}
                      src={sanityImageLoader({ src: spot.image, width: 960, quality: 75 })}
                      srcSet={sanitySrcSet(spot.image, [640, 750, 960, 1280], 75)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width:760px) 92vw, 620px"
                    />
                  )}
                  <span className={styles.spotTag}>
                    <span className={styles.spotLabel}>{t.spotDay}</span>
                    <strong>{normalizeName(spot.name)}</strong>
                    {spot.district && <span className="hv-kicker">{spot.district}</span>}
                  </span>
                </MapIntentLink>
                {/* Loaded from Sanity all along and never rendered — it is the
                  reason this spot is today's pick, so it belongs here. */}
                {spot.sub && <p className={styles.spotSub}>{spot.sub}</p>}
              </article>
            )}

            <HubNearby locale={locale} today={today} embedded />
          </div>
        </section>

        {/* Order follows what a first-time visitor needs, in that order: what is
          this (hero) → what to eat right now → the free offer while interest is
          highest → the thing nobody else has (must eats) → proof we know the
          city (magazine) → a second chance at the offer → navigation → Remy and
          FAQ. Selling packs moved off the home page. */}
        <StarterPackSignup locale={locale} />
        <HubMustEatsTeaser>
          <HomeDishStrip locale={locale} />
        </HubMustEatsTeaser>
      </HomeMapDataProvider>
      <MagazineGrid articles={initialData.magazine} locale={locale} />
      <CategoriesRail categoryNames={initialData.categoryNames} locale={locale} />
      <HubFragRemy />
      <HubFaq locale={locale} />
      <SiteFooter />
    </main>
  );
}
