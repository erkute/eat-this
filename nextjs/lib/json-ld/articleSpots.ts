import { localeUrl } from '../locale-url';
import { schemaImageUrl } from '../sanity-image-presets';
import type { PortableTextBlock, SpotCardBlock } from '../types';

interface BuildArticleSpotsItemListArgs {
  /** Die Blöcke der GERENDERTEN Sprachfassung — content bzw. contentDe. */
  blocks: PortableTextBlock[] | undefined;
  locale: string;
  /** Überschrift der Liste, üblicherweise der Artikeltitel. */
  name: string;
}

function isSpotCard(block: PortableTextBlock): block is PortableTextBlock & SpotCardBlock {
  return block._type === 'spotCard';
}

/**
 * `ItemList<Restaurant>` für einen Guide, gebaut aus seinen spotCard-Blöcken.
 *
 * Die Guides sind listenförmig — dreizehn Restaurants mit Namen, Bezirk und
 * Foto — und sagten das strukturiert bisher nirgends: der Artikel trug nur
 * `NewsArticle` + `BreadcrumbList`, während die Kategorie- und Bezirksseiten
 * längst eine ItemList ausliefern. Damit stand dieselbe Liste für Google einmal
 * als Entität da und einmal als Fließtext.
 *
 * Die Reihenfolge ist die des Artikels, nicht alphabetisch: `position` ist eine
 * Rangbehauptung, und der Text stellt die Spots in einer gewollten Reihenfolge
 * vor (bei den Bezirks-Guides der kuratierten `topSpots`).
 *
 * Gibt `null` zurück, wenn der Artikel keine spotCards hat. Ein Meinungsstück
 * ohne Spots ist keine Liste, und eine leere ItemList wäre eine Behauptung über
 * die Seite, die nicht stimmt.
 */
export function buildArticleSpotsItemList({
  blocks,
  locale,
  name,
}: BuildArticleSpotsItemListArgs): Record<string, unknown> | null {
  const spots = (blocks ?? []).filter(isSpotCard).filter((s) => s.restaurantSlug && s.restaurantName);
  if (spots.length === 0) return null;

  return {
    '@type': 'ItemList',
    name,
    numberOfItems: spots.length,
    itemListElement: spots.map((spot, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Restaurant',
        name: spot.restaurantName,
        url: localeUrl(locale, `/restaurant/${spot.restaurantSlug}`),
        // `restaurantPhoto` ist upstream auf eine publizierbare Lizenz gefiltert
        // (publishableRestaurantImageUrl) — fehlt sie, lassen wir den Key weg,
        // statt Google eine URL zu geben, die wir nicht zeigen dürfen.
        ...(spot.restaurantPhoto && { image: schemaImageUrl(spot.restaurantPhoto) }),
        ...(spot.cuisineType && { servesCuisine: spot.cuisineType }),
      },
    })),
  };
}
