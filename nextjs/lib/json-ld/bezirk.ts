import { serializeJsonLd } from './serialize';
import { buildWebPageNodes } from './webpage';
import { localeUrl } from '@/lib/locale-url';
import { schemaImageUrl } from '@/lib/sanity-image-presets';
import type { BezirkDoc, RestaurantCard } from '@/lib/types';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';

interface BuildBezirkJsonLdArgs {
  bezirk: Pick<BezirkDoc, 'name' | 'slug'>;
  restaurants: RestaurantCard[];
  locale: string;
  // Localized label for the "Bezirke" / "Districts" breadcrumb hub.
  districtsLabel: string;
}

// Builds the WebPage + BreadcrumbList + ItemList<Restaurant> JSON-LD graph for
// a bezirk detail page and returns it as a sanitized string ready for inline
// `<script type="application/ld+json">` injection.
export function buildBezirkJsonLd({
  bezirk,
  restaurants,
  locale,
  districtsLabel,
}: BuildBezirkJsonLdArgs): string {
  const pageUrl = localeUrl(locale, `/bezirk/${bezirk.slug}`);
  // The first listed photo — the first real picture a visitor sees anyway.
  // Restaurant photos are licence-gated upstream, so `find` may come back
  // empty — then the page ships without an ImageObject rather than with the
  // brand card.
  const primaryImage = schemaImageUrl(restaurants.find((r) => r.photo)?.photo);

  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      ...buildWebPageNodes({
        pageUrl,
        locale: locale === 'en' ? 'en' : 'de',
        image: primaryImage,
        caption: `Restaurants in ${bezirk.name}`,
      }),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Eat This Berlin',
            item: localeUrl(locale, '/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: districtsLabel,
            item: localeUrl(locale, '/bezirk'),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: bezirk.name,
            item: localeUrl(locale, `/bezirk/${bezirk.slug}`),
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: `Restaurants in ${bezirk.name}`,
        numberOfItems: restaurants.length,
        itemListElement: restaurants.map((r, i) => {
          const priceLabel = formatPriceLabel(r, locale);
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Restaurant',
              name: r.name,
              url: localeUrl(locale, `/restaurant/${r.slug}`),
              // `photo` is already gated on a publishable licence (see
              // publishableRestaurantImageUrl) — undefined means we may not
              // show it, so the spread drops the key rather than emitting a
              // URL we have no right to hand Google.
              ...(r.photo && { image: schemaImageUrl(r.photo) }),
              ...(r.cuisineType && { servesCuisine: r.cuisineType }),
              ...(priceLabel && { priceRange: priceLabel }),
            },
          };
        }),
      },
    ],
  });
}
