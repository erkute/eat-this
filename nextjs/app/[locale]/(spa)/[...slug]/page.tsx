import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import { getAllNewsArticles, getAllStaticPages } from '@/lib/sanity.server'
import NewsSection from '@/app/components/NewsSection'
import MapSection from '@/app/components/MapSection'
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data'
import StaticPages from '@/app/components/StaticPages'
import MustEatsSection from '@/app/components/MustEatsSection'

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
    de: { title: 'Über uns', description: 'Was Eat This ist, wer dahinter steckt und warum wir Berlins Restaurants kuratieren.' },
    en: { title: 'About', description: "What Eat This is, who's behind it, and why we curate Berlin's restaurants." },
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
  const canonical = localeUrl(locale, path)

  return {
    title: copy.title,
    description: copy.description,
    robots: meta.noIndex ? 'noindex,follow' : 'index,follow',
    alternates: {
      canonical,
      languages: {
        de: localeUrl('de', path),
        en: localeUrl('en', path),
        'x-default': localeUrl('de', path),
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      type: 'website',
      images: [{ url: `${SITE_URL}/pics/og-card.png?v=4`, width: 1200, height: 1200, alt: 'EAT THIS – We tell you what to eat' }],
      locale: locale === 'de' ? 'de_DE' : 'en_US',
    },
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
    const articles = await getAllNewsArticles()
    return <NewsSection articles={articles} locale={locale as 'de' | 'en'} />
  }
  if (top === 'map') {
    // SSR the anon-tier set so spots are in the HTML from byte 0; signed-in
    // users refetch /api/map-data on mount for their +20 + entitlement union.
    const initialMapData = await getInitialAnonMapData()
    return <MapSection isActive initialMapData={initialMapData} />
  }
  if (top === 'must-eats') {
    const initialMapData = await getInitialAnonMapData()
    return <MustEatsSection initialMapData={initialMapData} locale={locale as 'de' | 'en'} />
  }

  if (STATIC_SLUGS.has(top)) {
    const pages = await getAllStaticPages()
    return <StaticPages pages={pages} activeSlug={top} />
  }

  notFound()
}
