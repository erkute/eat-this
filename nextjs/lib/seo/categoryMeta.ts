import type { RestaurantCard } from '../types';
import { truncateMetadataDescription } from './metadata-text';

type Loc = 'de' | 'en';

/**
 * SERP-Titles für Kategorie-Seiten in der Sprache, in der Leute suchen („beste
 * pizza berlin", „best cafés berlin"), statt des Katalog-Labels. Brandlos: die
 * Marke hängt das Layout an (unter app/[locale]/ nie Brand-Suffix hardcoden).
 *
 * Kuratierte Map pro Slug, weil deutsche Grammatik kein generisches „Die besten
 * {Label} in Berlin" erlaubt („Die besten Pizza" ist kaputt). Neue Kategorien
 * fallen auf `{Label} in Berlin` zurück.
 */
const CATEGORY_TITLES: Record<string, { de: string; en: string }> = {
  pizza: { de: 'Die beste Pizza in Berlin', en: 'The Best Pizza in Berlin' },
  // Der Title nennt „Kaffee" bzw. „Coffee": Das ist das Wort, mit dem gesucht
  // wird („kaffee berlin", „coffee berlin", „coffee in berlin"). In der H1
  // (Sanity-`name`) allein reicht es nicht.
  coffee: {
    de: 'Kaffee in Berlin: Die besten Cafés',
    en: 'The Best Coffee & Cafés in Berlin',
  },
  breakfast: {
    de: 'Frühstück & Brunch in Berlin: Die besten Spots',
    en: 'Breakfast & Brunch in Berlin: The Best Spots',
  },
  dinner: {
    de: 'Abendessen in Berlin: Die besten Restaurants',
    en: 'Dinner in Berlin: The Best Restaurants',
  },
  // EN wird so gesucht, wie der Title lautet: „best restaurants for lunch" und
  // „where to go for lunch" haben ein Vielfaches der Impressionen von „lunch
  // spots" in allen Varianten. Die H2 darunter trägt „lunch spots".
  lunch: {
    de: 'Mittagessen in Berlin: Die besten Lunch-Spots',
    en: 'The Best Restaurants for Lunch in Berlin',
  },
  drinks: { de: 'Die besten Bars in Berlin', en: 'The Best Bars in Berlin' },
  'fine-dining': {
    de: 'Fine Dining in Berlin: Die besten Restaurants',
    en: 'The Best Fine Dining Restaurants in Berlin',
  },
  // Dieselbe Lücke wie bei `coffee`: gesucht wird mit „fast food berlin", und
  // der Oberbegriff gehört in den Title. Die Aufzählung bleibt dahinter, sie
  // trägt Burger und Döner.
  'fast-food': {
    de: 'Fast Food in Berlin: Burger, Döner & Tacos',
    en: 'Fast Food in Berlin: Burgers, Döner & Tacos',
  },
  // „Dessert" ist der DE-Suchbegriff; die H1 heißt nach Sanity „Süßes", und
  // danach sucht niemand.
  sweets: {
    de: 'Dessert in Berlin: Eis, Donuts & Patisserie',
    en: 'Dessert in Berlin: Ice Cream, Donuts & Pastry',
  },
};

export function buildCategoryTitle(slug: string, label: string, locale: Loc): string {
  const curated = CATEGORY_TITLES[slug];
  if (curated) return curated[locale];
  return `${label} in Berlin`;
}

/** Die H1 folgt der Suchsprache; der Kategorie-Name bleibt für Navigation und Filter unverändert. */
export function buildCategoryHeading(slug: string, label: string, locale: Loc): string {
  return slug === 'lunch' && locale === 'de' ? 'Mittagessen' : label;
}

/**
 * Meta-Description: kuratiertes Sanity-Blurb + datengetriebener Zusatz
 * (Spot-Anzahl + Trust-Signal), unique pro Kategorie über das Blurb.
 * Satzgrenzen-Kürzung auf ≤155.
 *
 * Bewusst keine Restaurant-Namen: `restaurants` kommt in Roh-Reihenfolge, nicht
 * die besten zuerst. Anzahl + „persönlich getestet" trägt das Vertrauen.
 */
export function buildCategoryDescription({
  blurb,
  restaurants,
  locale,
}: {
  blurb: string;
  restaurants: RestaurantCard[];
  locale: Loc;
}): string | undefined {
  const de = locale === 'de';
  const parts: string[] = [];
  if (blurb) parts.push(blurb.trim());
  if (restaurants.length >= 3) {
    parts.push(
      de
        ? `${restaurants.length} kuratierte Spots, alle persönlich getestet.`
        : `${restaurants.length} curated spots, every one tested in person.`
    );
  }
  if (parts.length === 0) return undefined;
  return truncateMetadataDescription(parts.join(' '));
}
