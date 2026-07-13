import type { Metadata, Viewport } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { SITE_URL } from '@/lib/constants'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data'
import { selectInitialMustEatsData } from '@/lib/map/initial-surface-data'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const en = locale === 'en'
  const copy = en
    ? { title: 'Must Eats', description: "Eat This Must Eats - the dishes you can't miss in Berlin." }
    : { title: 'Must Eats', description: 'Die Must Eats von Eat This - die Gerichte, die du in Berlin nicht verpassen darfst.' }
  const alternates = buildHreflangAlternates('/must-eats', en ? 'en' : 'de')

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

export default async function MustEatsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const [{ default: MustEatsSection }, fullInitialMapData] = await Promise.all([
    import('@/app/components/MustEatsSection'),
    getInitialAnonMapData(),
  ])
  const initialMapData = selectInitialMustEatsData(fullInitialMapData)

  return <MustEatsSection initialMapData={initialMapData} locale={locale as 'de' | 'en'} />
}
