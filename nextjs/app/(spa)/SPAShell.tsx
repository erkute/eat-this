import HeroSection from '@/app/components/HeroSection';
import SiteFooter from '@/app/components/SiteFooter';
import { startScrollInnerHTML, otherPagesHTML, templatesAndModalsHTML } from './spa-content';

// display:contents makes the wrapper invisible to CSS layout — children participate
// directly in the parent's formatting context, preserving flex/grid and CSS child selectors.
function RawHtml({ html }: { html: string }) {
  return <div style={{ display: 'contents' }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}

// Renders the full SPA shell. Used by page.tsx, [...slug]/page.tsx, and news/[slug]/page.tsx.
export default function SPAShell() {
  return (
    <>
      <div className="app-pages" id="appPages">
        <div className="app-page active" data-page="start">
          <HeroSection />
          <div className="start-scroll-content">
            <RawHtml html={startScrollInnerHTML} />
            <SiteFooter />
          </div>
        </div>
        <RawHtml html={otherPagesHTML} />
      </div>
      <RawHtml html={templatesAndModalsHTML} />
    </>
  );
}
