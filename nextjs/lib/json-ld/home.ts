import { serializeJsonLd } from './serialize';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { localeUrl } from '@/lib/locale-url';
import type { LandingFaqEntry } from '@/lib/landing/faqs';

// Prefer the square card for search thumbnails. Open Graph uses the wide card
// for link previews.
const WIDE_IMAGE_URL = `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`;
const SQUARE_IMAGE_URL = `${SITE_URL}/pics/og-card-square.png?v=${OG_CARD_VERSION}`;

// Builds the home page JSON-LD graph: a WebPage node carrying the representative
// image, plus the FAQPage that mirrors the FAQ entries the hub renders so Google
// can pick them up for rich snippets. Organization + WebSite live in the
// site-wide `schema-org` graph emitted by app/[locale]/layout.tsx; we only
// reference the WebSite by @id here (don't redefine it — duplicate @ids).
export function buildHomeJsonLd(faqs: LandingFaqEntry[], locale: 'de' | 'en' = 'de'): string {
  const pageUrl = localeUrl(locale, '/');
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
        primaryImageOfPage: { '@id': `${SITE_URL}/#squareimage` },
        image: [{ '@id': `${SITE_URL}/#squareimage` }, { '@id': `${SITE_URL}/#wideimage` }],
      },
      {
        '@type': 'ImageObject',
        '@id': `${SITE_URL}/#wideimage`,
        url: WIDE_IMAGE_URL,
        contentUrl: WIDE_IMAGE_URL,
        width: 1200,
        height: 630,
        caption: 'EAT THIS – We tell you what to eat',
      },
      {
        '@type': 'ImageObject',
        '@id': `${SITE_URL}/#squareimage`,
        url: SQUARE_IMAGE_URL,
        contentUrl: SQUARE_IMAGE_URL,
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
  });
}
