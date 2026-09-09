// nextjs/lib/buddy/tools.ts
import type Anthropic from '@anthropic-ai/sdk';

/**
 * `list_saved_spots` steht nur angemeldeten Konten zur Verfügung — ohne Konto
 * gibt es keine geherzten Spots, und ein Werkzeug, das immer leer antwortet,
 * lädt nur zu Fragen ein, die niemand beantworten kann.
 */
const SAVED_SPOTS_TOOL: Anthropic.Tool = {
  name: 'list_saved_spots',
  description:
    'Die Spots, die DIESER Nutzer selbst geherzt hat („meine Map", „gemerkt", „gespeichert", „meine Liste", „wo wollte ich nochmal hin"). Kein Suchwerkzeug: es nimmt keine Filter und gibt genau seine Merkliste zurück, mit Öffnungszeiten und — wenn er den Standort geteilt hat — Entfernung. Danach selbst auswählen, was zur Frage passt (z.B. nur die, die jetzt offen sind).',
  input_schema: { type: 'object', properties: {} },
};

export function buddyTools({ signedIn }: { signedIn: boolean }): Anthropic.Tool[] {
  return signedIn ? [...BUDDY_TOOLS, SAVED_SPOTS_TOOL] : BUDDY_TOOLS;
}

export const BUDDY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_spots',
    description:
      'Suche Restaurants/Cafés/Spots aus dem Eat-This-Bestand. Nutze dies, sobald der Nutzer nach einem Ort zum Essen/Trinken fragt — ODER nach einem konkreten Lokal beim Namen (z.B. "Kennst du Gazzo?"). WICHTIG: Sobald der Nutzer ein konkretes Gericht oder eine Küche nennt (z.B. Pizza, Burger, Döner, Ramen, Sushi, Pasta, Kaffee, Brunch, Natural Wine), setze GENAU DIESES EINE Wort als `cuisine` — das trifft die kuratierten Tags am genauesten. Nennt der Nutzer ein konkretes Lokal beim Namen, setze diesen als `name` (NICHT als cuisine). bezirk/price_range nur, wenn explizit genannt. vibe_query immer zusätzlich mit Stimmung/Art füllen (z.B. "gemütlich, erstes Date").',
    input_schema: {
      type: 'object',
      properties: {
        cuisine: {
          type: 'string',
          description:
            'Das genannte Gericht ODER die Küche als EIN Stichwort, z.B. "pizza", "burger", "döner", "ramen", "kaffee", "brunch". Setzen, sobald der Nutzer ein Gericht/eine Küche nennt.',
        },
        bezirk: {
          type: 'string',
          description: 'Berliner Bezirk, z.B. "Schöneberg". Nur wenn genannt.',
        },
        price_range: {
          type: 'string',
          description: 'Preisklasse, z.B. "€", "€€", "€€€". Nur wenn genannt.',
        },
        name: {
          type: 'string',
          description:
            'Name eines konkreten Lokals, wenn der Nutzer einen Spot beim Namen nennt (z.B. "Gazzo", "Mrs Robinson"). Nur setzen, wenn ein konkreter Name fällt — sonst weglassen.',
        },
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
];
