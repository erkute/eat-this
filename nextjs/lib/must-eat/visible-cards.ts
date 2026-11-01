import type { InitialMapData } from '@/lib/map/server-initial-map-data';

interface AccountCardData {
  uid: string | null;
  authLoading: boolean;
  live: Pick<InitialMapData, 'mustEats'> & { dataUid: string | null; revealedMustEatIds: ReadonlySet<string> };
}

/** Öffentliche Motive bleiben sichtbar; private Daten gelten nur für das aktuelle Konto. */
export function selectVisibleMustEats(initialData: InitialMapData | undefined, { uid, authLoading, live }: AccountCardData): InitialMapData {
  // Beim Kontowechsel bleiben ausschließlich öffentliche Karten sichtbar,
  // bis der Server die Freigaben des aktuellen Kontos geliefert hat.
  const base = initialData ?? { restaurants: [], mustEats: [], categories: [], totalCount: 0, revealedMustEatIds: [] };
  let data: InitialMapData = base;
  if (!authLoading && live.dataUid === uid && (uid !== null || !initialData)) {
    const cards = new Map(live.mustEats.map(card => [card._id, card]));
    // Der lokale Map-Cache enthält keine Motive/Freigaben. Die öffentlich
    // offenen SSR-Karten bleiben deshalb auch vor dem Kontenabruf sichtbar.
    for (const card of base.mustEats) {
      if (base.revealedMustEatIds.includes(card._id)
        && (!live.revealedMustEatIds.has(card._id) || !cards.get(card._id)?.image)) {
        cards.set(card._id, card);
      }
    }
    data = {
      ...base,
      mustEats: [...cards.values()],
      revealedMustEatIds: [...new Set([...base.revealedMustEatIds, ...live.revealedMustEatIds])],
    };
  }
  return data;
}
