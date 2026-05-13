// Static catalog mapping packId → Stripe Price ID and entitlement shape.
// packId is the prefixed form (`category-pizza`, `all-berlin`) — same
// string is also the Firestore entitlement doc ID and the Stripe Product ID.
//
// stripePriceId fields are populated with TEST-mode price IDs at first.
// When the Stripe account goes live, replace each with the LIVE price ID
// in the same commit as the apphosting secret rotation.

export interface PackDef {
  packId:        string                    // 'category-pizza' | 'all-berlin' | …
  stripePriceId: string                    // price_… from Stripe Dashboard
  type:          'category' | 'all-berlin'
  slug:          string | null             // category slug (null for all-berlin)
  displayName:   string                    // shown in success-page copy
  amountCents:   number                    // for sanity checks + receipts
}

export const CATALOG: Record<string, PackDef> = {
  'category-breakfast':  { packId: 'category-breakfast',  stripePriceId: 'price_1TWaJDPjwS4Z8dw6aLQyij7j', type: 'category',   slug: 'breakfast',  displayName: 'Breakfast',   amountCents: 299  },
  'category-coffee':     { packId: 'category-coffee',     stripePriceId: 'price_1TWaROPjwS4Z8dw6MGbI9Adi', type: 'category',   slug: 'coffee',     displayName: 'Coffee',      amountCents: 299  },
  'category-dinner':     { packId: 'category-dinner',     stripePriceId: 'price_1TWaKkPjwS4Z8dw6vk2XeiVj', type: 'category',   slug: 'dinner',     displayName: 'Dinner',      amountCents: 299  },
  'category-drinks':     { packId: 'category-drinks',     stripePriceId: 'price_1TWaQPPjwS4Z8dw618NIJ5UR', type: 'category',   slug: 'drinks',     displayName: 'Drinks',      amountCents: 299  },
  'category-fastfood':   { packId: 'category-fastfood',   stripePriceId: 'price_1TWaSQPjwS4Z8dw6sBkD8c1O', type: 'category',   slug: 'fastfood',   displayName: 'Fast Food',   amountCents: 299  },
  'category-finedining': { packId: 'category-finedining', stripePriceId: 'price_1TWaSuPjwS4Z8dw6E9bQ5iqq', type: 'category',   slug: 'finedining', displayName: 'Fine Dining', amountCents: 299  },
  'category-lunch':      { packId: 'category-lunch',      stripePriceId: 'price_1TWaTPPjwS4Z8dw6pqyeDuPN', type: 'category',   slug: 'lunch',      displayName: 'Lunch',       amountCents: 299  },
  'category-pizza':      { packId: 'category-pizza',      stripePriceId: 'price_1TWaUwPjwS4Z8dw6R4cd7JTa', type: 'category',   slug: 'pizza',      displayName: 'Pizza',       amountCents: 299  },
  'category-sweets':     { packId: 'category-sweets',     stripePriceId: 'price_1TWaVFPjwS4Z8dw6YuzQc2P6', type: 'category',   slug: 'sweets',     displayName: 'Sweets',      amountCents: 299  },
  'all-berlin':          { packId: 'all-berlin',          stripePriceId: 'price_1TWaqbPjwS4Z8dw6b8ZekphP', type: 'all-berlin', slug: null,         displayName: 'All Berlin',  amountCents: 2000 },
}

export function getPack(packId: string): PackDef | null {
  return CATALOG[packId] ?? null
}

export function allPackIds(): string[] {
  return Object.keys(CATALOG)
}
