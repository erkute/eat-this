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
  amountCents:   number                    // for sanity checks + receipts
}

export const CATALOG: Record<string, PackDef> = {
  'category-breakfast':  { packId: 'category-breakfast',  stripePriceId: 'price_1TWhsSPjwS4Z8dw6PaUpbHR7', type: 'category',   slug: 'breakfast',  displayName: 'Breakfast',   amountCents: 299  },
  'category-coffee':     { packId: 'category-coffee',     stripePriceId: 'price_1TWhsNPjwS4Z8dw6Qpc9atZb', type: 'category',   slug: 'coffee',     displayName: 'Coffee',      amountCents: 299  },
  'category-dinner':     { packId: 'category-dinner',     stripePriceId: 'price_1TWhsQPjwS4Z8dw6oQS5tDni', type: 'category',   slug: 'dinner',     displayName: 'Dinner',      amountCents: 299  },
  'category-drinks':     { packId: 'category-drinks',     stripePriceId: 'price_1TWhsOPjwS4Z8dw6DIqjh6fs', type: 'category',   slug: 'drinks',     displayName: 'Drinks',      amountCents: 299  },
  'category-fastfood':   { packId: 'category-fastfood',   stripePriceId: 'price_1TWhsLPjwS4Z8dw6nrYJTtAS', type: 'category',   slug: 'fast-food',  displayName: 'Fast Food',   amountCents: 299  },
  'category-finedining': { packId: 'category-finedining', stripePriceId: 'price_1TWhsJPjwS4Z8dw6hH2CZiJh', type: 'category',   slug: 'fine-dining', displayName: 'Fine Dining', amountCents: 299  },
  'category-lunch':      { packId: 'category-lunch',      stripePriceId: 'price_1TWhsIPjwS4Z8dw6Ji9nEahS', type: 'category',   slug: 'lunch',      displayName: 'Lunch',       amountCents: 299  },
  'category-pizza':      { packId: 'category-pizza',      stripePriceId: 'price_1TWhsGPjwS4Z8dw6pM1rnNNp', type: 'category',   slug: 'pizza',      displayName: 'Pizza',       amountCents: 299  },
  'category-sweets':     { packId: 'category-sweets',     stripePriceId: 'price_1TWhsEPjwS4Z8dw6wCZnDRoa', type: 'category',   slug: 'sweets',     displayName: 'Sweets',      amountCents: 299  },
  'all-berlin':          { packId: 'all-berlin',          stripePriceId: 'price_1TWhs7PjwS4Z8dw65FYYgZJF', type: 'all-berlin', slug: null,         displayName: 'All Berlin',  amountCents: 2000 },
}

export function getPack(packId: string): PackDef | null {
  return CATALOG[packId] ?? null
}

export function allPackIds(): string[] {
  return Object.keys(CATALOG)
}
