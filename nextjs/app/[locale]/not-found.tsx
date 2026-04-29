import type { Metadata } from 'next';
import NotFoundContent from '../components/NotFoundContent';

export const metadata: Metadata = {
  title:  'Nicht gefunden — Eat This',
  robots: { index: false, follow: false },
};

// Locale-scoped 404. The [locale]/layout.tsx wraps this with html/body
// + i18n provider, so we only render the inner card here.
//
// Note: next-intl + dynamic params makes reading the locale unreliable
// inside not-found, so we just default the home link to "/" — middleware
// will redirect English users back to /en if they land there.
export default function LocaleNotFound() {
  return <NotFoundContent homeHref="/" />;
}
