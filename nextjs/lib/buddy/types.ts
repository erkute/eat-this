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
  | { type: 'error'; value: string }
  | { type: 'done' }
