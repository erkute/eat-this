/** Category slug → booster pack art (public path). Canonical source for category art. */
const CATEGORY_ART: Record<string, string> = {
  breakfast: '/pics/booster/booster_breakfast.webp?v=2',
  coffee: '/pics/booster/booster_coffee.webp?v=2',
  dinner: '/pics/booster/booster_dinner.webp?v=2',
  drinks: '/pics/booster/booster_drinks.webp?v=2',
  'fast-food': '/pics/booster/booster_fastfood.webp?v=2',
  'fine-dining': '/pics/booster/booster_finedining.webp?v=2',
  lunch: '/pics/booster/booster_lunch.webp?v=2',
  pizza: '/pics/booster/booster_pizza.webp?v=2',
  sweets: '/pics/booster/booster_sweets.webp?v=2',
};

export function categoryArt(slug: string): string | null {
  return CATEGORY_ART[slug] ?? null;
}
