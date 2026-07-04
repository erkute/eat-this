import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import NotFoundAppFrame from '../components/NotFoundAppFrame';
import NotFoundContent from '../components/NotFoundContent';

export const metadata: Metadata = {
  title: '404 — Eat This',
  robots: { index: false, follow: false },
};

// Locale-scoped 404. The [locale]/layout.tsx wraps this with html/body
// + i18n provider, so we only render the inner card here.
export default async function LocaleNotFound() {
  const locale = await getLocale();

  return (
    <NotFoundAppFrame>
      <NotFoundContent locale={locale === 'en' ? 'en' : 'de'} />
    </NotFoundAppFrame>
  );
}
