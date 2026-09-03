// Pure neighbour resolution for the restaurant-detail pager. Order follows
// whatever list is passed (the filtered/displayed list the user is browsing).
interface Adjacent<T> {
  index: number;
  prev: T | null;
  next: T | null;
}

export function resolveAdjacent<T extends { _id: string }>(
  list: T[],
  currentId: string
): Adjacent<T> {
  const index = list.findIndex((r) => r._id === currentId);
  if (index === -1) return { index: -1, prev: null, next: null };
  return {
    index,
    prev: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
  };
}

/**
 * Neighbours for the restaurant pager. `frozen` is the list the detail was
 * opened from, captured before the click cleared the search query — the live
 * list has by then snapped back to the full catalogue, and paging through it
 * would leave the results the user was actually browsing. The live list is
 * only the fallback for a spot the snapshot doesn't hold (refetched away, or
 * a detail that opened without a snapshot).
 */
export function resolvePagerAdjacent<T extends { _id: string }>(
  frozen: T[] | null,
  live: T[],
  currentId: string
): Adjacent<T> {
  if (frozen) {
    const inFrozen = resolveAdjacent(frozen, currentId);
    if (inFrozen.index !== -1) return inFrozen;
  }
  return resolveAdjacent(live, currentId);
}
