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
import HomeDistricts from './HomeDistricts';
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

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  return (
    <main className={`homeV2 ${styles.page}`} data-hub="" data-cassette-home="">
      <HubHashScroll />
      <section className={styles.hero} aria-label={locale === 'de' ? 'Eat This — die Food-Map für Berlin' : 'Eat This — the food map for Berlin'} data-hub-hero="">
        <HeroCurtain />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.heroIntroMark} data-hero-intro-mark="" src="/pics/home/wordmark.webp?v=1" width={1124} height={274} alt="" aria-hidden="true" />
        <div className={styles.heroInner}>
          <HubHeroCopy locale={locale} />
        </div>
      </section>
      <HeroMarkFlight />
      <HubMotion />
      <HomeMapDataProvider initialMapData={initialMapData}>
        <MagazineGrid articles={initialData.magazine} locale={locale} />
        <HubMustEatsTeaser />
        <HomeDistricts locale={locale} />
      </HomeMapDataProvider>
      <HubFragRemy />
      <HubFaq locale={locale} />
      <StarterPackSignup />
      <SiteFooter home />
    </main>
  );
}
