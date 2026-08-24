import type { StaticPageDoc } from '@/lib/types';
import AboutPage from './AboutPage';
import LegalPage from './LegalPage';

/* One entry point for every Sanity `staticPage`, two very different pages
   behind it: About is a story (photos, a red headline, an ink closer), the
   filings are documents (jump list, quiet type, no drop cap). They used to
   share one shell, which meant the privacy policy inherited a 116px headline
   and the imprint lost the first letter of the company name to a drop cap. */
export default function StaticPages({ doc, locale }: { doc: StaticPageDoc; locale: 'de' | 'en' }) {
  if (doc.slug === 'about') return <AboutPage doc={doc} locale={locale} />;
  return <LegalPage doc={doc} locale={locale} />;
}
