import { serializeJsonLd } from './serialize'
import { SITE_URL } from '@/lib/constants'
import type { Restaurant } from '@/lib/types'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'

interface BuildRestaurantJsonLdArgs {
  restaurant: Restaurant
  locale: string
  slug: string
  // Locale-resolved description copy from the page (shortDescription /
  // description / tip in the active locale, picked by the caller).
  description: string | undefined
  // Localized label for the "Bezirke" / "Districts" breadcrumb hub.
  districtsLabel: string
}

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
}

// Builds the Restaurant + BreadcrumbList JSON-LD graph for a restaurant
// detail page and returns it as a sanitized string ready for inline
// `<script type="application/ld+json">` injection. The </ → <\/ escape
// inside `serializeJsonLd` is what makes this safe.
export function buildRestaurantJsonLd({
  restaurant: r,
  locale,
  slug,
  description,
  districtsLabel,
}: BuildRestaurantJsonLdArgs): string {
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Restaurant',
        name: r.name,
        description,
        image: r.photo,
        priceRange: formatPriceLabel(r) || undefined,
        // schema.org expects strings; prefer EN labels (canonical for crawlers).
        servesCuisine: r.categories?.map(c => c.nameEn || c.name).filter(Boolean),
        url: r.website,
        hasMap: r.mapsUrl,
        ...(r.address && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: r.address,
            addressLocality: 'Berlin',
            addressCountry: 'DE',
          },
        }),
        ...(r.lat != null && r.lng != null && {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: r.lat,
            longitude: r.lng,
          },
        }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Eat This Berlin', item: localeUrl(locale, '/') },
          ...(r.bezirk?.slug && r.bezirk?.name
            ? [
                { '@type': 'ListItem', position: 2, name: districtsLabel, item: localeUrl(locale, '/bezirk') },
                { '@type': 'ListItem', position: 3, name: r.bezirk.name, item: localeUrl(locale, `/bezirk/${r.bezirk.slug}`) },
                { '@type': 'ListItem', position: 4, name: r.name, item: localeUrl(locale, `/restaurant/${slug}`) },
              ]
            : [
                { '@type': 'ListItem', position: 2, name: r.name, item: localeUrl(locale, `/restaurant/${slug}`) },
              ]),
        ],
      },
    ],
  })
}
