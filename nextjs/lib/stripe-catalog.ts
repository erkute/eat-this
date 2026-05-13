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
  'category-breakfast':  { packId: 'category-breakfast',  stripePriceId: 'price_TBD_breakfast',  type: 'category',   slug: 'breakfast',  displayName: 'Breakfast',   amountCents: 299  },
  'category-coffee':     { packId: 'category-coffee',     stripePriceId: 'price_TBD_coffee',     type: 'category',   slug: 'coffee',     displayName: 'Coffee',      amountCents: 299  },
  'category-dinner':     { packId: 'category-dinner',     stripePriceId: 'price_TBD_dinner',     type: 'category',   slug: 'dinner',     displayName: 'Dinner',      amountCents: 299  },
  'category-drinks':     { packId: 'category-drinks',     stripePriceId: 'price_TBD_drinks',     type: 'category',   slug: 'drinks',     displayName: 'Drinks',      amountCents: 299  },
  'category-fastfood':   { packId: 'category-fastfood',   stripePriceId: 'price_TBD_fastfood',   type: 'category',   slug: 'fastfood',   displayName: 'Fast Food',   amountCents: 299  },
  'category-finedining': { packId: 'category-finedining', stripePriceId: 'price_TBD_finedining', type: 'category',   slug: 'finedining', displayName: 'Fine Dining', amountCents: 299  },
  'category-lunch':      { packId: 'category-lunch',      stripePriceId: 'price_TBD_lunch',      type: 'category',   slug: 'lunch',      displayName: 'Lunch',       amountCents: 299  },
  'category-pizza':      { packId: 'category-pizza',      stripePriceId: 'price_TBD_pizza',      type: 'category',   slug: 'pizza',      displayName: 'Pizza',       amountCents: 299  },
  'category-sweets':     { packId: 'category-sweets',     stripePriceId: 'price_TBD_sweets',     type: 'category',   slug: 'sweets',     displayName: 'Sweets',      amountCents: 299  },
  'all-berlin':          { packId: 'all-berlin',          stripePriceId: 'price_TBD_all_berlin', type: 'all-berlin', slug: null,         displayName: 'All Berlin',  amountCents: 2000 },
}

export function getPack(packId: string): PackDef | null {
  return CATALOG[packId] ?? null
}

export function allPackIds(): string[] {
  return Object.keys(CATALOG)
}
