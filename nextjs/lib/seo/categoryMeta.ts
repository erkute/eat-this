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
  lunch: {
    de: 'Mittagessen in Berlin: Die besten Lunch-Spots',
    en: 'The Best Lunch Spots in Berlin',
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

/**
 * Das Wort, mit dem Leute die Kategorie *suchen* — nicht das Katalog-Label.
 * Ohne das schreibt die deutsche Seite durchgehend „Lunch“, während gesucht
 * wird nach „Mittagessen“: GSC hatte `/kategorie/lunch` auf Pos. 37,7 für
 * „berlin mittagessen“, aber auf Pos. 9,5 für „best lunch berlin“ — die DE-
 * Seite konkurrierte mit ihrer eigenen EN-Version statt den DE-Markt zu
 * bedienen.
 *
 * `kind` steuert die Satzform: eine Mahlzeit braucht „Spots für {term}“,
 * ein Lokaltyp steht allein („die besten Cafés“). Ohne die Unterscheidung
 * kommt „Wo gibt es Café in Berlin“ heraus.
 */
export type CategoryTermKind = 'meal' | 'venue';

export interface CategorySearchTerm {
  term: string;
  kind: CategoryTermKind;
}

const CATEGORY_SEARCH_TERMS: Record<string, { de: CategorySearchTerm; en: CategorySearchTerm }> = {
  pizza: { de: { term: 'Pizza', kind: 'meal' }, en: { term: 'pizza', kind: 'meal' } },
  coffee: { de: { term: 'Cafés', kind: 'venue' }, en: { term: 'cafés', kind: 'venue' } },
  breakfast: {
    de: { term: 'Frühstück', kind: 'meal' },
    en: { term: 'breakfast', kind: 'meal' },
  },
  dinner: { de: { term: 'Abendessen', kind: 'meal' }, en: { term: 'dinner', kind: 'meal' } },
  lunch: { de: { term: 'Mittagessen', kind: 'meal' }, en: { term: 'lunch', kind: 'meal' } },
  drinks: { de: { term: 'Bars', kind: 'venue' }, en: { term: 'bars', kind: 'venue' } },
  'fine-dining': {
    de: { term: 'Fine Dining', kind: 'meal' },
    en: { term: 'fine dining', kind: 'meal' },
  },
  'fast-food': {
    de: { term: 'Fast Food', kind: 'meal' },
    en: { term: 'fast food', kind: 'meal' },
  },
  sweets: { de: { term: 'Dessert', kind: 'meal' }, en: { term: 'dessert', kind: 'meal' } },
};

/**
 * Suchbegriff + Satzform für eine Kategorie. Unbekannte Slugs fallen auf das
 * Label zurück und werden als Mahlzeit behandelt — die neutralere Satzform.
 */
export function categorySearchTerm(slug: string, label: string, locale: Loc): CategorySearchTerm {
  return CATEGORY_SEARCH_TERMS[slug]?.[locale] ?? { term: label, kind: 'meal' };
}

/**
 * Sichtbare H2 über der Restaurant-Liste — trägt die Ziel-Query im Klartext,
 * weil die H1 darüber auf ein einzelnes Display-Wort designt ist („LUNCH“).
 *
 * Bewusst „handverlesen“ statt „die besten“: der SERP-Title sagt schon „die
 * besten“, und für Kategorien wie `coffee` wären Title und H2 sonst wortgleich.
 */
export function buildCategorySectionHeading(slug: string, label: string, locale: Loc): string {
  const { term, kind } = categorySearchTerm(slug, label, locale);
  if (locale === 'de') {
    return kind === 'venue'
      ? `Handverlesene ${term} in Berlin`
      : `Handverlesene Spots für ${term} in Berlin`;
  }
  return kind === 'venue' ? `Hand-picked ${term} in Berlin` : `Hand-picked ${term} spots in Berlin`;
}

/**
 * H2 über dem Rest der Liste, unter der kuratierten Bestenliste. Bewusst ohne
 * Zahl und ohne „A–Z": beides beschrieb die Mechanik statt den Inhalt. Nur
 * gerendert, wenn es tatsächlich eine Bestenliste darüber gibt.
 */
export function buildCategoryDirectoryHeading(locale: Loc): string {
  return locale === 'de' ? 'Weitere Spots' : 'More spots';
}
