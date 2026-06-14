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
 * Build the unified district list for the home switcher: the rotated feature
 * first (marked), the rest by spot count. Tagline + spots come straight from the
 * district row. Capped at `cap`.
 */
export function assembleDistricts(
  featureSlug: string | null,
  rows: DistrictRow[],
  cap = 10,
): HubDistrict[] {
  const all: HubDistrict[] = rows.map((r) => ({
    name: r.name,
    slug: r.slug,
    tagline: r.tagline,
    isFeature: false,
    spots: r.spots,
  }))

  const idx = featureSlug ? all.findIndex((d) => d.slug === featureSlug) : -1
  if (idx < 0) return all.slice(0, cap)

  const [feat] = all.splice(idx, 1)
  feat.isFeature = true
  return [feat, ...all].slice(0, cap)
}
