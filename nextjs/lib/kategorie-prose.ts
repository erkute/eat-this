import type { RestaurantCard } from './types';
import type { FAQEntry } from './restaurant-prose';
import { categorySearchTerm } from './seo/categoryMeta';

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

/** Price range across the category (min of mins, max of maxes). */
function priceSpan(
  restaurants: RestaurantCard[]
): { min: number; max: number; currency: string } | null {
  let min = Infinity;
  let max = -Infinity;
  let currency = '€';
  for (const r of restaurants) {
    const p = r.priceRange;
    if (!p) continue;
    if (typeof p.min === 'number') min = Math.min(min, p.min);
    if (typeof p.max === 'number') max = Math.max(max, p.max);
    if (p.currency) currency = p.currency === 'EUR' ? '€' : p.currency;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max, currency };
}

/**
 * Wie „vorzeigbar“ ein Name in einer Aufzählung ist.
 *
 * Die Liste kommt alphabetisch aus Sanity (`order(name asc)`), also lieferte
 * ein blankes `slice(0, 5)` als „bekannte Adressen“ Antworten wie „136 Berlin
 * Restaurant, 1811, 3 Minutes sur Mer, 893 Ryōtei, 963“ — und das ging als
 * FAQPage-Schema an Google. Namen, die mit einem Buchstaben beginnen, kommen
 * zuerst; danach entscheidet gepflegter Redaktions-Content.
 */
function showcaseRank(r: RestaurantCard): [number, number] {
  const startsWithLetter = /^\p{L}/u.test(r.name) ? 1 : 0;
  let content = 0;
  if (r.tip || r.tipEn) content += 2;
  if (r.shortDescription || r.shortDescriptionEn) content += 2;
  if (r.photo) content += 1;
  return [startsWithLetter, content];
}

/**
 * Deterministische Auswahl der Namen, die in Fließtext-Aufzählungen landen.
 * Stabil sortiert (Alphabet als Tie-Break), damit SSG-Output nicht zwischen
 * Builds springt.
 *
 * Ziffern-Namen fallen ganz raus, solange genug echte Namen übrig bleiben —
 * eine kurze Aufzählung ist besser als eine, die mit „963“ aufgefüllt wird.
 */
function pickShowcase(restaurants: RestaurantCard[], limit = 5): RestaurantCard[] {
  const ranked = restaurants
    .map((r, i) => ({ r, i, rank: showcaseRank(r) }))
    .sort((a, b) => b.rank[0] - a.rank[0] || b.rank[1] - a.rank[1] || a.i - b.i);
  const named = ranked.filter((x) => x.rank[0] === 1);
  const pool = named.length >= Math.min(3, ranked.length) ? named : ranked;
  return pool.slice(0, limit).map((x) => x.r);
}

function showcaseNames(restaurants: RestaurantCard[], limit = 5): string {
  return pickShowcase(restaurants, limit)
    .map((r) => r.name)
    .join(', ');
}

/** One-line factual summary that sits below the kategorie header. */
export function buildKategorieQuickFacts({
  slug,
  label,
  restaurants,
  locale,
}: KategorieContext): string | null {
  const count = restaurants.length;
  if (count === 0) return null;
  const de = locale === 'de';
  const { term, kind } = categorySearchTerm(slug, label, locale);
  const districts = districtBreakdown(restaurants);
  const span = priceSpan(restaurants);

  // Erstes und zweites Segment hängen an einem Gedankenstrich, sonst entsteht
  // „… in Berlin. die meisten in Mitte“ — Kleinbuchstabe nach Punkt.
  const head = de
    ? kind === 'venue'
      ? `${count} von Eat This kuratierte ${term} in Berlin`
      : `${count} von Eat This kuratierte Spots für ${term} in Berlin`
    : kind === 'venue'
      ? `${count} Eat This-curated ${term} in Berlin`
      : `${count} Eat This-curated ${term} spots in Berlin`;

  const top = districts
    .slice(0, 3)
    .map((d) => d.name)
    .join(', ');
  const lead =
    districts.length > 1
      ? `${head} – ${de ? `die meisten in ${top}` : `most of them in ${top}`}`
      : head;

  if (!span) return `${lead}.`;
  const price = de
    ? `Preisspanne ${span.min}–${span.max} ${span.currency}`
    : `prices ${span.min}–${span.max} ${span.currency}`;
  return `${lead}. ${de ? price : price.charAt(0).toUpperCase() + price.slice(1)}.`;
}

/** FAQ entries derived from the category's restaurant list. */
export function buildKategorieFAQEntries({
  slug,
  label,
  restaurants,
  locale,
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
    const highlights = showcaseNames(restaurants);
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

  // 4. Budget spots (max <= 20)
  const budget = restaurants.filter(
    (r) => typeof r.priceRange?.max === 'number' && r.priceRange.max! <= 20
  );
  if (budget.length > 0) {
    const list = showcaseNames(budget);
    entries.push(
      de
        ? {
            question: `Wo gibt es ${term} in Berlin für kleines Geld?`,
            answer: `Im unteren Preissegment (bis 20 €): ${list}.`,
          }
        : {
            question: `Where can I get ${term} in Berlin on a budget?`,
            answer: `In the lower price range (up to €20): ${list}.`,
          }
    );
  }

  // 5. Higher-end spots (min >= 40)
  const fineDining = restaurants.filter(
    (r) => typeof r.priceRange?.min === 'number' && r.priceRange.min! >= 40
  );
  if (fineDining.length > 0) {
    const list = showcaseNames(fineDining);
    entries.push(
      de
        ? {
            question: `Welche ${subject} in Berlin sind gehoben?`,
            answer: `Im höheren Preissegment (ab 40 €): ${list}.`,
          }
        : {
            question: `Which ${subject} in Berlin are higher-end?`,
            answer: `In the higher price range (from €40): ${list}.`,
          }
    );
  }

  return entries;
}
