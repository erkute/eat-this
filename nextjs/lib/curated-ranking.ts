import type { RestaurantCard } from './types';

/**
 * Reihenfolge einer Restaurant-Liste: kuratierte Bestenliste oben, Rest als
 * vollständiges Verzeichnis darunter. Genutzt von den Bezirks-Seiten
 * (`bezirk.topSpots`) und den Kategorie-Seiten (`category.topSpots`).
 *
 * Kuratiert statt berechnet, weil der Datensatz kein Qualitätssignal trägt: die
 * Texte entstehen beim Import, Herzen sind zu wenige. Jede Formel darüber
 * erzeugt eine Reihenfolge, die kuratiert aussieht und Zufall ist. Die
 * Rangfolge kommt deshalb aus dem Studio (AGENTS.md, Gewollte Produktlogik).
 */

/**
 * Unter so vielen Einträgen wird die Bestenliste nicht gerendert — die Liste
 * fällt auf reines A–Z zurück. Verhindert eine „Die 1 besten"-Sektion, während
 * die Redaktion mitten im Kuratieren ist.
 */
export const MIN_CURATED = 3;

interface CuratedRanking {
  /** Kuratierte Spots in redaktioneller Reihenfolge. Leer = keine Bestenliste. */
  top: RestaurantCard[];
  /** Alle übrigen Spots, alphabetisch, Ziffern-Namen am Ende. */
  rest: RestaurantCard[];
}

/** Beginnt der Name mit einem Buchstaben (statt „136…", „1811", „963")? */
function startsWithLetter(name: string): boolean {
  return /^\p{L}/u.test(name);
}

/**
 * Wie ein Leser das Alphabet erwartet: Groß- und Kleinschreibung zählen nicht,
 * Umlaute stehen bei ihrem Grundbuchstaben, „Restaurant 2" vor „Restaurant 10".
 */
const directoryCollator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });

/**
 * Alphabetisch, Ziffern-Namen ans Ende.
 *
 * Nicht die GROQ-Reihenfolge (`order(name asc)`): Die sortiert nach
 * Codepunkten, jeder kleingeschriebene Name („barlevain", „jaja", „otto") und
 * jeder Umlaut („Österelli") landete hinter Z. Mit den Buchstaben-Marken des
 * Verzeichnisses wäre das ein zweites „B" nach dem „Z".
 */
function directoryOrder(restaurants: RestaurantCard[]): RestaurantCard[] {
  return [...restaurants].sort(
    (a, b) =>
      Number(startsWithLetter(b.name)) - Number(startsWithLetter(a.name)) ||
      directoryCollator.compare(a.name, b.name)
  );
}

/**
 * Teilt eine Restaurant-Liste in Bestenliste + Verzeichnis.
 *
 * Robust gegen alles, was im Studio passieren kann: Referenzen auf inzwischen
 * geschlossene Restaurants (`isOpen == false` fliegt schon in GROQ raus) oder
 * auf Spots, die nicht mehr zur Liste gehören, werden übersprungen statt als
 * Lücke gerendert; Doppelreferenzen zählen einmal.
 */
export function rankCurated(
  restaurants: RestaurantCard[],
  curatedSlugs?: string[]
): CuratedRanking {
  const bySlug = new Map(restaurants.map((r) => [r.slug, r]));
  const top: RestaurantCard[] = [];
  const curated = new Set<string>();

  for (const slug of curatedSlugs ?? []) {
    if (curated.has(slug)) continue;
    const restaurant = bySlug.get(slug);
    if (!restaurant) continue;
    curated.add(slug);
    top.push(restaurant);
  }

  if (top.length < MIN_CURATED) {
    return { top: [], rest: directoryOrder(restaurants) };
  }
  return { top, rest: directoryOrder(restaurants.filter((r) => !curated.has(r.slug))) };
}
