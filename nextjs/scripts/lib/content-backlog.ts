export interface ContentRestaurant {
  slug: string
  name: string
  district?: string
  cuisineType?: string
  isOpen: boolean
  featured: boolean
  tierAnon: boolean
  tierSigned: boolean
  hasImage: boolean
  galleryCount: number
  hasGooglePlaceId: boolean
  descriptionLength: number
  hasMenuUrl: boolean
  hasExternalPresence: boolean
  hasShortDescription: boolean
  hasTip: boolean
  lastReviewed?: string
}

export interface BacklogItem extends ContentRestaurant {
  score: number
  reasons: string[]
}

const byScoreThenName = (a: BacklogItem, b: BacklogItem) =>
  b.score - a.score || a.name.localeCompare(b.name, 'de')

function surfaceScore(r: ContentRestaurant): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  if (r.tierAnon) {
    score += 100
    reasons.push('Anon-Tier')
  }
  if (r.tierSigned) {
    score += 80
    reasons.push('Signed-Tier')
  }
  if (r.featured) {
    score += 50
    reasons.push('Featured')
  }
  return { score, reasons }
}

/** Restaurants where the existing gallery backfill can run immediately. */
export function rankGalleryBacklog(restaurants: ContentRestaurant[]): BacklogItem[] {
  return restaurants
    .filter((r) => r.isOpen && r.galleryCount === 0 && r.hasGooglePlaceId)
    .map((r) => {
      const surface = surfaceScore(r)
      let score = surface.score
      const reasons = [...surface.reasons]
      if (r.descriptionLength >= 350) {
        score += 10
        reasons.push('starker Detail-Content')
      }
      if (r.hasImage) {
        score += 5
        reasons.push('Hero vorhanden')
      }
      return { ...r, score, reasons }
    })
    .sort(byScoreThenName)
}

/** Published restaurants whose long-form copy still needs editorial work. */
export function rankDescriptionBacklog(restaurants: ContentRestaurant[]): BacklogItem[] {
  return restaurants
    .filter((r) => r.isOpen && r.descriptionLength < 350)
    .map((r) => {
      const surface = surfaceScore(r)
      let score = surface.score
      const reasons = [...surface.reasons]
      if (r.hasShortDescription) {
        score += 15
        reasons.push('Kurzbeschreibung als Quelle')
      }
      if (r.hasTip) {
        score += 15
        reasons.push('Tipp als Quelle')
      }
      if (r.hasMenuUrl) {
        score += 10
        reasons.push('Menü-Link')
      }
      if (r.lastReviewed) {
        score += 10
        reasons.push(`besucht ${r.lastReviewed}`)
      }
      if (r.hasExternalPresence) {
        score += 5
        reasons.push('externe Präsenz')
      }
      score += Math.ceil((350 - r.descriptionLength) / 50)
      reasons.push(`${r.descriptionLength} Zeichen`)
      return { ...r, score, reasons }
    })
    .sort(byScoreThenName)
}

/** Exact slug selection shared by reports and paid backfill workflows. */
export function filterBySlugs<T extends { slug: string }>(items: T[], slugs: string[]): T[] {
  if (!slugs.length) return items
  const wanted = new Set(slugs)
  return items.filter((item) => wanted.has(item.slug))
}
