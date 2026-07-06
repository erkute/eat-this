type NewsGuideSlug =
  | 'beste-fast-food-berlin'
  | 'beste-pizza-berlin'
  | 'beste-cafes-berlin'
  | 'beste-baeckereien-berlin'

export interface NewsGuideDef {
  slug: NewsGuideSlug
  categorySlug: string
  art: string
  accent: 'red' | 'yellow' | 'ink' | 'paper'
  title: { de: string; en: string }
  shortTitle: { de: string; en: string }
  intro: { de: string; en: string }
  promise: { de: string; en: string }
  mapQuery: string
}

export const NEWS_GUIDES: NewsGuideDef[] = [
  {
    slug: 'beste-fast-food-berlin',
    categorySlug: 'fast-food',
    art: '/pics/booster/booster_fastfood.webp',
    accent: 'red',
    title: { de: 'Das beste Fast Food in Berlin', en: 'The best fast food in Berlin' },
    shortTitle: { de: 'Fast Food', en: 'Fast Food' },
    intro: {
      de: 'Unsere laufende Shortlist für schnelle Legenden, starke Burger, gute Döner und Läden, für die man gern Umwege läuft.',
      en: 'Our living shortlist for fast legends, great burgers, proper döner and shops worth crossing town for.',
    },
    promise: { de: 'Schnell. Laut. Sehr ernst gemeint.', en: 'Fast, loud, deeply serious.' },
    mapQuery: 'fast-food',
  },
  {
    slug: 'beste-pizza-berlin',
    categorySlug: 'pizza',
    art: '/pics/booster/booster_pizza.webp',
    accent: 'yellow',
    title: { de: 'Die besten Pizzaläden in Berlin', en: 'The best pizza spots in Berlin' },
    shortTitle: { de: 'Pizza', en: 'Pizza' },
    intro: {
      de: 'Von neapolitanisch bis New York Slice: die Spots, bei denen Kruste, Hitze und Sauce wirklich stimmen.',
      en: 'From Neapolitan to New York slices: the places where crust, heat and sauce actually land.',
    },
    promise: { de: 'Für Slice, Date Night und Teig-Nerds.', en: 'For slices, date night and dough nerds.' },
    mapQuery: 'pizza',
  },
  {
    slug: 'beste-cafes-berlin',
    categorySlug: 'coffee',
    art: '/pics/booster/booster_coffee.webp',
    accent: 'ink',
    title: { de: 'Die besten Cafés in Berlin', en: 'The best cafes in Berlin' },
    shortTitle: { de: 'Cafés', en: 'Cafes' },
    intro: {
      de: 'Kaffee, Kuchen, Frühstück, zweite Verabredung: Cafés, die mehr können als nur einen hübschen Flat White.',
      en: 'Coffee, cake, breakfast, second dates: cafes that do more than a photogenic flat white.',
    },
    promise: { de: 'Für gute Gespräche und bessere Koffein-Level.', en: 'For better conversations and caffeine levels.' },
    mapQuery: 'coffee',
  },
  {
    slug: 'beste-baeckereien-berlin',
    categorySlug: 'breakfast',
    art: '/pics/booster/booster_breakfast.webp',
    accent: 'paper',
    title: { de: 'Die besten Bäckereien in Berlin', en: 'The best bakeries in Berlin' },
    shortTitle: { de: 'Bäckerei', en: 'Bakeries' },
    intro: {
      de: 'Croissants, Sauerteig, Zimtschnecken und alles, was morgens gefährlich gute Laune macht.',
      en: 'Croissants, sourdough, buns and everything that makes mornings dangerously good.',
    },
    promise: { de: 'Früh aufstehen lohnt sich manchmal doch.', en: 'Sometimes getting up early is worth it.' },
    mapQuery: 'breakfast',
  },
]

export function getNewsGuide(slug: string): NewsGuideDef | null {
  return NEWS_GUIDES.find((guide) => guide.slug === slug) ?? null
}
