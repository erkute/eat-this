import { BRAND_LOGO, SITE_URL } from '@/lib/constants';
import { serializeJsonLd } from './serialize';

export function buildSiteJsonLd(locale: 'de' | 'en'): string {
  const de = locale === 'de';
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'eat this.',
        // The bare name is contested — eat-this.org has run under it since
        // 2013, and "Eat This, Not That" owns it in the US. These are the
        // forms people actually type for *this* brand; naming them is how
        // Google learns which entity the site is.
        alternateName: ['EAT THIS', 'Eat This Berlin', 'EAT THIS Berlin', 'eatthisdot'],
        url: SITE_URL,
        description: de
          ? 'Kuratierte Restaurant-Empfehlungen, Food-Guides und Must Eats für Berlin.'
          : 'Curated restaurant recommendations, food guides and Must Eats for Berlin.',
        areaServed: { '@type': 'City', name: 'Berlin' },
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}${BRAND_LOGO.src}`,
          width: BRAND_LOGO.width,
          height: BRAND_LOGO.height,
        },
        sameAs: ['https://www.instagram.com/eatthisdotcom/'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'eat this.',
        alternateName: ['EAT THIS', 'Eat This Berlin'],
        url: SITE_URL,
        inLanguage: de ? 'de-DE' : 'en-US',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  });
}
