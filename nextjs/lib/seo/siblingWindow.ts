/**
 * Deterministisches Wrap-around-Fenster hinter dem eigenen Slug in einer
 * stabil sortierten Liste. Verteilt Sibling-Links gleichmäßig über alle
 * Spots eines Bezirks (statt featured-/A-Namen-Hubs), bleibt über ISR-
 * Renders stabil und enthält nie self.
 */
export function siblingWindow<T extends { slug: string }>(
  all: T[],
  selfSlug: string,
  limit: number,
): T[] {
  const selfIdx = all.findIndex(s => s.slug === selfSlug)
  const rest = all.filter(s => s.slug !== selfSlug)
  if (rest.length <= limit) return rest
  const start = selfIdx <= 0 ? 0 : selfIdx % rest.length
  return Array.from({ length: limit }, (_, i) => rest[(start + i) % rest.length])
}
