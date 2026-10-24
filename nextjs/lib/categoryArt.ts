/** Category slug → booster pack art (public path). Canonical source for category art. */
const CATEGORY_ART: Record<string, string> = {
  breakfast: '/pics/booster/booster_breakfast.webp?v=2',
  coffee: '/pics/booster/booster_coffee.webp?v=2',
  dinner: '/pics/booster/booster_dinner.webp?v=2',
  drinks: '/pics/booster/booster_drinks.webp?v=3',
  'fast-food': '/pics/booster/booster_fastfood.webp?v=2',
  'fine-dining': '/pics/booster/booster_finedining.webp?v=2',
  lunch: '/pics/booster/booster_lunch.webp?v=2',
  pizza: '/pics/booster/booster_pizza.webp?v=2',
  sweets: '/pics/booster/booster_sweets.webp?v=2',
};

export function categoryArt(slug: string): string | null {
  return CATEGORY_ART[slug] ?? null;
}

/** Kachelfarbe der Kategorie-Übersicht: die Grundfarbe des Packs (Median der
 *  Fläche neben dem Motiv, aus den Bildern gemessen), 14 % dunkler, damit sich
 *  das Pack abhebt – Fine Dining 14 % heller, Schwarz auf Schwarz sähe man
 *  nicht. `ink`: Schrift darauf in Ink statt Weiss. */
const CATEGORY_TILE: Record<string, { tile: string; ink: boolean }> = {
  breakfast: { tile: '#344fb5', ink: false },
  coffee: { tile: '#c9a306', ink: true },
  dinner: { tile: '#978abf', ink: true },
  drinks: { tile: '#9dafc2', ink: true },
  'fast-food': { tile: '#bb3f31', ink: false },
  'fine-dining': { tile: '#403e37', ink: false },
  lunch: { tile: '#3653b8', ink: false },
  pizza: { tile: '#c15f22', ink: true },
  sweets: { tile: '#c48aa6', ink: true },
};

export function categoryTile(slug: string): { tile: string; ink: boolean } | null {
  return CATEGORY_TILE[slug] ?? null;
}
