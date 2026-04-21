import { spaBodyHTML } from '../spa-content'

// Catch-all for SPA routes: /map, /musts, /news, /profile, /about, etc.
// The vanilla-JS app handles client-side routing after the shell loads.
// More-specific routes (/news/[slug], /restaurant/[slug]) take priority.
export default function SPACatchAllPage() {
  // eslint-disable-next-line react/no-danger
  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: spaBodyHTML }} />
}
