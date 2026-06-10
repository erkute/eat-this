// nextjs/lib/buddy/types.ts
export type Locale = 'de' | 'en'

export interface SpotCandidate {
  _id: string
  name: string
  slug: string
  cuisineType: string | null
  bezirk: string | null
  shortDescription: string | null
  tip: string | null
  priceRange: string | null
  mapsUrl: string | null
  image: string | null
  /** Open right now (Berlin time)? null when the spot has no opening-hours data. */
  openNow: boolean | null
  /** Short status label, e.g. "Offen · bis 23:00" / "Geschlossen". null if unknown. */
  openLabel: string | null
  /** Distance from the user, e.g. "240 m" / "1,8 km". null unless location shared. */
  distanceLabel: string | null
  /** Category slugs (pack taxonomy) — server-internal input for the Booster-Pack
   *  teaser pick; stripped before spots are streamed or fed back to the LLM. */
  categorySlugs?: string[]
}

/** Booster-Pack teaser the app (not Remy) renders under a matching answer.
 *  All copy comes verbatim from the canonical stripe-catalog. */
export interface PackTeaser {
  packId: string
  /** Pack page slug → /pack/<slug> */
  slug: string
  name: string
  spectrum: string
  priceLabel: string
}

export interface ArticleResult {
  title: string
  slug: string
  excerpt: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type BuddyStreamEvent =
  | { type: 'text'; value: string }
  | { type: 'spots'; value: SpotCandidate[] }
  | { type: 'articles'; value: ArticleResult[] }
  | { type: 'pack'; value: PackTeaser }
  | { type: 'error'; value: string }
  | { type: 'done' }
