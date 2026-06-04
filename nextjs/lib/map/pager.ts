// Pure neighbour resolution for the restaurant-detail pager. Order follows
// whatever list is passed (the filtered/displayed list the user is browsing).
export interface Adjacent<T> {
  index: number
  prev: T | null
  next: T | null
}

export function resolveAdjacent<T extends { _id: string }>(
  list: T[],
  currentId: string,
): Adjacent<T> {
  const index = list.findIndex(r => r._id === currentId)
  if (index === -1) return { index: -1, prev: null, next: null }
  return {
    index,
    prev: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
  }
}
