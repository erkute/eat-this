import type { RestaurantCard } from '../types';
import { localizedCategoryName } from '../categories';

interface CrossLink {
  slug: string;
  label: string;
  count: number;
}

function rank(map: Map<string, CrossLink>, limit: number): CrossLink[] {
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * Distinct districts represented in a category's restaurant list, most-common
 * first. Needs the bezirk reference (slug), which only
 * restaurantsByCategoryQuery projects; restaurants with a plain district name
 * but no bezirk ref are skipped because they carry nothing to match on.
 *
 * Feeds the district chips on the category hub (`limit: Infinity` — a filter
 * has to offer every represented district, or cards sit behind no chip at all).
 * The default limit is for link rows, where the list is a recommendation
 * rather than a complete set.
 */
export function categoryDistrictLinks(
  restaurants: Array<Pick<RestaurantCard, 'bezirk' | 'district'>>,
  limit = 8
): CrossLink[] {
  const tally = new Map<string, CrossLink>();
  for (const r of restaurants) {
    const slug = r.bezirk?.slug;
    const label = r.bezirk?.name;
    if (!slug || !label) continue;
    const existing = tally.get(slug);
    if (existing) existing.count += 1;
    else tally.set(slug, { slug, label, count: 1 });
  }
  return rank(tally, limit);
}

/**
 * Die Gegenrichtung: die Kategorien, die in einem Bezirk vertreten sind,
 * häufigste zuerst. Verlinkt vom Bezirks-Hub nach `/kategorie/{slug}`.
 *
 * Bis hierher lief die Verlinkung einseitig — die Kategorie-Seiten zeigten über
 * `categoryDistrictLinks` längst in die Bezirke, zurück kam nichts. Damit hingen
 * die Kategorie-Hubs intern nur am `/kategorie`-Index und an der Startseiten-Rail.
 *
 * `categories` liefert `restaurantsByBezirkQuery` bereits mit (CATEGORY_PROJECTION),
 * eine zusätzliche Abfrage braucht es also nicht. Das Label folgt der Seitensprache;
 * gezählt und entdoppelt wird über den Slug, weil DE und EN denselben Hub meinen.
 */
export function bezirkCategoryLinks(
  restaurants: Array<Pick<RestaurantCard, 'categories'>>,
  locale: 'de' | 'en',
  limit = 8
): CrossLink[] {
  const tally = new Map<string, CrossLink>();
  for (const r of restaurants) {
    for (const c of r.categories ?? []) {
      if (!c?.slug) continue;
      const existing = tally.get(c.slug);
      if (existing) {
        existing.count += 1;
        continue;
      }
      const label = localizedCategoryName(c, locale);
      if (!label) continue;
      tally.set(c.slug, { slug: c.slug, label, count: 1 });
    }
  }
  return rank(tally, limit);
}

/**
 * Die Kategorieseiten, denen ein Magazin-Guide dieselbe Frage beantwortet.
 *
 * Vorgeschichte: `/guides/beste-cafes-berlin` und `/kategorie/coffee` haben
 * sich gegenseitig aus dem Index gedrängt (derselbe Fall wie bei den
 * Bäckereien, siehe die Redirect-Liste in next.config.ts). Der `/guides/`-Pfad
 * ist seitdem 308 auf die Kategorieseite — der gleichnamige Sanity-Artikel
 * unter `/news/beste-cafes-berlin` lebt aber weiter und trägt praktisch
 * denselben Titel wie der Hub.
 *
 * Ein Redirect wäre hier falsch: die beiden Seiten sind nicht dasselbe. Der Hub
 * listet jeden Café-Spot, der Guide erzählt vierzehn davon aus. Was fehlte, war
 * die Beziehung — der Hub verlinkte den Artikel mit keinem einzigen Wort,
 * womit für Google zwei konkurrierende Antworten nebeneinander standen statt
 * Übersicht und Vertiefung. Diese Zeile stellt sie her.
 *
 * Erweiterbar um jedes weitere Paar, das sich dieselbe Query teilt — eine
 * Zeile pro Kategorie, der Guide muss publiziert sein.
 */
const CATEGORY_GUIDE: Record<string, string> = {
  coffee: 'beste-cafes-berlin',
};

/**
 * Der Guide-Slug zu einer Kategorie, oder `null` — die meisten haben keinen.
 *
 * `Object.hasOwn` statt eines schlichten Zugriffs: der Slug kommt aus der URL,
 * und `/kategorie/constructor` würde sonst die geerbte Object-Methode treffen
 * und einen Link auf `/news/function%20Object()` bauen.
 */
export function categoryGuideSlug(categorySlug: string): string | null {
  return Object.hasOwn(CATEGORY_GUIDE, categorySlug) ? CATEGORY_GUIDE[categorySlug] : null;
}
