import type { MapMustEat } from '@/lib/types';

/** Open the spot when available; otherwise open the individual card. */
export function mustEatMapHref(mustEat: MapMustEat): string {
  return mustEat.restaurant.slug
    ? `/map?r=${encodeURIComponent(mustEat.restaurant.slug)}`
    : `/map?me=${encodeURIComponent(mustEat._id)}`;
}
