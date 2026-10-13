import type { MapMustEat } from '@/lib/types';

/** Preview selection never grants access: the server's revealed IDs are required. */
export function selectPackPreview({
  mustEats,
  revealedIds,
  category,
}: {
  mustEats: MapMustEat[];
  revealedIds: ReadonlySet<string>;
  category?: string;
}): MapMustEat | null {
  const eligible = mustEats.filter(
    (m) =>
      (m.previewCategory || m.revealedForAnon) &&
      revealedIds.has(m._id) &&
      m.image &&
      m.dish &&
      (!category || m.previewCategory === category)
  );
  return eligible[0] ?? null;
}
