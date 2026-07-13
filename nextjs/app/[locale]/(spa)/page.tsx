import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { localeUrl } from '@/lib/locale-url'
import { buildHreflangAlternates } from '@/lib/seo/metadata'
import HubSection from '@/app/components/HubSection'
import { getHomeData } from '@/lib/home/getHomeData'
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data'
import { selectHomeInitialMapData } from '@/lib/map/initial-surface-data'
import { buildHomeJsonLd } from '@/lib/json-ld'
import { getLandingFaqs } from '@/lib/landing/faqs'

// Public Must-Eat previews are hydrated from the private store only after the
// request-time reveal policy is known. Do not pre-render them in CI/builds,
// where no runtime service account exists.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ locale: string }>
}

// EN title/description for `/en` — the (spa) layout's brand-level metadata is
// German and stays the default for `/`.
const EN_TITLE = 'EAT THIS – Restaurants & Hidden Gems'
const EN_DESCRIPTION =
  'We tell you what to eat — the curated food map with the best restaurants, cafés and bars in Berlin. Plus exclusive Must Eats on the interactive map.'

// The Hub is the site's home page, served natively at `/` (DE) and `/en`.
// Robots/OpenGraph base config is inherited from the (spa) layout's
// brand-level metadata (index,follow); here we add the self-canonical +
// hreflang alternates the layout can't express per-locale, and override
// title/description/OG for the English home.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  const en = locale === 'en'
  return {
    ...(en && {
      title: { absolute: EN_TITLE },
      description: EN_DESCRIPTION,
      openGraph: {
        title: EN_TITLE,
        description: EN_DESCRIPTION,
        url: localeUrl('en', '/'),
        locale: 'en_US',
      },
      twitter: { title: EN_TITLE, description: EN_DESCRIPTION },
    }),
    alternates: buildHreflangAlternates('/', en ? 'en' : 'de'),
  }
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  // Dotted paths (/news-sitemap.xml, /foo.txt, …) bypass the next-intl
  // middleware (matcher excludes them), so this page renders with the raw
  // first segment as `locale`. The [locale] layout's notFound() doesn't
  // preempt the page (they render concurrently) — guard here too, or the
  // data fetches below crash with a 500 instead of a clean 404.
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  // The hub's client islands (HubNearby) reuse the map's anon dataset, so SSR
  // both in parallel and hand initialMapData down through HubSection.
  const [initialData, fullInitialMapData] = await Promise.all([
    getHomeData(locale as 'de' | 'en'),
    getInitialAnonMapData(),
  ])
  const initialMapData = selectHomeInitialMapData(fullInitialMapData)

  // WebPage (representative image) + FAQPage graph — the FAQ entries mirror what
  // the hub renders (HubFaq uses the same getLandingFaqs source). Organization/
  // WebSite come from the site-wide schema-org script in the locale layout.
  const jsonLd = buildHomeJsonLd(getLandingFaqs(locale as 'de' | 'en'), locale as 'de' | 'en')

  return (
    <>
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
  )
}
