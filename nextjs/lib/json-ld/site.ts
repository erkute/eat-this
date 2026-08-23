import { SITE_URL } from '@/lib/constants';
import { serializeJsonLd } from './serialize';

export function buildSiteJsonLd(locale: 'de' | 'en'): string {
  const de = locale === 'de';
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'EAT THIS',
        // The bare name is contested — eat-this.org has run under it since
        // 2013, and "Eat This, Not That" owns it in the US. These are the
        // forms people actually type for *this* brand; naming them is how
        // Google learns which entity the site is.
        alternateName: ['Eat This Berlin', 'EAT THIS Berlin', 'eatthisdot'],
        url: SITE_URL,
        description: de
          ? 'Kuratierte Restaurant-Empfehlungen, Food-Guides und Must Eats für Berlin.'
          : 'Curated restaurant recommendations, food guides and Must Eats for Berlin.',
        areaServed: { '@type': 'City', name: 'Berlin' },
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/pics/logo.webp`,
          width: 512,
          height: 512,
        },
        sameAs: ['https://www.instagram.com/eatthisdotcom/', 'https://www.tiktok.com/@eatthis'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'EAT THIS',
        alternateName: 'Eat This Berlin',
        url: SITE_URL,
        inLanguage: de ? 'de-DE' : 'en-US',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  });
}
