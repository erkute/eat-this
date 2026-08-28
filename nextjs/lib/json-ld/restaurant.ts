import { serializeJsonLd } from './serialize';
import { buildWebPageNodes } from './webpage';
import { localeUrl } from '@/lib/locale-url';
import type { Restaurant } from '@/lib/types';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { buildOpeningHoursSpec } from '@/lib/map/openingHours';

interface BuildRestaurantJsonLdArgs {
  restaurant: Restaurant;
  locale: string;
  slug: string;
  // Locale-resolved description copy from the page (shortDescription /
  // description / tip in the active locale, picked by the caller).
  description: string | undefined;
  // Localized label for the "Bezirke" / "Districts" breadcrumb hub.
  districtsLabel: string;
}

// cuisineType mischt zwei Sorten Werte: echte Küchen ("Japanese", "Italian")
// und Betriebstypen ("Bakery", "Wine Bar"). Für die Betriebstypen ist
// `@type: Restaurant` + `servesCuisine: "Bakery"` doppelt schief — eine
// Bäckerei ist kein Restaurant, und „Bakery" ist keine Küche. schema.org hat
// für alle den passenden FoodEstablishment-Subtyp; die Küchen-Werte bleiben
// Restaurant mit servesCuisine.
const VENUE_SCHEMA_TYPES: Record<string, string> = {
  Bakery: 'Bakery',
  Bar: 'BarOrPub',
  'Wine Bar': 'BarOrPub',
  Café: 'CafeOrCoffeeShop',
  Coffee: 'CafeOrCoffeeShop',
  'Ice Cream': 'IceCreamShop',
  'German / Fast Food': 'FastFoodRestaurant',
};

function schemaTypeFor(cuisineType: string | undefined): string {
  return (cuisineType && VENUE_SCHEMA_TYPES[cuisineType]) || 'Restaurant';
}

function servesCuisineFor(cuisineType: string | undefined): string | undefined {
  if (!cuisineType) return undefined;
  // Der Imbiss ist der einzige Mischwert: Typ FastFoodRestaurant, Küche German.
  if (cuisineType === 'German / Fast Food') return 'German';
  return VENUE_SCHEMA_TYPES[cuisineType] ? undefined : cuisineType;
}

function buildPostalAddress(address: string): Record<string, string> {
  const clean = address.trim().replace(/,?\s*Deutschland$/i, '');
  const parts = clean
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const postalIndex = parts.findIndex((part) => /^\d{5}\s+\S/.test(part));
  const postalMatch = postalIndex >= 0 ? parts[postalIndex].match(/^(\d{5})\s+(.+)$/) : null;
  const streetAddress = postalIndex > 0 ? parts.slice(0, postalIndex).join(', ') : clean;
  const addressLocality = postalMatch?.[2]?.trim() || 'Berlin';

  return {
    '@type': 'PostalAddress',
    streetAddress,
    ...(postalMatch?.[1] && { postalCode: postalMatch[1] }),
    addressLocality,
    ...(addressLocality.toLocaleLowerCase('de').includes('berlin') && { addressRegion: 'Berlin' }),
    addressCountry: 'DE',
  };
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
  const openingHours = r.openingHours ? buildOpeningHoursSpec(r.openingHours) : [];

  // The Restaurant entity's canonical URL/@id must be OUR detail page, not the
  // venue's own website — that belongs in `sameAs`. This gives the entity a
  // stable, locale-tagged identity that DE/EN pages can both reference.
  const selfUrl = localeUrl(locale, `/restaurant/${slug}`);
  const sameAs = [
    r.website,
    r.instagramHandle && `https://www.instagram.com/${r.instagramHandle.replace(/^@/, '')}/`,
  ].filter((x): x is string => Boolean(x));

  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      // The Restaurant node already carries the same photo, but that is the
      // entity's picture, not a statement about this page — Google reads
      // primaryImageOfPage for the thumbnail. `r.photo` is the detailHero
      // projection (1200 px), so it is wide enough as it stands.
      ...buildWebPageNodes({
        pageUrl: selfUrl,
        locale: locale === 'en' ? 'en' : 'de',
        image: r.photo,
        caption: r.name,
      }),
      {
        '@type': schemaTypeFor(r.cuisineType),
        // Das Fragment bleibt für alle Subtypen `#restaurant`: die @id ist die
        // stabile Entitäts-Adresse, an der DE/EN-Seiten hängen — sie folgt
        // nicht dem Typ.
        '@id': `${selfUrl}#restaurant`,
        name: r.name,
        description,
        inLanguage: locale === 'de' ? 'de-DE' : 'en-US',
        image: r.photo,
        priceRange: formatPriceLabel(r, locale) || undefined,
        // Explicit cuisine data, not discovery categories such as Breakfast —
        // and only for actual cuisines; venue types carry it in @type instead.
        servesCuisine: servesCuisineFor(r.cuisineType),
        url: selfUrl,
        hasMap: r.mapsUrl,
        // Official menu URL — schema.org Restaurant.hasMenu accepts a URL.
        // Steht für sich: der „Was bestellen?"-Block, auf den der Kommentar
        // hier verwies, ist von der Detailseite entfernt worden.
        ...(r.menuUrl && { hasMenu: r.menuUrl }),
        // schema.org allows a reservation URL here, not just a boolean —
        // richer signal for crawlers when we have one.
        ...(r.reservationUrl && { acceptsReservations: r.reservationUrl }),
        ...(sameAs.length > 0 && { sameAs }),
        ...(r.address && {
          address: buildPostalAddress(r.address),
        }),
        ...(r.lat != null &&
          r.lng != null && {
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
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Eat This Berlin',
            item: localeUrl(locale, '/'),
          },
          ...(r.bezirk?.slug && r.bezirk?.name
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: districtsLabel,
                  item: localeUrl(locale, '/bezirk'),
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: r.bezirk.name,
                  item: localeUrl(locale, `/bezirk/${r.bezirk.slug}`),
                },
                {
                  '@type': 'ListItem',
                  position: 4,
                  name: r.name,
                  item: localeUrl(locale, `/restaurant/${slug}`),
                },
              ]
            : [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: r.name,
                  item: localeUrl(locale, `/restaurant/${slug}`),
                },
              ]),
        ],
      },
    ],
  });
}
