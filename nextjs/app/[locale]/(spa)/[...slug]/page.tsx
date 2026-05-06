import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { SITE_URL } from '@/lib/constants'
import { getAllNewsArticles, getAllStaticPages } from '@/lib/sanity.server'
import NewsSection from '@/app/components/NewsSection'
import MapSection from '@/app/components/MapSection'
import StaticPages from '@/app/components/StaticPages'

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>
}

// Whitelist of slugs this catch-all renders. Anything else 404s instead of
// silently dropping the user on the home view. /profile is dispatched by the
// dedicated /[locale]/profile/page.tsx route — it never reaches this catch-all.
const VALID_SLUGS = new Set([
  'map',
  'news',
  'about',
  'contact',
  'press',
  'impressum',
  'datenschutz',
  'agb',
])

const STATIC_SLUGS = new Set(['about', 'contact', 'press', 'impressum', 'datenschutz', 'agb'])

type SlugMeta = {
  de: { title: string; description: string }
  en: { title: string; description: string }
  noIndex?: boolean
}

const PAGE_META: Record<string, SlugMeta> = {
  map: {
    de: { title: 'Karte', description: 'Interaktive Karte aller Eat-This-Restaurants und Must-Eats in Berlin.' },
    en: { title: 'Map', description: 'Interactive map of every Eat This restaurant and Must Eat in Berlin.' },
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
  },
  press: {
    de: { title: 'Presse', description: 'Presse, Erwähnungen und Pressekontakt von Eat This Berlin.' },
    en: { title: 'Press', description: 'Press coverage, mentions and press contact for Eat This Berlin.' },
  },
  impressum: {
    de: { title: 'Impressum', description: 'Impressum und rechtliche Angaben zu Eat This Berlin.' },
    en: { title: 'Imprint', description: 'Imprint and legal information for Eat This Berlin.' },
  },
  datenschutz: {
    de: { title: 'Datenschutz', description: 'Datenschutzerklärung von Eat This Berlin.' },
    en: { title: 'Privacy', description: 'Privacy policy for Eat This Berlin.' },
  },
  agb: {
    de: { title: 'AGB', description: 'Allgemeine Geschäftsbedingungen von Eat This Berlin.' },
    en: { title: 'Terms', description: 'Terms and conditions for Eat This Berlin.' },
  },
}

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
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
    robots: meta.noIndex ? 'noindex,nofollow' : 'index,follow',
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
  if (top === 'map') return <MapSection isActive />

  if (STATIC_SLUGS.has(top)) {
    const pages = await getAllStaticPages()
    return <StaticPages pages={pages} activeSlug={top} />
  }

  notFound()
}
