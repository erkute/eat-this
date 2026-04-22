import HeroSection from '@/app/components/HeroSection';
import SiteFooter from '@/app/components/SiteFooter';
import NewsSection from '@/app/components/NewsSection';
import StartSections from '@/app/components/StartSections';
import StaticPages from '@/app/components/StaticPages';
import BurgerDrawer from '@/app/components/BurgerDrawer';
import MustsSection from '@/app/components/MustsSection';
import MapSection from '@/app/components/MapSection';
import NewsArticleShell from '@/app/components/NewsArticleShell';
import ProfileSection from '@/app/components/ProfileSection';
import { getAllNewsArticles, getAllStaticPages } from '@/lib/sanity.server';
import { templatesAndModalsHTML } from './spa-content';

// display:contents makes the wrapper invisible to CSS layout — children participate
// directly in the parent's formatting context, preserving flex/grid and CSS child selectors.
function RawHtml({ html }: { html: string }) {
  return <div style={{ display: 'contents' }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}

// Injects the `active` class into the .app-page block matching `slug` within a
// raw HTML template string. Mirrors what app.min.js's m() would do client-side,
// but runs at SSR so the correct page is visible on first paint (no flash).
function withActive(html: string, slug: string): string {
  const re = new RegExp(`(<div class="app-page)([^"]*)(" data-page="${slug}")`);
  return html.replace(re, (_, pre, classes, post) => `${pre}${classes} active${post}`);
}

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
          <div className="start-scroll-content">
            <StartSections />
            <SiteFooter />
          </div>
        </div>
        <MustsSection isActive={activePage === 'musts'} />
        <NewsSection articles={newsArticles} isActive={activePage === 'news'} />
        <MapSection isActive={activePage === 'map'} />
        <ProfileSection isActive={activePage === 'profile'} />
        <StaticPages pages={staticPages} activeSlug={activePage} />
        <NewsArticleShell isActive={activePage === 'news-article'} />
      </div>
      <BurgerDrawer />
      <RawHtml html={templatesAndModalsHTML} />
    </>
  );
}
