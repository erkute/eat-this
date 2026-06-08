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
      'Suche Restaurants/Cafés/Spots aus dem Eat-This-Bestand. Nutze dies, sobald der Nutzer nach einem Ort zum Essen/Trinken fragt. WICHTIG: Sobald der Nutzer ein konkretes Gericht oder eine Küche nennt (z.B. Pizza, Burger, Döner, Ramen, Sushi, Pasta, Kaffee, Brunch, Natural Wine), setze GENAU DIESES EINE Wort als `cuisine` — das trifft die kuratierten Tags am genauesten. bezirk/price_range nur, wenn explizit genannt. vibe_query immer zusätzlich mit Stimmung/Art füllen (z.B. "gemütlich, erstes Date").',
    input_schema: {
      type: 'object',
      properties: {
        cuisine: { type: 'string', description: 'Das genannte Gericht ODER die Küche als EIN Stichwort, z.B. "pizza", "burger", "döner", "ramen", "kaffee", "brunch". Setzen, sobald der Nutzer ein Gericht/eine Küche nennt.' },
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
