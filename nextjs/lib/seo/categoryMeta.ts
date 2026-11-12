import type { RestaurantCard } from '../types';
import { truncateMetadataDescription } from './metadata-text';

type Loc = 'de' | 'en';

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
  // Beide Titles nannten nur „Cafés" — das Wort, mit dem die Leute suchen,
  // fehlte auf beiden Seiten. GSC 28 Tage bis 24.08.2026: DE „kaffee berlin"
  // 42 Impr. auf Pos. 54,3 und „coffee berlin" 29 auf 63,1; EN „kaffee berlin"
  // 10 auf 29,3, „coffee in berlin" 6 auf 24. „Kaffee"/„Coffee" stand nur in
  // der H1 (Sanity-`name`), nie im Title.
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
  // EN wird so gesucht, wie der Title jetzt lautet: „best restaurants for
  // lunch" 2.713 Impr. auf Pos. 11,5, „where to go for lunch" 742 (GSC, 90
  // Tage bis 08.10.2026) — „lunch spots" in allen Varianten zusammen keine
  // 600. Die H2 darunter trägt „lunch spots" weiter.
  lunch: {
    de: 'Mittagessen in Berlin: Die besten Lunch-Spots',
    en: 'The Best Restaurants for Lunch in Berlin',
  },
  drinks: { de: 'Die besten Bars in Berlin', en: 'The Best Bars in Berlin' },
  'fine-dining': {
    de: 'Fine Dining in Berlin: Die besten Restaurants',
    en: 'The Best Fine Dining Restaurants in Berlin',
  },
  // Dieselbe Lücke wie bei `coffee`: die Aufzählung stand allein, der Oberbegriff
  // fehlte. „fast food berlin" (8 Impr., Pos. 34,5), „berlin fast food" (8 auf
  // 36,6) und „fastfood berlin" (4 auf 33) trafen einen Title ohne „Fast Food".
  // Die Aufzählung bleibt dahinter — sie trägt Burger und Döner.
  'fast-food': {
    de: 'Fast Food in Berlin: Burger, Döner & Tacos',
    en: 'Fast Food in Berlin: Burgers, Döner & Tacos',
  },
  // „Dessert" ist der DE-Suchbegriff („dessert berlin" 6 Impr. auf Pos. 60,2,
  // „desserts berlin" 3 auf 52), stand aber weder im Title noch in der H1 —
  // die heißt nach Sanity „Süßes", und danach sucht niemand.
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
 * (Spot-Anzahl + Trust-Signal) — unique pro Kategorie über das Blurb,
 * klick-relevanter als das Blurb allein. Satzgrenzen-Kürzung auf ≤155.
 *
 * Bewusst KEINE Restaurant-Namen mehr: `restaurants` kommt in Roh-
 * Reihenfolge (nicht „die besten zuerst"), sodass `slice(0,2)` früher
 * Datenmüll wie „u. a. 136 Berlin Restaurant, 1811" ins SERP-Snippet
 * gespült hat. Anzahl + „persönlich getestet" trägt das Vertrauen.
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
