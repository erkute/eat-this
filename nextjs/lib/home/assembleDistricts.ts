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

/** The editorial "Bezirk der Woche" from the homeWeek doc. `spots` are the curated picks (may be empty). */
export interface FeatureRaw {
  name: string
  slug: string
  tagline: string | null
  spots: HubDistrictSpot[]
}

/**
 * Build the unified district list for the home switcher: editorial feature first
 * (marked), the rest by spot count. Feature uses its curated spots/tagline when
 * present, otherwise falls back to the matching auto-picked row. Capped at `cap`.
 */
export function assembleDistricts(
  feature: FeatureRaw | null,
  rows: DistrictRow[],
  cap = 10,
): HubDistrict[] {
  const others: HubDistrict[] = rows.map((r) => ({
    name: r.name,
    slug: r.slug,
    tagline: r.tagline,
    isFeature: false,
    spots: r.spots,
  }))

  if (!feature || !feature.slug) return others.slice(0, cap)

  const rowMatch = rows.find((r) => r.slug === feature.slug)
  const featureDistrict: HubDistrict = {
    name: feature.name,
    slug: feature.slug,
    tagline: feature.tagline ?? rowMatch?.tagline ?? null,
    isFeature: true,
    spots: feature.spots.length ? feature.spots : (rowMatch?.spots ?? []),
  }

  const rest = others.filter((d) => d.slug !== feature.slug)
  return [featureDistrict, ...rest].slice(0, cap)
}
