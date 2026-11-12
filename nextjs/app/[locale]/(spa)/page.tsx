import { getPackContents } from '@/lib/sanity.server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates } from '@/lib/seo/metadata';
import HubSection from '@/app/components/HubSection';
import { getHomeData } from '@/lib/home/getHomeData';
import { getHomeInitialMapData } from '@/lib/map/server-initial-map-data';
import { buildHomeJsonLd } from '@/lib/json-ld';
import { getLandingFaqs } from '@/lib/landing/faqs';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';

// Public Must-Eat previews are hydrated from the private store only after the
// request-time reveal policy is known. Do not pre-render them in CI/builds,
// where no runtime service account exists.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const TITLE = {
  de: 'Restaurants, Cafés & Bars in Berlin | EAT THIS',
  en: 'eat this. | We know where to eat in Berlin',
} as const;
const DESCRIPTION = {
  de: 'Pizza bei Gazzo, Kaffee bei Kolo. Entdecke Restaurants, Cafés und Bars auf unserer Berlin Food Map. Unsere Lieblingsgerichte gibt’s als Must-Eat-Karten zum Sammeln.',
  en: 'Pizza at Gazzo, coffee at Kolo. Discover restaurants, cafés and bars on our Berlin Food Map. Our favorite dishes are featured on collectible Must Eat cards.',
};
const OG_IMAGE = `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const description = DESCRIPTION[locale];
  const title = TITLE[locale];
  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: 'website',
      siteName: 'EAT THIS',
      title,
      description,
      url: localeUrl(locale, '/'),
      locale: locale === 'en' ? 'en_US' : 'de_DE',
      images: [
        { url: OG_IMAGE, width: 1200, height: 630, alt: 'EAT THIS – We tell you what to eat' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@eatthisdotcom',
      title,
      description,
      images: [OG_IMAGE],
    },
    alternates: buildHreflangAlternates('/', locale),
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  // Dotted paths (/sitemap.xml, /foo.txt, …) bypass the next-intl
  // middleware (matcher excludes them), so this page renders with the raw
  // first segment as `locale`. The [locale] layout's notFound() doesn't
  // preempt the page (they render concurrently) — guard here too, or the
  // data fetches below crash with a 500 instead of a clean 404.
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Render the magazine and the public card teaser from Sanity in parallel.
  // The teaser receives five open cards and one covered card, with their
  // embedded spot details; map-only collections stay on the server.
  const [initialData, initialMapData, { allBerlin }] = await Promise.all([
    getHomeData(locale as 'de' | 'en'),
    getHomeInitialMapData(),
    getPackContents(),
  ]);

  // WebPage (representative image) + FAQPage graph — the FAQ entries mirror what
  // the hub renders (HubFaq uses the same getLandingFaqs source). Organization/
  // WebSite come from the site-wide schema-org script in the locale layout.
  const jsonLd = buildHomeJsonLd(getLandingFaqs(locale as 'de' | 'en', allBerlin.mustEats), locale as 'de' | 'en');

  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/pics/home/silver-hero/hero-paper.webp?v=20261103"
        media="not all and (max-width: 767px) and (orientation: portrait)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/pics/home/silver-hero/hero-paper-phone.webp?v=20261104"
        media="(max-width: 767px) and (orientation: portrait)"
        fetchPriority="high"
      />
      {jsonLd && (
        <script
          id={`schema-home-${locale}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <HubSection
        initialData={initialData}
        initialMapData={initialMapData}
        locale={locale as 'de' | 'en'}
      />
    </>
  );
}
