import { notFound } from 'next/navigation'
import type { Metadata, Viewport } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { SITE_URL } from '@/lib/constants'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
import { getAllNewsArticles, getAllStaticPages } from '@/lib/sanity.server'
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>
}

// Whitelist of slugs this catch-all renders. Anything else 404s instead of
// silently dropping the user on the home view. /profile is dispatched by the
// dedicated /[locale]/profile/page.tsx route — it never reaches this catch-all.
const VALID_SLUGS = new Set([
  'map',
  'must-eats',
  'news',
  'about',
  'contact',
  'impressum',
  'datenschutz',
  'agb',
])

const STATIC_SLUGS = new Set(['about', 'contact', 'impressum', 'datenschutz', 'agb'])

type SlugMeta = {
  de: { title: string; description: string }
  en: { title: string; description: string }
  noIndex?: boolean
}

const PAGE_META: Record<string, SlugMeta> = {
  map: {
    de: { title: 'Karte', description: 'Interaktive Karte aller Eat-This-Restaurants und Must Eats in Berlin.' },
    en: { title: 'Map', description: 'Interactive map of every Eat This restaurant and Must Eat in Berlin.' },
    noIndex: true,
  },
  'must-eats': {
    de: { title: 'Must Eats', description: 'Die Must Eats von Eat This — die Gerichte, die du in Berlin nicht verpassen darfst.' },
    en: { title: 'Must Eats', description: "Eat This Must Eats — the dishes you can't miss in Berlin." },
    noIndex: true,
  },
  news: {
    de: { title: 'News', description: 'Aktuelle Restaurant-News, Empfehlungen und Storys aus Berlins Food-Szene.' },
    en: { title: 'News', description: "Latest restaurant news, recommendations and stories from Berlin's food scene." },
  },
  about: {
    de: { title: 'Über uns', description: 'Was Eat This ist, wer dahinter steckt und warum wir Berlins Restaurants kuratieren – plus Remy, unsere KI-Suche für deinen nächsten Spot.' },
    en: { title: 'About', description: "What Eat This is, who's behind it, why we curate Berlin's restaurants – plus Remy, our AI search for your next spot." },
  },
  contact: {
    de: { title: 'Kontakt', description: 'Kontaktiere das Eat-This-Team für Anfragen, Kooperationen oder Feedback.' },
    en: { title: 'Contact', description: 'Get in touch with the Eat This team for inquiries, partnerships or feedback.' },
    noIndex: true,
  },
  impressum: {
    de: { title: 'Impressum', description: 'Impressum und rechtliche Angaben zu Eat This Berlin.' },
    en: { title: 'Imprint', description: 'Imprint and legal information for Eat This Berlin.' },
    noIndex: true,
  },
  datenschutz: {
    de: { title: 'Datenschutz', description: 'Datenschutzerklärung von Eat This Berlin.' },
    en: { title: 'Privacy', description: 'Privacy policy for Eat This Berlin.' },
    noIndex: true,
  },
  agb: {
    de: { title: 'AGB', description: 'Allgemeine Geschäftsbedingungen von Eat This Berlin.' },
    en: { title: 'Terms', description: 'Terms and conditions for Eat This Berlin.' },
    noIndex: true,
  },
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const top = slug?.[0]
  if (!top || !PAGE_META[top]) return {}

  const meta = PAGE_META[top]
  const copy = locale === 'en' ? meta.en : meta.de
  const path = `/${top}`
  const alternates = buildHreflangAlternates(path, locale === 'en' ? 'en' : 'de')

  return {
    title: copy.title,
    description: copy.description,
    robots: meta.noIndex ? 'noindex,follow' : 'index,follow',
    alternates,
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: alternates.canonical,
      type: 'website',
      images: [{ url: `${SITE_URL}/pics/og-card.png?v=4`, width: 1200, height: 1200, alt: 'EAT THIS – We tell you what to eat' }],
      locale: toOgLocale(locale === 'en' ? 'en' : 'de'),
    },
  }
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  const { slug } = await params
  return {
    themeColor: slug?.[0] === 'map' ? '#171A17' : '#e8b626',
  }
}

// Catch-all for SPA routes: /map, /news, /about, etc. Each top-slug renders
// only its own section. More-specific routes (/news/[slug], /restaurant/[slug])
// take priority via Next.js routing precedence.
export default async function SPACatchAllPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const top = slug?.[0]
  if (!top || !VALID_SLUGS.has(top)) notFound()

  if (top === 'news') {
    const [{ default: NewsSection }, articles] = await Promise.all([
      import('@/app/components/NewsSection'),
      getAllNewsArticles(),
    ])
    return <NewsSection articles={articles} locale={locale as 'de' | 'en'} />
  }
  if (top === 'map') {
    // SSR the anon-tier set so spots are in the HTML from byte 0; signed-in
    // users refetch /api/map-data on mount for their +20 + entitlement union.
    const [{ default: MapSection }, initialMapData] = await Promise.all([
      import('@/app/components/MapSection'),
      getInitialAnonMapData(),
    ])
    return <MapSection isActive initialMapData={initialMapData} />
  }
  if (top === 'must-eats') {
    const [{ default: MustEatsSection }, initialMapData] = await Promise.all([
      import('@/app/components/MustEatsSection'),
      getInitialAnonMapData(),
    ])
    return <MustEatsSection initialMapData={initialMapData} locale={locale as 'de' | 'en'} />
  }

  if (STATIC_SLUGS.has(top)) {
    const [{ default: StaticPages }, pages] = await Promise.all([
      import('@/app/components/StaticPages'),
      getAllStaticPages(),
    ])
    return <StaticPages pages={pages} activeSlug={top} />
  }

  notFound()
}
