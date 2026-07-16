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
import DistrictsList from './DistrictsList';
import MagazineGrid from './MagazineGrid';
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
  },
  en: {
    spotDay: 'Spot of the day',
  },
};

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  const t = copy[locale];
  const spot = initialData.spotOfDay;

  return (
    <main className={`homeV2 ${styles.page}`} data-hub="" data-cassette-home="">
      <HubHashScroll />

      <section className={`hv-wrap ${styles.hero}`} aria-label={t.spotDay}>
        <div className={styles.heroGrid}>
          <HubHeroCopy locale={locale} />
          {spot && (
            <MapIntentLink
              href={`/map?r=${spot.slug}`}
              rel="nofollow"
              className={`hv-photo ${styles.heroPhoto}`}
              aria-label={`${normalizeName(spot.name)} — ${t.spotDay}`}
            >
              {spot.image && (
                // Deliberately bypass the App Hosting image proxy for the LCP:
                // Sanity serves the responsive, format-negotiated variants directly.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.heroImage}
                  src={sanityImageLoader({ src: spot.image, width: 750, quality: 75 })}
                  srcSet={sanitySrcSet(spot.image, [480, 640, 750, 960], 75)}
                  alt=""
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  sizes="(max-width:760px) 92vw, 440px"
                />
              )}
              <span className={styles.heroPhotoTag}>
                <span className="hv-kicker">{t.spotDay}</span>
                <strong>{normalizeName(spot.name)}</strong>
              </span>
            </MapIntentLink>
          )}
        </div>
      </section>

      <HomeMapDataProvider initialMapData={initialMapData}>
        <HubNearby locale={locale} />
        <CategoriesRail categoryNames={initialData.categoryNames} locale={locale} />
        <HomeDishStrip locale={locale} />
        <HubMustEatsTeaser />
      </HomeMapDataProvider>
      <HubFragRemy />
      <DistrictsList districts={initialData.districts} locale={locale} />
      <MagazineGrid articles={initialData.magazine} locale={locale} />
      <HubFaq locale={locale} />
      <SiteFooter />
    </main>
  );
}
