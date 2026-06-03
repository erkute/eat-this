import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { localeUrl } from '@/lib/locale-url'
import HubSection from '@/app/components/HubSection'
import { getHomeData } from '@/lib/home/getHomeData'
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ locale: string }>
}

// The Hub is the site's home page, served natively at `/` (DE) and `/en`.
// Title/description/robots/OpenGraph are inherited from the (spa) layout's
// brand-level metadata (index,follow); here we only add the self-canonical +
// hreflang alternates that the layout can't express per-locale.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return {
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

  return (
    <HubSection
      initialData={initialData}
      initialMapData={initialMapData}
      locale={locale as 'de' | 'en'}
    />
  )
}
