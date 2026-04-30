import HeroSection from '@/app/components/HeroSection';
import SiteFooter from '@/app/components/SiteFooter';
import NewsSection from '@/app/components/NewsSection';
import StaticPages from '@/app/components/StaticPages';
import Ticker from '@/app/components/landing/Ticker';
import HeroIntro from '@/app/components/landing/HeroIntro';
import AboutFanRow from '@/app/components/landing/AboutFanRow';
import Selection from '@/app/components/landing/Selection';
import USPs from '@/app/components/landing/USPs';
import MemoryGame from '@/app/components/landing/MemoryGame';
import MapTeaser from '@/app/components/landing/MapTeaser';
import BoosterPack from '@/app/components/landing/BoosterPack';
import Coming from '@/app/components/landing/Coming';
import LandingFAQ from '@/app/components/landing/LandingFAQ';
import Newsletter from '@/app/components/landing/Newsletter';
import MapSection from '@/app/components/MapSection';
import NewsArticleShell from '@/app/components/NewsArticleShell';
import EatModal from '@/app/components/EatModal';
import SearchOverlay from '@/app/components/SearchOverlay';
import CookieConsent from '@/app/components/CookieConsent';
import OnboardingOverlay from '@/app/components/OnboardingOverlay';
import WelcomeModal from '@/app/components/WelcomeModal';
import { getAllNewsArticles, getAllStaticPages } from '@/lib/sanity.server';

// Renders the full SPA shell. Used by page.tsx, [...slug]/page.tsx, and news/[slug]/page.tsx.
export default async function SPAShell({ activePage = 'start' }: { activePage?: string } = {}) {
  const [newsArticles, staticPages] = await Promise.all([
    getAllNewsArticles(),
    getAllStaticPages(),
  ]);

  const startActive = activePage === 'start';

  return (
    <>
      <div className="app-pages" id="appPages" suppressHydrationWarning>
        <div className={`app-page${startActive ? ' active' : ''}`} data-page="start" suppressHydrationWarning>
          <HeroSection />
          <div className="start-scroll-content" style={{ paddingTop: 0 }}>
            <HeroIntro />
            <Ticker />
            <AboutFanRow />
            <USPs />
            <MemoryGame />
            <Selection />
            <MapTeaser />
            <BoosterPack />
            <Coming />
            <LandingFAQ />
            <Newsletter />
            <SiteFooter />
          </div>
        </div>
        <NewsSection articles={newsArticles} isActive={activePage === 'news'} />
        <MapSection isActive={activePage === 'map'} />
        <StaticPages pages={staticPages} activeSlug={activePage} />
        <NewsArticleShell isActive={activePage === 'news-article'} />
      </div>
      <EatModal />
      <SearchOverlay newsArticles={newsArticles} />
      <CookieConsent />
      <OnboardingOverlay />
      <WelcomeModal />
    </>
  );
}
