import 'maplibre-gl/dist/maplibre-gl.css'

import type { Metadata, Viewport } from 'next'
import { Saira_Condensed } from 'next/font/google'
import { setRequestLocale } from 'next-intl/server'
import { SITE_URL } from '@/lib/constants'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data'

const sairaCondensed = Saira_Condensed({
  weight: ['700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-saira-condensed',
})

export const revalidate = 3600

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const en = locale === 'en'
  const copy = en
    ? { title: 'Map', description: 'Interactive map of every Eat This restaurant and Must Eat in Berlin.' }
    : { title: 'Karte', description: 'Interaktive Karte aller Eat-This-Restaurants und Must Eats in Berlin.' }
  const alternates = buildHreflangAlternates('/map', en ? 'en' : 'de')

  return {
    title: copy.title,
    description: copy.description,
    robots: 'noindex,follow',
    alternates,
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: alternates.canonical,
      type: 'website',
      images: [{ url: `${SITE_URL}/pics/og-card.png?v=4`, width: 1200, height: 1200, alt: 'EAT THIS - We tell you what to eat' }],
      locale: toOgLocale(en ? 'en' : 'de'),
    },
  }
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  await params
  return {
    themeColor: '#15120e',
  }
}

export default async function MapPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const [{ default: MapSection }, initialMapData] = await Promise.all([
    import('@/app/components/MapSection'),
    getInitialAnonMapData(),
  ])

  return (
    <MapSection
      isActive
      initialMapData={initialMapData}
      fontClassName={sairaCondensed.variable}
    />
  )
}
