export interface SpotCandidate {
  _id: string
  featuredOnDate: string | null
  featured: boolean
  mustEatCount: number
}

/**
 * Spot-des-Tages selection: dated curation wins, then the featured flag,
 * then the most Must Eats. `today` is an ISO date string (YYYY-MM-DD).
 */
export function pickSpotOfDay<T extends SpotCandidate>(candidates: T[], today: string): T | null {
  if (candidates.length === 0) return null
  const dated = candidates.find((c) => c.featuredOnDate === today)
  if (dated) return dated
  const featured = candidates.find((c) => c.featured)
  if (featured) return featured
  return candidates.reduce((best, c) => (c.mustEatCount > best.mustEatCount ? c : best))
}
