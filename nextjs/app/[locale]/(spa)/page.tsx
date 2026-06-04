import type { Metadata } from 'next'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { localeUrl } from '@/lib/locale-url'
import HubSection from '@/app/components/HubSection'
import { getHomeData } from '@/lib/home/getHomeData'
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data'
import { buildHomeJsonLd } from '@/lib/json-ld'
import { getLandingFaqs } from '@/lib/landing/faqs'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ locale: string }>
}

// EN title/description for `/en` — the (spa) layout's brand-level metadata is
// German and stays the default for `/`.
const EN_TITLE = 'EAT THIS – Berlin Food Guide: Restaurants & Hidden Gems'
const EN_DESCRIPTION =
  'We tell you what to eat — the curated food map with the best restaurants, cafés and bars in Berlin. Plus exclusive Must Eats on the interactive map.'

// The Hub is the site's home page, served natively at `/` (DE) and `/en`.
// Robots/OpenGraph base config is inherited from the (spa) layout's
// brand-level metadata (index,follow); here we add the self-canonical +
// hreflang alternates the layout can't express per-locale, and override
// title/description/OG for the English home.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
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
    alternates: {
      canonical: localeUrl(locale, '/'),
      languages: {
        de: localeUrl('de', '/'),
        en: localeUrl('en', '/'),
        'x-default': localeUrl('de', '/'),
      },
    },
  }
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  // The hub's client islands (HubNearby) reuse the map's anon dataset, so SSR
  // both in parallel and hand initialMapData down through HubSection.
  const [initialData, initialMapData] = await Promise.all([
    getHomeData(locale as 'de' | 'en'),
    getInitialAnonMapData(),
  ])

  // FAQPage graph — mirrors the FAQ entries the hub actually renders (HubFaq
  // uses the same getLandingFaqs source). Organization/WebSite come from the
  // site-wide schema-org script in the locale layout.
  const jsonLd = buildHomeJsonLd(getLandingFaqs(locale as 'de' | 'en'))

  return (
    <>
      {jsonLd && (
        <Script id={`schema-home-${locale}`} type="application/ld+json" strategy="beforeInteractive">
          {jsonLd}
        </Script>
      )}
      <HubSection
        initialData={initialData}
        initialMapData={initialMapData}
        locale={locale as 'de' | 'en'}
      />
    </>
  )
}
