/** Category slug → booster pack art (public path). Canonical source for category art. */
const CATEGORY_ART: Record<string, string> = {
  breakfast: '/pics/booster/booster_breakfast.webp',
  coffee: '/pics/booster/booster_coffee.webp',
  dinner: '/pics/booster/booster_dinner.webp',
  drinks: '/pics/booster/booster_drinks.webp',
  'fast-food': '/pics/booster/booster_fastfood.webp',
  'fine-dining': '/pics/booster/booster_finedining.webp',
  lunch: '/pics/booster/booster_lunch.webp',
  pizza: '/pics/booster/booster_pizza.webp',
  sweets: '/pics/booster/booster_sweets.webp',
}

export function categoryArt(slug: string): string | null {
  return CATEGORY_ART[slug] ?? null
}
