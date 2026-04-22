import { setRequestLocale } from 'next-intl/server'
import SPAShell from '../SPAShell'

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>
}

// Catch-all for SPA routes: /map, /musts, /news, /profile, /about, etc.
// More-specific routes (/news/[slug], /restaurant/[slug]) take priority.
export default async function SPACatchAllPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const activePage = slug?.[0] ?? 'start'
  return <SPAShell activePage={activePage} />
}
