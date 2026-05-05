// The fixed category list mirrors the `restaurant.categories` enum in the
// Sanity schema. Slugs are URL-safe (lowercase ASCII); the canonical value
// (used for GROQ filtering against `categories[]`) is the original mixed-case
// string. Labels are bilingual.

export interface CategoryDef {
  slug: string
  value: string
  labelDe: string
  labelEn: string
  blurbDe: string
  blurbEn: string
}

export const CATEGORIES: readonly CategoryDef[] = [
  {
    slug: 'dinner',
    value: 'Dinner',
    labelDe: 'Dinner',
    labelEn: 'Dinner',
    blurbDe: 'Berlins beste Restaurants zum Abendessen — von Bistro bis Tasting Menu.',
    blurbEn: "Berlin's best dinner spots — from neighbourhood bistros to tasting menus.",
  },
  {
    slug: 'lunch',
    value: 'Lunch',
    labelDe: 'Lunch',
    labelEn: 'Lunch',
    blurbDe: 'Mittagspause in Berlin — schnelle Klassiker und kuratierte Lunch-Spots.',
    blurbEn: 'Lunch in Berlin — fast classics and curated lunch spots.',
  },
  {
    slug: 'breakfast',
    value: 'Breakfast',
    labelDe: 'Frühstück',
    labelEn: 'Breakfast',
    blurbDe: 'Frühstück und Brunch in Berlin — von der Bäckerei bis zum Eggs Benedict.',
    blurbEn: 'Breakfast and brunch in Berlin — from the corner bakery to eggs benedict.',
  },
  {
    slug: 'coffee',
    value: 'Coffee',
    labelDe: 'Kaffee',
    labelEn: 'Coffee',
    blurbDe: 'Specialty Coffee, Röstereien und Cafés — wo Berlin ernsthaft Kaffee trinkt.',
    blurbEn: 'Specialty coffee, roasteries, and cafés — where Berlin drinks coffee seriously.',
  },
  {
    slug: 'sweets',
    value: 'Sweets',
    labelDe: 'Süßes',
    labelEn: 'Sweets',
    blurbDe: 'Patisserie, Eis, Donuts und Schokolade — Berlins süße Adressen.',
    blurbEn: "Pastry, ice cream, donuts and chocolate — Berlin's sweet addresses.",
  },
  {
    slug: 'pizza',
    value: 'Pizza',
    labelDe: 'Pizza',
    labelEn: 'Pizza',
    blurbDe: 'Pizza in Berlin — Napoletana, römische Schnitte, Sourdough und alles dazwischen.',
    blurbEn: 'Pizza in Berlin — Napoletana, Roman al taglio, sourdough and everything in between.',
  },
] as const

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find(c => c.slug === slug)
}
