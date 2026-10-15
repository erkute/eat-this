import type { MapMustEat } from '@/lib/types';

type DeckCard = Pick<MapMustEat, '_id' | 'order'>;

/**
 * Die Reihenfolge des Stapels: nach der Kartennummer, die unten rechts auf
 * jeder Karte steht. Eine Karte ohne Nummer liegt am Ende, `_id` entscheidet
 * bei Gleichstand — so liegt jede Karte fest, egal in welcher Folge die Liste
 * ankommt (Sanity, localStorage-Cache, Hydrierung).
 */
export function compareCardNumber(a: DeckCard, b: DeckCard): number {
  const diff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
  return diff !== 0 ? diff : a._id.localeCompare(b._id);
}

export function sortByCardNumber<T extends DeckCard>(cards: readonly T[]): T[] {
  return [...cards].sort(compareCardNumber);
}

/** Die Nummer, wie sie auf der Karte steht: dreistellig („007“). Ohne `order`
 *  hat eine Karte keine Nummer — dann `null`, keine erfundene. */
export function cardNumber(order: number | undefined | null): string | null {
  return order == null ? null : String(order).padStart(3, '0');
}
