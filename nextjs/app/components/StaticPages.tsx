import type { StaticPageDoc } from '@/lib/types';
import AboutPage from './AboutPage';
import ContactPage from './ContactPage';
import LegalPage from './LegalPage';

// Sanity owns the content; each page type gets its own reading layout.
export default function StaticPages({ doc, locale }: { doc: StaticPageDoc; locale: 'de' | 'en' }) {
  if (doc.slug === 'about') return <AboutPage doc={doc} locale={locale} />;
  if (doc.slug === 'contact') return <ContactPage doc={doc} />;
  return <LegalPage doc={doc} locale={locale} />;
}
