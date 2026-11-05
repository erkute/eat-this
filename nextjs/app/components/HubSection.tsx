import { Suspense } from 'react';
import type { HomeData } from '@/lib/home/getHomeData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import HubFaq from './HubFaq';
import HubFragRemy from './HubFragRemy';
import HubHeroCopy from './HubHeroCopy';
import HeroHeaderLogo from './HeroHeaderLogo';
import HubHashScroll from './HubHashScroll';
import HomeHeatTracker from './HomeHeatTracker';
import HubMotion from './HubMotion';
import HubMapIntro from './HubMapIntro';
import HubMustEatsTeaser from './HubMustEatsTeaser';
import HomeDistricts from './HomeDistricts';
import MagazineGrid from './MagazineGrid';
import StarterPackSignup from './StarterPackSignup';
import SiteFooter from './SiteFooter';
import PaperPhoto from './PaperPhoto';
import { HomeMapDataProvider } from './HomeMapDataContext';
import styles from './HubSection.module.css';

interface Props {
  initialData: HomeData;
  initialMapData: InitialMapData;
  locale: 'de' | 'en';
}

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  return (
    <main className={`homeV2 ${styles.page}`} data-hub="" data-cassette-home="">
      {/* Keep the server-rendered page in place while its client chunks hydrate. */}
      <Suspense fallback={null}>
        <HubHashScroll />
        <HomeHeatTracker />
        <section
          className={styles.hero}
          aria-label={
            locale === 'de'
              ? 'Eat This — die Food-Map für Berlin'
              : 'Eat This — the food map for Berlin'
          }
          data-hub-hero=""
        >
          <div className={styles.heroInner}>
            <HubHeroCopy locale={locale} />
          </div>
        </section>
        <HeroHeaderLogo />
        <HubMotion />
        <HubMapIntro locale={locale} />
        <HomeMapDataProvider initialMapData={initialMapData}>
          <MagazineGrid articles={initialData.magazine} locale={locale} />
          <HubMustEatsTeaser />
          <HomeDistricts locale={locale} />
        </HomeMapDataProvider>
        <HubFragRemy />
        <HubFaq locale={locale} />
        <div className={styles.paperEnd}>
          <PaperPhoto mirrored />
          <StarterPackSignup />
        </div>
        <SiteFooter />
      </Suspense>
    </main>
  );
}
