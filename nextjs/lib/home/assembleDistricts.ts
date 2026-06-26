export interface HubDistrictSpot {
  name: string
  slug: string
  image: string | null
  category: string | null
}

export interface HubDistrict {
  name: string
  slug: string
  tagline: string | null
  isFeature: boolean
  spots: HubDistrictSpot[]
}

/** A browsable district row from the districts GROQ query (already ≥5 spots, ordered by count desc). */
export interface DistrictRow {
  name: string
  slug: string
  tagline: string | null
  count: number
  spots: HubDistrictSpot[]
}

const FAVORITE_DISTRICT_SLUGS = ['kreuzberg', 'neukoelln', 'mitte', 'prenzlauer-berg', 'schoeneberg']

/**
 * Deterministic weekly rotation for the featured district ("Bezirk der Woche").
 * Advances exactly one step per calendar week (Monday boundary) over a stable,
 * slug-sorted pool — no editorial doc or cron needed; the same `today` always
 * yields the same pick, so it is cache-safe. `today` is an ISO date (YYYY-MM-DD).
 */
export function pickWeeklyFeatureSlug(rows: DistrictRow[], today: string): string | null {
  if (rows.length === 0) return null
  const pool = rows.map((r) => r.slug).sort((a, b) => a.localeCompare(b))
  const epochDays = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000)
  // 1970-01-01 was a Thursday; +3 shifts the weekly boundary to Monday.
  const week = Math.floor((epochDays + 3) / 7)
  return pool[((week % pool.length) + pool.length) % pool.length]
}

/**
 * Build the unified district list for the home switcher: Berlin food-favorite
 * districts first, then fall back to rows by spot count. The weekly feature is
 * marked in-place instead of being forced to the first slot.
 */
export function assembleDistricts(
  featureSlug: string | null,
  rows: DistrictRow[],
  cap = 5,
): HubDistrict[] {
  const bySlug = new Map(rows.map((r) => [r.slug, r]))
  const favoriteRows = FAVORITE_DISTRICT_SLUGS
    .map((slug) => bySlug.get(slug))
    .filter((r): r is DistrictRow => Boolean(r))

  const fallbackRows = rows.filter((r) => !FAVORITE_DISTRICT_SLUGS.includes(r.slug))
  const orderedRows = [...favoriteRows, ...fallbackRows]

  return orderedRows.slice(0, cap).map((r) => ({
    name: r.name,
    slug: r.slug,
    tagline: r.tagline,
    isFeature: r.slug === featureSlug,
    spots: r.spots,
  }))
}
