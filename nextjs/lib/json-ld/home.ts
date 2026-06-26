import { serializeJsonLd } from './serialize'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import type { LandingFaqEntry } from '@/lib/landing/faqs'

// The brand share card (yellow EAT THIS mark). Same asset the og:image points
// at — declaring it as the page's primaryImageOfPage gives Google a structured,
// crawlable hint for the SERP/Discover thumbnail. Without it Google free-picks
// a random restaurant photo from the image-rich hub (it's not obliged to honour
// og:image for thumbnails), which is why the home thumbnail looked off.
const PRIMARY_IMAGE_URL = `${SITE_URL}/pics/og-card.png?v=4`

// Builds the home page JSON-LD graph: a WebPage node carrying the representative
// image, plus the FAQPage that mirrors the FAQ entries the hub renders so Google
// can pick them up for rich snippets. Organization + WebSite live in the
// site-wide `schema-org` graph emitted by app/[locale]/layout.tsx; we only
// reference the WebSite by @id here (don't redefine it — duplicate @ids).
export function buildHomeJsonLd(faqs: LandingFaqEntry[], locale: 'de' | 'en' = 'de'): string {
  const pageUrl = localeUrl(locale, '/')
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: 'EAT THIS – Food Map',
        inLanguage: locale === 'de' ? 'de-DE' : 'en-US',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        primaryImageOfPage: { '@id': `${SITE_URL}/#primaryimage` },
        image: { '@id': `${SITE_URL}/#primaryimage` },
      },
      {
        '@type': 'ImageObject',
        '@id': `${SITE_URL}/#primaryimage`,
        url: PRIMARY_IMAGE_URL,
        contentUrl: PRIMARY_IMAGE_URL,
        width: 1200,
        height: 1200,
        caption: 'EAT THIS – We tell you what to eat',
      },
      ...(faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: faqs.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
              })),
            },
          ]
        : []),
    ],
  })
}
