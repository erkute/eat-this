import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import SPAShell from '../SPAShell'

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>
}

// Whitelist of slugs the SPAShell knows how to render. Anything else
// triggers a real 404 instead of silently rendering the home view.
const VALID_SLUGS = new Set([
  'map',
  'musts',
  'news',
  'profile',
  'about',
  'contact',
  'press',
  'impressum',
  'datenschutz',
  'agb',
])

// Catch-all for SPA routes: /map, /musts, /profile, /about, etc.
// More-specific routes (/news/[slug], /restaurant/[slug]) take priority.
export default async function SPACatchAllPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const top = slug?.[0]
  if (!top || !VALID_SLUGS.has(top)) notFound()

  return <SPAShell activePage={top} />
}
