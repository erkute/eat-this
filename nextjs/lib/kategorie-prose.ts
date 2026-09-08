import type { RestaurantCard } from './types';
import type { FAQEntry } from './restaurant-prose';
import { categorySearchTerm } from './seo/categoryMeta';
import { pickShowcase } from './curated-ranking';

type Loc = 'de' | 'en';

/**
 * Auto-generated prose blocks for the kategorie detail page.
 *
 * Same goal as bezirk-prose: lift unique word count above Google's
 * thin-content bar. Each helper derives from the list of restaurants the
 * page already loads, so no extra Sanity calls are needed.
 *
 * Die Prosa spricht bewusst im Suchvokabular („Mittagessen“) statt im
 * Katalog-Label („Lunch“) — sonst liest sich die deutsche Seite für Google
 * wie ein Duplikat der englischen. Siehe `categorySearchTerm`.
 */

interface KategorieContext {
  /** Kategorie-Slug — bestimmt Suchbegriff und Satzform. */
  slug: string;
  label: string;
  restaurants: RestaurantCard[];
  locale: Loc;
  /**
   * Die kuratierte Bestenliste der Seite, bereits aufgelöst und sortiert
   * (`rankCurated().top`). Leer/undefined für Kategorien ohne
   * gepflegte `topSpots`.
   *
   * Bewusst die fertigen Karten statt der Slugs: so kann die FAQ gar nicht
   * andere Namen nennen als die Bestenliste, die darüber steht.
   */
  curated?: RestaurantCard[];
}

/** Counts of the top districts represented in this category. */
function districtBreakdown(
  restaurants: RestaurantCard[],
  limit = 4
): { name: string; count: number }[] {
  const tally = new Map<string, number>();
  for (const r of restaurants) {
    if (!r.district) continue;
    tally.set(r.district, (tally.get(r.district) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** FAQ entries derived from the category's restaurant list. */
export function buildKategorieFAQEntries({
  slug,
  label,
  restaurants,
  locale,
  curated,
}: KategorieContext): FAQEntry[] {
  const de = locale === 'de';
  const entries: FAQEntry[] = [];
  if (restaurants.length === 0) return entries;

  const { term, kind } = categorySearchTerm(slug, label, locale);
  const venue = kind === 'venue';
  // Präpositionalphrase, die in jeder Frage trägt: „Spots für Mittagessen“
  // bzw. schlicht „Cafés“.
  const subject = de ? (venue ? term : `Spots für ${term}`) : venue ? term : `${term} spots`;

  // 1. How many
  entries.push(
    de
      ? {
          question: `Wie viele ${subject} in Berlin empfiehlt Eat This?`,
          answer: `Aktuell stehen ${restaurants.length} kuratierte ${subject} in Berlin auf Eat This.`,
        }
      : {
          question: `How many ${subject} in Berlin does Eat This recommend?`,
          answer: `Eat This Berlin currently features ${restaurants.length} curated ${subject}.`,
        }
  );

  // 2. Districts
  const districts = districtBreakdown(restaurants, 5);
  if (districts.length > 1) {
    const list = districts.map((d) => `${d.name} (${d.count})`).join(', ');
    entries.push(
      de
        ? {
            question: `In welchen Bezirken findet man ${term} in Berlin?`,
            answer: `Die Auswahl verteilt sich u. a. auf ${list}.`,
          }
        : {
            question: `Which districts are best for ${term} in Berlin?`,
            answer: `The selection spreads across ${list}.`,
          }
    );
  }

  // 3. Highlights
  if (restaurants.length >= 3) {
    // Gibt es eine redaktionelle Bestenliste, ist sie die ehrliche Antwort auf
    // „bekannte Adressen“ — und identisch mit dem, was oben auf der Seite steht.
    // Sonst greift die Heuristik, die immerhin Ziffern-Namen hinten einsortiert.
    const picks = curated?.length ? curated : pickShowcase(restaurants);
    const highlights = picks
      .slice(0, 5)
      .map((r) => r.name)
      .join(', ');
    entries.push(
      de
        ? {
            question: venue
              ? `Was sind bekannte ${term} in Berlin?`
              : `Was sind bekannte Adressen für ${term} in Berlin?`,
            answer: `Aus der Auswahl: ${highlights}.`,
          }
        : {
            question: venue
              ? `What are some notable ${term} in Berlin?`
              : `What are some notable places for ${term} in Berlin?`,
            answer: `Highlights from the selection: ${highlights}.`,
          }
    );
  }

  return entries;
}
