import type { RestaurantCard } from './types';

/**
 * Reihenfolge einer Restaurant-Liste: kuratierte Bestenliste oben, Rest als
 * vollständiges Verzeichnis darunter. Genutzt von den Bezirks-Seiten
 * (`bezirk.topSpots`) und den Kategorie-Seiten (`category.topSpots`) — dieselbe
 * Mechanik, ein Modul.
 *
 * Warum kuratiert statt berechnet: Der Datensatz enthält kein Qualitätssignal.
 * `tip`, `shortDescription` und `description` werden beim Import generiert und
 * sind zu 100 % gefüllt (340/340), Herzen gibt es 12 auf 340 Spots. Jede Formel
 * darüber erzeugt eine Reihenfolge, die kuratiert *aussieht* und Zufall ist —
 * schlechter als alphabetisch, weil alphabetisch wenigstens ehrlich willkürlich
 * ist. Die Rangfolge kommt deshalb aus dem Studio.
 *
 * Entscheidung und aktuelle Mechanik: docs/architecture.md#redaktionelle-reihenfolge
 */

/**
 * Unter so vielen Einträgen wird die Bestenliste nicht gerendert — die Liste
 * fällt auf reines A–Z zurück. Verhindert eine „Die 1 besten"-Sektion, während
 * die Redaktion mitten im Kuratieren ist.
 */
export const MIN_CURATED = 3;

export interface CuratedRanking {
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
 * Bis 25.09.2026 blieb hier die GROQ-Reihenfolge stehen (`order(name asc)`).
 * Die sortiert aber nach Codepunkten: jeder kleingeschriebene Name („barlevain",
 * „jaja", „otto") und jeder Umlaut („Österelli") landete HINTER Z — im
 * Dinner-Verzeichnis elf Spots, die dort niemand sucht. Seit das Verzeichnis
 * Buchstaben-Marken trägt, wäre das ein zweites „B" nach dem „Z" gewesen.
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

/**
 * Die Karten, die ein Hub auf der Übersichtsseite zeigt: kuratierte Spots
 * zuerst, danach mit der alphabetischen Auswahl aufgefüllt.
 *
 * Ohne Kuratierung ist das Ergebnis exakt die alphabetische Auswahl von vorher
 * — die Umstellung ist für ungepflegte Bezirke unsichtbar.
 *
 * Anders als `rankCurated` greift hier bewusst keine `MIN_CURATED`-Schwelle:
 * ein Regal behauptet keine Rangfolge, es zeigt nur vier Bilder. Ein einzelner
 * kuratierter Spot darf deshalb vorn stehen, ohne dass eine „Bestenliste"
 * daraus wird.
 *
 * Erwartet bereits gefilterte Eingaben (offen, mit Foto) — was ein Regal zeigen
 * darf, entscheidet die Seite, nicht diese Funktion.
 */
export function pickShelf<T extends { slug: string }>(
  curated: readonly T[] | null | undefined,
  fill: readonly T[] | null | undefined,
  limit: number
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of [...(curated ?? []), ...(fill ?? [])]) {
    if (out.length >= limit) break;
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    out.push(item);
  }
  return out;
}

/**
 * Das Titelfoto eines Hubs im Ausgang der Nachbarseiten: das erste Foto aus
 * seinem Regal — kuratiert zuerst, wie die Bildleiste auf der Übersicht.
 * `taken` sammelt die schon vergebenen: ein Spot führt oft zwei Kategorien
 * an (Frühstück und Kaffee), in der Leiste soll er nicht zweimal stehen.
 */
export function shelfPhoto(
  hub: {
    topSpotCards?: readonly { photo?: string | null }[] | null;
    exampleRestaurants?: readonly { photo?: string | null }[] | null;
  },
  taken: Set<string> = new Set()
): string | null {
  const shelf = [...(hub.topSpotCards ?? []), ...(hub.exampleRestaurants ?? [])];
  const photo = shelf.find((r) => r.photo && !taken.has(r.photo))?.photo ?? null;
  if (photo) taken.add(photo);
  return photo;
}
