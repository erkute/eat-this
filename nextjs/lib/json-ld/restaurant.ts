import { serializeJsonLd } from './serialize'
import { localeUrl } from '@/lib/locale-url'
import type { Restaurant } from '@/lib/types'
import type { FAQEntry } from '@/lib/restaurant-prose'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import { buildOpeningHoursSpec } from '@/lib/map/openingHours'

interface BuildRestaurantJsonLdArgs {
  restaurant: Restaurant
  locale: string
  slug: string
  // Locale-resolved description copy from the page (shortDescription /
  // description / tip in the active locale, picked by the caller).
  description: string | undefined
  // Localized label for the "Bezirke" / "Districts" breadcrumb hub.
  districtsLabel: string
  // Auto-generated FAQs shown on the page — mirrored into a FAQPage entity
  // so Google can pick them up for FAQ rich snippets. Omit/empty to skip.
  faqs?: FAQEntry[]
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
  faqs,
}: BuildRestaurantJsonLdArgs): string {
  const openingHours = r.openingHours ? buildOpeningHoursSpec(r.openingHours) : []

  // The Restaurant entity's canonical URL/@id must be OUR detail page, not the
  // venue's own website — that belongs in `sameAs`. This gives the entity a
  // stable, locale-tagged identity that DE/EN pages can both reference.
  const selfUrl = localeUrl(locale, `/restaurant/${slug}`)
  const sameAs = [
    r.website,
    r.instagramHandle && `https://www.instagram.com/${r.instagramHandle.replace(/^@/, '')}/`,
  ].filter((x): x is string => Boolean(x))

  const faqEntity =
    faqs && faqs.length > 0
      ? {
          '@type': 'FAQPage',
          mainEntity: faqs.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          })),
        }
      : null

  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Restaurant',
        '@id': `${selfUrl}#restaurant`,
        name: r.name,
        description,
        inLanguage: locale === 'de' ? 'de-DE' : 'en-US',
        image: r.photo,
        priceRange: formatPriceLabel(r) || undefined,
        // schema.org expects strings; prefer EN labels (canonical for crawlers).
        servesCuisine: r.categories?.map(c => c.nameEn || c.name).filter(Boolean),
        url: selfUrl,
        hasMap: r.mapsUrl,
        // Official menu URL — schema.org Restaurant.hasMenu accepts a URL;
        // pairs with the on-page "Was bestellen?" block.
        ...(r.menuUrl && { hasMenu: r.menuUrl }),
        // schema.org allows a reservation URL here, not just a boolean —
        // richer signal for crawlers when we have one.
        ...(r.reservationUrl && { acceptsReservations: r.reservationUrl }),
        ...(sameAs.length > 0 && { sameAs }),
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
        ...(openingHours.length > 0 && { openingHoursSpecification: openingHours }),
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
      ...(faqEntity ? [faqEntity] : []),
    ],
  })
}
