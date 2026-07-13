import type { CategoryRef } from '@/lib/types';

// NOTE on the type source: the spec asked to import `MustEatPreview` from
// `@/lib/sanity.server`, but that type is deliberately content-free
// (`{ _id, order? }`) — its header forbids adding dish/photo fields because
// they would leak through the public restaurant page's RSC payload. The album
// needs the *face-up* content shape (dish/image + restaurant category), which
// is the same data the map exposes as `MapMustEat`. `MapMustEat.restaurant`
// has no `categories`, so we model the album's input locally as `MapMustEat`
// plus an optional `categories` on the restaurant.
import type { MapMustEat } from '@/lib/types';

export type AlbumMustEat = MapMustEat & {
  restaurant: MapMustEat['restaurant'] & { categories?: CategoryRef[] };
};

interface AlbumSlot {
  no: number;
  id: string;
  collected: boolean;
  mustEat: AlbumMustEat | null;
}
interface AlbumPage {
  category: string;
  slots: AlbumSlot[];
}

const defaultCategoryOf = (m: AlbumMustEat): string =>
  m.restaurant?.categories?.[0]?.name ?? 'Sonstige';

export function isAlbumMustEatCollected(
  mustEat: AlbumMustEat,
  faceUpIds: ReadonlySet<string>
): boolean {
  return faceUpIds.has(mustEat._id) || Boolean(mustEat.image);
}

export function buildAlbum(
  all: AlbumMustEat[],
  faceUpIds: Set<string>,
  categoryOf: (m: AlbumMustEat) => string = defaultCategoryOf
): AlbumPage[] {
  const sorted = [...all].sort((a, b) => {
    const c = categoryOf(a).localeCompare(categoryOf(b), 'de');
    return c !== 0 ? c : a._id.localeCompare(b._id);
  });
  const pages: AlbumPage[] = [];
  sorted.forEach((m, i) => {
    const cat = categoryOf(m);
    const collected = isAlbumMustEatCollected(m, faceUpIds);
    const slot: AlbumSlot = {
      no: i + 1,
      id: m._id,
      collected,
      mustEat: collected ? m : null,
    };
    const page = pages[pages.length - 1];
    if (page && page.category === cat) page.slots.push(slot);
    else pages.push({ category: cat, slots: [slot] });
  });
  return pages;
}
