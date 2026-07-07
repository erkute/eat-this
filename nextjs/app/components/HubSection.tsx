import Image from 'next/image';
import { normalizeName } from '@/lib/normalizeName';
import type { HomeData } from '@/lib/home/getHomeData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import HubFaq from './HubFaq';
import HubDeineWelt from './HubDeineWelt';
import HubFragRemy from './HubFragRemy';
import HubHashScroll from './HubHashScroll';
import HubMustEatsTeaser from './HubMustEatsTeaser';
import HubNearby from './HubNearby';
import MapIntentLink from './MapIntentLink';
import CategoriesRail from './CategoriesRail';
import HomeDishStrip from './HomeDishStrip';
import DistrictsList from './DistrictsList';
import MagazineGrid from './MagazineGrid';
import SiteFooter from './SiteFooter';
import styles from './HubSection.module.css';

interface Props {
  initialData: HomeData;
  initialMapData: InitialMapData;
  locale: 'de' | 'en';
}

const copy = {
  de: {
    heroCta: 'Zur Map',
    spotDay: 'Spot des Tages',
  },
  en: {
    heroCta: 'Open map',
    spotDay: 'Spot of the day',
  },
};

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  const t = copy[locale];
  const spot = initialData.spotOfDay;

  return (
    <div className={`homeV2 ${styles.page}`} data-hub="" data-cassette-home="">
      <HubHashScroll />
      <HubDeineWelt />

      <section className={`hv-wrap ${styles.hero}`} aria-label={t.spotDay}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={`hv-kicker ${styles.heroKicker}`}>
              {locale === 'en' ? 'What you should eat.' : 'Was du essen solltest.'}
            </span>
            <h1 className={styles.heroHeadline}>
              We tell you
              <br />
              what to eat
            </h1>
            <div className={styles.heroActions}>
              <MapIntentLink
                href={spot ? `/map?r=${spot.slug}` : '/map'}
                rel="nofollow"
                className="hv-btn"
              >
                {t.heroCta}
              </MapIntentLink>
              <MapIntentLink href="/map" rel="nofollow" className={`hv-link-underline ${styles.heroNearbyLink}`}>
                {locale === 'en' ? "What's near me" : 'Was ist um mich'}
              </MapIntentLink>
            </div>
          </div>
          {spot && (
            <MapIntentLink
              href={`/map?r=${spot.slug}`}
              rel="nofollow"
              className={`hv-photo ${styles.heroPhoto}`}
              aria-label={`${normalizeName(spot.name)} — ${t.spotDay}`}
            >
              {spot.image && (
                <Image src={spot.image} alt="" fill priority sizes="(max-width:760px) 92vw, 46vw" />
              )}
              <span className={styles.heroPhotoTag}>
                <span className="hv-kicker">{t.spotDay}</span>
                <strong>{normalizeName(spot.name)}</strong>
              </span>
            </MapIntentLink>
          )}
        </div>
      </section>

      <HubNearby initialMapData={initialMapData} locale={locale} />
      <CategoriesRail categoryNames={initialData.categoryNames} locale={locale} />
      <HomeDishStrip locale={locale} />
      <HubMustEatsTeaser initialMapData={initialMapData} />
      <HubFragRemy />
      <DistrictsList districts={initialData.districts} locale={locale} />
      <MagazineGrid articles={initialData.magazine} locale={locale} />
      <HubFaq locale={locale} />
      <SiteFooter />
    </div>
  );
}
