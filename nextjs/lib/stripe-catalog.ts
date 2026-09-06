// Static catalog mapping packId → Stripe Price ID and entitlement shape.
// packId is the prefixed form (`category-pizza`, `all-berlin`) — same
// string is also the Firestore entitlement doc ID and the Stripe Product ID.
//
// stripePriceId values are LIVE-mode IDs from Stripe Dashboard.

type PackCopy = Record<'de' | 'en', string>;

export interface PackDef {
  packId: string; // 'category-pizza' | 'all-berlin' | …
  stripePriceId: string; // price_… from Stripe Dashboard
  type: 'category' | 'all-berlin';
  slug: string | null; // category slug (null for all-berlin)
  displayName: string; // shown in success-page copy
  /** Long editorial copy — `de` mirrors the Stripe Product description
   *  verbatim (it is the Stripe Hosted Checkout body). ACHTUNG: aendert sich
   *  der Text hier, muss er im Stripe-Dashboard nachgezogen werden, sonst
   *  verspricht die Kassenseite etwas anderes als die Pack-Seite.
   *  Der Weg dorthin: `npx tsx scripts/sync-stripe-catalog.ts`. */
  description: PackCopy;
  spectrum: PackCopy; // tight declarative line — rendered as the Booster card headline (period-separated, Editor-Pick voice)
  amountCents: number; // for sanity checks + receipts
}

export const CATALOG: Record<string, PackDef> = {
  'category-breakfast': {
    packId: 'category-breakfast',
    stripePriceId: 'price_1TWhsSPjwS4Z8dw6PaUpbHR7',
    type: 'category',
    slug: 'breakfast',
    displayName: 'Breakfast',
    amountCents: 299,
    description: {
      de: 'Die Frühstücks-Karten des Stapels. Was du bestellen musst — vom klassischen deutschen Frühstück über Tel-Aviv-Brunch bis zum australischen Café.',
      en: "The breakfast cards of the deck. What to order — from classic German breakfast to Tel Aviv brunch to the Australian café.",
    },
    spectrum: { de: 'Shakshuka. Sauerteig. Flat White.', en: 'Shakshuka. Sourdough. Flat White.' },
  },
  'category-coffee': {
    packId: 'category-coffee',
    stripePriceId: 'price_1TWhsNPjwS4Z8dw6Qpc9atZb',
    type: 'category',
    slug: 'coffee',
    displayName: 'Coffee',
    amountCents: 299,
    description: {
      de: 'Die Kaffee-Karten des Stapels. Cafés mit eigener Rösterei, klassische Espresso-Bars, Brew-Bars mit Single-Origin-Karte.',
      en: "The coffee cards of the deck. Cafés roasting their own beans, classic espresso bars, brew bars with single-origin menus.",
    },
    spectrum: { de: 'Crema. Slow Bar. Mikro-Röstung.', en: 'Crema. Slow Bar. Micro-Roast.' },
  },
  'category-dinner': {
    packId: 'category-dinner',
    stripePriceId: 'price_1TWhsQPjwS4Z8dw6oQS5tDni',
    type: 'category',
    slug: 'dinner',
    displayName: 'Dinner',
    amountCents: 299,
    description: {
      de: 'Die Dinner-Karten des Stapels. Concept-Restaurants, Neo-Bistros, japanisches Omakase.',
      en: "The dinner cards of the deck. Concept restaurants, neo-bistros, Japanese omakase.",
    },
    spectrum: {
      de: 'Kerzenlicht. Natural. Counter Seat.',
      en: 'Candlelight. Natural. Counter Seat.',
    },
  },
  'category-drinks': {
    packId: 'category-drinks',
    stripePriceId: 'price_1TWhsOPjwS4Z8dw6DIqjh6fs',
    type: 'category',
    slug: 'drinks',
    displayName: 'Drinks',
    amountCents: 299,
    description: {
      de: 'Die Drinks-Karten des Stapels. Klassische Cocktail-Bars, Speakeasys, Naturwein-Adressen und Listening Bars mit Vinyl.',
      en: "The drinks cards of the deck. Classic cocktail bars, speakeasies, natural wine addresses and listening bars with vinyl.",
    },
    spectrum: { de: 'Negroni. Hinterzimmer. Pet-Nat.', en: 'Negroni. Back Room. Pet-Nat.' },
  },
  'category-fastfood': {
    packId: 'category-fastfood',
    stripePriceId: 'price_1TWhsLPjwS4Z8dw6nrYJTtAS',
    type: 'category',
    slug: 'fast-food',
    displayName: 'Fast Food',
    amountCents: 299,
    description: {
      de: 'Die Fast-Food-Karten des Stapels. Smash-Burger-Spezialisten, taiwanesische Bao-Bars, neue Bagel-Adressen und gehobenes Streetfood.',
      en: "The fast food cards of the deck. Smash burger specialists, Taiwanese bao bars, new bagel addresses and elevated street food.",
    },
    spectrum: { de: 'Smash. Dumpling. Döner 2.0.', en: 'Smash. Dumpling. Döner 2.0.' },
  },
  'category-finedining': {
    packId: 'category-finedining',
    stripePriceId: 'price_1TWhsJPjwS4Z8dw6hH2CZiJh',
    type: 'category',
    slug: 'fine-dining',
    displayName: 'Fine Dining',
    amountCents: 299,
    description: {
      de: "Die Fine-Dining-Karten des Stapels. Tasting-Menüs mit Konzept, Sterne-Küchen mit Saisonalität, Chef's Tables.",
      en: "The fine dining cards of the deck. Tasting menus with a concept, starred kitchens with seasonality, chef's tables.",
    },
    spectrum: {
      de: '12 Gänge. Sternen-Küche. Pass-Through.',
      en: '12 Courses. Starred Kitchens. Pass-Through.',
    },
  },
  'category-lunch': {
    packId: 'category-lunch',
    stripePriceId: 'price_1TWhsIPjwS4Z8dw6Ji9nEahS',
    type: 'category',
    slug: 'lunch',
    displayName: 'Lunch',
    amountCents: 299,
    description: {
      de: 'Die Lunch-Karten des Stapels. Mittagsmenüs jenseits der Kantine, Bowl-Bars mit Tiefe, Bistros mit täglich wechselnder Karte.',
      en: "The lunch cards of the deck. Midday menus beyond the canteen, bowl bars with depth, bistros with a daily changing menu.",
    },
    spectrum: {
      de: 'Power-Bowl. Tagesgericht. Banh Mi.',
      en: 'Power Bowl. Daily Special. Banh Mi.',
    },
  },
  'category-pizza': {
    packId: 'category-pizza',
    stripePriceId: 'price_1TWhsGPjwS4Z8dw6pM1rnNNp',
    type: 'category',
    slug: 'pizza',
    displayName: 'Pizza',
    amountCents: 299,
    description: {
      de: 'Die Pizza-Karten des Stapels. Neapolitanische Klassiker mit Holzofen, römische Pinsa, amerikanische Slice.',
      en: "The pizza cards of the deck. Neapolitan classics from the wood-fired oven, Roman pinsa, American slice.",
    },
    spectrum: { de: 'Holzofen. Pinsa. NY-Slice.', en: 'Wood-Fired. Pinsa. NY Slice.' },
  },
  'category-sweets': {
    packId: 'category-sweets',
    stripePriceId: 'price_1TWhsEPjwS4Z8dw6wCZnDRoa',
    type: 'category',
    slug: 'sweets',
    displayName: 'Sweets',
    amountCents: 299,
    description: {
      de: 'Die Sweets-Karten des Stapels. Patisserien, Cinnamon-Bun-Spezialisten, Eisdielen mit eigener Mischung.',
      en: "The sweets cards of the deck. Patisseries, cinnamon bun specialists, ice cream parlours with their own recipes.",
    },
    spectrum: { de: 'Babka. Gelato. Cookies.', en: 'Babka. Gelato. Cookies.' },
  },
  'all-berlin': {
    packId: 'all-berlin',
    stripePriceId: 'price_1U6FhgPjwS4Z8dw63VwVKjR4',
    type: 'all-berlin',
    slug: null,
    displayName: 'All Berlin',
    amountCents: 999,
    description: {
      de: 'Der ganze Stapel. Jede Must-Eat-Karte aus neun Kategorien — plus jede, die noch dazukommt.',
      en: 'The whole deck. Every Must-Eat card across nine categories — plus every one still to come.',
    },
    spectrum: {
      de: 'Neun Kategorien. Plus alles was kommt.',
      en: 'Nine Categories. Plus everything to come.',
    },
  },
};

export function getPack(packId: string): PackDef | null {
  return CATALOG[packId] ?? null;
}

export function allPackIds(): string[] {
  return Object.keys(CATALOG);
}
