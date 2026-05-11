import { serializeJsonLd } from './serialize'
import { localeUrl } from '@/lib/locale-url'
import type { BezirkDoc, RestaurantCard } from '@/lib/types'
import type { FAQEntry } from '@/lib/restaurant-prose'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'

interface BuildBezirkJsonLdArgs {
  bezirk: Pick<BezirkDoc, 'name' | 'slug'>
  restaurants: RestaurantCard[]
  locale: string
  // Localized label for the "Bezirke" / "Districts" breadcrumb hub.
  districtsLabel: string
  // Auto-generated FAQs shown on the page — mirrored into a FAQPage entity
  // so Google can pick them up for FAQ rich snippets. Omit/empty to skip.
  faqs?: FAQEntry[]
}

// Builds the BreadcrumbList + ItemList<Restaurant> JSON-LD graph for a
// bezirk detail page and returns it as a sanitized string ready for inline
// `<script type="application/ld+json">` injection.
export function buildBezirkJsonLd({
  bezirk,
  restaurants,
  locale,
  districtsLabel,
  faqs,
}: BuildBezirkJsonLdArgs): string {
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
      ...(faqEntity ? [faqEntity] : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Eat This Berlin', item: localeUrl(locale, '/') },
          { '@type': 'ListItem', position: 2, name: districtsLabel, item: localeUrl(locale, '/bezirk') },
          { '@type': 'ListItem', position: 3, name: bezirk.name, item: localeUrl(locale, `/bezirk/${bezirk.slug}`) },
        ],
      },
      {
        '@type': 'ItemList',
        name: `Restaurants in ${bezirk.name}`,
        numberOfItems: restaurants.length,
        itemListElement: restaurants.map((r, i) => {
          const priceLabel = formatPriceLabel(r)
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Restaurant',
              name: r.name,
              url: localeUrl(locale, `/restaurant/${r.slug}`),
              ...(r.cuisineType && { servesCuisine: r.cuisineType }),
              ...(priceLabel && { priceRange: priceLabel }),
            },
          }
        }),
      },
    ],
  })
}
