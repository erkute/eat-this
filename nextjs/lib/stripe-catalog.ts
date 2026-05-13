// Static catalog mapping packId → Stripe Price ID and entitlement shape.
// packId is the prefixed form (`category-pizza`, `all-berlin`) — same
// string is also the Firestore entitlement doc ID and the Stripe Product ID.
//
// stripePriceId values are LIVE-mode IDs from Stripe Dashboard.

export interface PackDef {
  packId:        string                    // 'category-pizza' | 'all-berlin' | …
  stripePriceId: string                    // price_… from Stripe Dashboard
  type:          'category' | 'all-berlin'
  slug:          string | null             // category slug (null for all-berlin)
  displayName:   string                    // shown in success-page copy
  description:   string                    // long editorial copy — mirrors Stripe Product description verbatim (Stripe Hosted Checkout body)
  spectrum:      string                    // tight declarative line — rendered as the Booster card headline (period-separated, Editor-Pick voice)
  amountCents:   number                    // for sanity checks + receipts
}

export const CATALOG: Record<string, PackDef> = {
  'category-breakfast':  { packId: 'category-breakfast',  stripePriceId: 'price_1TWhsSPjwS4Z8dw6PaUpbHR7', type: 'category',   slug: 'breakfast',  displayName: 'Breakfast',   description: 'Berlins Frühstücks-Spots auf deiner Map. Vom klassischen deutschen Frühstück über Tel-Aviv-Brunch bis zum australischen Café.',                  spectrum: 'Deutsch. Tel-Aviv. Aussie.',          amountCents: 299  },
  'category-coffee':     { packId: 'category-coffee',     stripePriceId: 'price_1TWhsNPjwS4Z8dw6Qpc9atZb', type: 'category',   slug: 'coffee',     displayName: 'Coffee',      description: 'Berlins Kaffee-Spots auf deiner Map. Cafés mit eigener Rösterei, klassische Espresso-Bars, Brew-Bars mit Single-Origin-Karte.',                spectrum: 'Rösterei. Espresso. Single Origin.', amountCents: 299  },
  'category-dinner':     { packId: 'category-dinner',     stripePriceId: 'price_1TWhsQPjwS4Z8dw6oQS5tDni', type: 'category',   slug: 'dinner',     displayName: 'Dinner',      description: 'Berlins Dinner-Spots auf deiner Map. Concept-Restaurants, Neo-Bistros, japanisches Omakase.',                                                   spectrum: 'Concept. Neo-Bistro. Omakase.',       amountCents: 299  },
  'category-drinks':     { packId: 'category-drinks',     stripePriceId: 'price_1TWhsOPjwS4Z8dw6DIqjh6fs', type: 'category',   slug: 'drinks',     displayName: 'Drinks',      description: 'Berlins Bar-Spots auf deiner Map. Klassische Cocktail-Bars, Speakeasys, Naturwein-Adressen und Listening Bars mit Vinyl.',                     spectrum: 'Cocktail. Speakeasy. Naturwein.',     amountCents: 299  },
  'category-fastfood':   { packId: 'category-fastfood',   stripePriceId: 'price_1TWhsLPjwS4Z8dw6nrYJTtAS', type: 'category',   slug: 'fast-food',  displayName: 'Fast Food',   description: 'Berlins Fast-Food-Spots auf deiner Map. Smash-Burger-Spezialisten, taiwanesische Bao-Bars, neue Bagel-Adressen und gehobenes Streetfood.',     spectrum: 'Smash. Bao. Bagel.',                  amountCents: 299  },
  'category-finedining': { packId: 'category-finedining', stripePriceId: 'price_1TWhsJPjwS4Z8dw6hH2CZiJh', type: 'category',   slug: 'fine-dining', displayName: 'Fine Dining', description: 'Berlins Fine-Dining-Spots auf deiner Map. Tasting-Menüs mit Konzept, Sterne-Küchen mit Saisonalität, Chef\'s Tables.',                          spectrum: 'Tasting. Sterne. Chef\'s Table.',     amountCents: 299  },
  'category-lunch':      { packId: 'category-lunch',      stripePriceId: 'price_1TWhsIPjwS4Z8dw6Ji9nEahS', type: 'category',   slug: 'lunch',      displayName: 'Lunch',       description: 'Berlins Lunch-Spots auf deiner Map. Mittagsmenüs jenseits der Kantine, Bowl-Bars mit Tiefe, Bistros mit täglich wechselnder Karte.',           spectrum: 'Mittag. Bowls. Bistro.',              amountCents: 299  },
  'category-pizza':      { packId: 'category-pizza',      stripePriceId: 'price_1TWhsGPjwS4Z8dw6pM1rnNNp', type: 'category',   slug: 'pizza',      displayName: 'Pizza',       description: 'Berlins Pizza-Spots auf deiner Map. Neapolitanische Klassiker mit Holzofen, römische Pinsa, amerikanische Slice.',                              spectrum: 'Napoli. Pinsa. Slice.',               amountCents: 299  },
  'category-sweets':     { packId: 'category-sweets',     stripePriceId: 'price_1TWhsEPjwS4Z8dw6wCZnDRoa', type: 'category',   slug: 'sweets',     displayName: 'Sweets',      description: 'Berlins Sweets-Spots auf deiner Map. Patisserien, Cinnamon-Bun-Spezialisten, Eisdielen mit eigener Mischung.',                                  spectrum: 'Patisserie. Cinnamon. Eis.',          amountCents: 299  },
  'all-berlin':          { packId: 'all-berlin',          stripePriceId: 'price_1TWhs7PjwS4Z8dw65FYYgZJF', type: 'all-berlin', slug: null,         displayName: 'All Berlin',  description: 'Alle Berliner Spots auf deiner Map. Neun Kategorien, jede Adresse die wir kuratieren — plus alle die noch dazukommen.',                         spectrum: 'Neun Kategorien. Plus alles was kommt.', amountCents: 2000 },
}

export function getPack(packId: string): PackDef | null {
  return CATALOG[packId] ?? null
}

export function allPackIds(): string[] {
  return Object.keys(CATALOG)
}
