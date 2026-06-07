import type { RestaurantCard } from '../types'
import { truncateAtSentence } from './restaurantMeta'

type Loc = 'de' | 'en'

/**
 * SERP-Titles für Kategorie-Seiten in der Sprache, in der Leute suchen
 * („beste pizza berlin", „best cafés berlin") — statt des Katalog-Labels
 * „Pizza in Berlin". Brandlos: das Layout-Template hängt „| Eat This
 * Berlin" an (unter app/[locale]/ NIE Brand-Suffix hardcoden).
 *
 * Kuratierte Map pro Slug, weil deutsche Grammatik kein generisches
 * „Die besten {Label} in Berlin" erlaubt (… „Die besten Pizza" ist kaputt).
 * Neue Kategorien fallen auf das alte `{Label} in Berlin` zurück.
 */
const CATEGORY_TITLES: Record<string, { de: string; en: string }> = {
  pizza: { de: 'Die beste Pizza in Berlin', en: 'The Best Pizza in Berlin' },
  coffee: { de: 'Die besten Cafés in Berlin', en: 'The Best Cafés in Berlin' },
  breakfast: {
    de: 'Frühstück & Brunch in Berlin: Die besten Spots',
    en: 'Breakfast & Brunch in Berlin: The Best Spots',
  },
  dinner: {
    de: 'Abendessen in Berlin: Die besten Restaurants',
    en: 'Dinner in Berlin: The Best Restaurants',
  },
  lunch: {
    de: 'Mittagessen in Berlin: Die besten Lunch-Spots',
    en: 'The Best Lunch Spots in Berlin',
  },
  drinks: { de: 'Die besten Bars in Berlin', en: 'The Best Bars in Berlin' },
  'fine-dining': {
    de: 'Fine Dining in Berlin: Die besten Restaurants',
    en: 'The Best Fine Dining Restaurants in Berlin',
  },
  'fast-food': {
    de: 'Burger, Döner & Tacos: Die besten Spots in Berlin',
    en: 'Burgers, Döner & Tacos: The Best Spots in Berlin',
  },
  sweets: {
    de: 'Eis, Donuts & Patisserie: Die besten süßen Spots in Berlin',
    en: 'Ice Cream, Donuts & Pastry: The Best Sweet Spots in Berlin',
  },
}

export function buildCategoryTitle(slug: string, label: string, locale: Loc): string {
  const curated = CATEGORY_TITLES[slug]
  if (curated) return curated[locale]
  return `${label} in Berlin`
}

/**
 * Meta-Description: kuratiertes Sanity-Blurb + datengetriebener Zusatz
 * (Spot-Anzahl + Beispiel-Namen) — unique pro Kategorie, klick-relevanter
 * als das Blurb allein. Satzgrenzen-Kürzung auf ≤160.
 */
export function buildCategoryDescription({
  blurb,
  restaurants,
  locale,
}: {
  blurb: string
  restaurants: RestaurantCard[]
  locale: Loc
}): string | undefined {
  const de = locale === 'de'
  const parts: string[] = []
  if (blurb) parts.push(blurb.trim())
  if (restaurants.length >= 3) {
    const names = restaurants.slice(0, 2).map(r => r.name).join(', ')
    parts.push(
      de
        ? `${restaurants.length} kuratierte Spots, u. a. ${names}.`
        : `${restaurants.length} curated spots, incl. ${names}.`,
    )
  }
  if (parts.length === 0) return undefined
  return truncateAtSentence(parts.join(' '))
}
