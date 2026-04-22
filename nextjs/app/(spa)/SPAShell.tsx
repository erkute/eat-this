import HeroSection from '@/app/components/HeroSection';
import SiteFooter from '@/app/components/SiteFooter';
import NewsSection from '@/app/components/NewsSection';
import { getAllNewsArticles } from '@/lib/sanity.server';
import {
  startScrollInnerHTML,
  pagesBeforeNewsHTML,
  pagesAfterNewsHTML,
  templatesAndModalsHTML,
} from './spa-content';

// display:contents makes the wrapper invisible to CSS layout — children participate
// directly in the parent's formatting context, preserving flex/grid and CSS child selectors.
function RawHtml({ html }: { html: string }) {
  return <div style={{ display: 'contents' }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}

// Renders the full SPA shell. Used by page.tsx, [...slug]/page.tsx, and news/[slug]/page.tsx.
export default async function SPAShell() {
  const newsArticles = await getAllNewsArticles();

  return (
    <>
      <div className="app-pages" id="appPages" suppressHydrationWarning>
        <div className="app-page active" data-page="start" suppressHydrationWarning>
          <HeroSection />
          <div className="start-scroll-content">
            <RawHtml html={startScrollInnerHTML} />
            <SiteFooter />
          </div>
        </div>
        <RawHtml html={pagesBeforeNewsHTML} />
        <NewsSection articles={newsArticles} />
        <RawHtml html={pagesAfterNewsHTML} />
      </div>
      <RawHtml html={templatesAndModalsHTML} />
    </>
  );
}
