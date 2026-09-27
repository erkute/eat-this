import type { MapMustEat, MapRestaurant } from '@/lib/types';

const DONER = /\b(?:d[oö]ner|doener|kebab|kebap)\b/i;
const PREFERRED_DISH: Record<string, RegExp> = { lunch: /rinderschaufel/i, 'fast-food': DONER };

/** Preview selection never grants access: the server's revealed IDs are required. */
export function selectPackPreview({
  mustEats,
  restaurants,
  revealedIds,
  category,
  permanentOnly = false,
}: {
  mustEats: MapMustEat[];
  restaurants: Pick<MapRestaurant, '_id' | 'categories'>[];
  revealedIds: ReadonlySet<string>;
  category?: string;
  permanentOnly?: boolean;
}): MapMustEat | null {
  const categorySpots = category
    ? new Set(
        restaurants
          .filter((spot) => spot.categories?.some((c) => c.slug === category))
          .map((spot) => spot._id)
      )
    : null;
  const eligible = mustEats.filter(
    (m) =>
      (!permanentOnly || m.revealedForAnon) &&
      revealedIds.has(m._id) &&
      m.image &&
      m.dish &&
      // A restaurant may serve both fast food and dinner; döner isn't the Dinner example.
      (category !== 'dinner' || !DONER.test(m.dish)) &&
      (!categorySpots || categorySpots.has(m.restaurant._id))
  );
  const preferred = category ? PREFERRED_DISH[category] : undefined;
  return (
    (preferred ? eligible.find((card) => preferred.test(card.dish!)) : undefined) ??
    eligible[0] ??
    null
  );
}
