// nextjs/lib/buddy/tools.ts
import type Anthropic from '@anthropic-ai/sdk'

export interface SearchSpotsInput {
  cuisine?: string
  bezirk?: string
  price_range?: string
  vibe_query: string
}
export interface SearchArticlesInput {
  query: string
}

export const BUDDY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_spots',
    description:
      'Suche Restaurants/Cafés/Spots aus dem Eat-This-Bestand. Nutze dies, sobald der Nutzer nach einem Ort zum Essen/Trinken fragt. Setze cuisine/bezirk/price_range NUR, wenn der Nutzer sie explizit nennt. vibe_query immer mit Stimmung/Art der Anfrage füllen (z.B. "gemütlich, erstes Date" oder "schnelle Pizza").',
    input_schema: {
      type: 'object',
      properties: {
        cuisine: { type: 'string', description: 'Küche, z.B. "Pizza", "Ramen". Nur wenn genannt.' },
        bezirk: { type: 'string', description: 'Berliner Bezirk, z.B. "Schöneberg". Nur wenn genannt.' },
        price_range: { type: 'string', description: 'Preisklasse, z.B. "€", "€€", "€€€". Nur wenn genannt.' },
        vibe_query: { type: 'string', description: 'Stimmung/Art der Anfrage in eigenen Worten.' },
      },
      required: ['vibe_query'],
    },
  },
  {
    name: 'search_articles',
    description:
      'Suche Eat-This-Artikel für Wissens-/Editorial-Fragen über Berliner Food-Kultur (z.B. "Was macht Berliner Kaffee besonders?").',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Worum es inhaltlich geht.' },
      },
      required: ['query'],
    },
  },
]
