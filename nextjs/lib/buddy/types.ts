// nextjs/lib/buddy/types.ts
export type Locale = 'de' | 'en'

export interface SpotCandidate {
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
  | { type: 'error'; value: string }
  | { type: 'done' }
