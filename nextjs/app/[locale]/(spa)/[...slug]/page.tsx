import SPAShell from '../SPAShell'

interface PageProps {
  params: Promise<{ slug: string[] }>
}

// Catch-all for SPA routes: /map, /musts, /news, /profile, /about, etc.
// The vanilla-JS app handles client-side routing after the shell loads.
// More-specific routes (/news/[slug], /restaurant/[slug]) take priority.
export default async function SPACatchAllPage({ params }: PageProps) {
  const { slug } = await params
  const activePage = slug?.[0] ?? 'start'
  return <SPAShell activePage={activePage} />;
}
