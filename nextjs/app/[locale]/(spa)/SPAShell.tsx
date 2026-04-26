import HeroSection from '@/app/components/HeroSection';
import SiteFooter from '@/app/components/SiteFooter';
import NewsSection from '@/app/components/NewsSection';
import StaticPages from '@/app/components/StaticPages';
import Intro from '@/app/components/landing/Intro';
import Ticker from '@/app/components/landing/Ticker';
import About from '@/app/components/landing/About';
import FanCards from '@/app/components/landing/FanCards';
import BurgerDrawer from '@/app/components/BurgerDrawer';
import MustsSection from '@/app/components/MustsSection';
import MapSection from '@/app/components/MapSection';
import NewsArticleShell from '@/app/components/NewsArticleShell';
import ProfileSection from '@/app/components/ProfileSection';
import EatModal from '@/app/components/EatModal';
import SearchOverlay from '@/app/components/SearchOverlay';
import CookieConsent from '@/app/components/CookieConsent';
import OnboardingOverlay from '@/app/components/OnboardingOverlay';
import WelcomeModal from '@/app/components/WelcomeModal';
import { getAllNewsArticles, getAllStaticPages, getAllMustEats } from '@/lib/sanity.server';

// Renders the full SPA shell. Used by page.tsx, [...slug]/page.tsx, and news/[slug]/page.tsx.
export default async function SPAShell({ activePage = 'start' }: { activePage?: string } = {}) {
  const [newsArticles, staticPages, mustEats] = await Promise.all([
    getAllNewsArticles(),
    getAllStaticPages(),
    getAllMustEats(),
  ]);

  const startActive = activePage === 'start';

  return (
    <>
      <div className="app-pages" id="appPages" suppressHydrationWarning>
        <div className={`app-page${startActive ? ' active' : ''}`} data-page="start" suppressHydrationWarning>
          <HeroSection />
          <div className="start-scroll-content">
            <Intro />
            <Ticker />
            <About />
            <FanCards />
            <SiteFooter />
          </div>
        </div>
        <MustsSection isActive={activePage === 'musts'} cards={mustEats} />
        <NewsSection articles={newsArticles} isActive={activePage === 'news'} />
        <MapSection isActive={activePage === 'map'} />
        <ProfileSection isActive={activePage === 'profile'} />
        <StaticPages pages={staticPages} activeSlug={activePage} />
        <NewsArticleShell isActive={activePage === 'news-article'} />
      </div>
      <BurgerDrawer />
      <EatModal />
      <SearchOverlay />
      <CookieConsent />
      <OnboardingOverlay />
      <WelcomeModal />
    </>
  );
}
