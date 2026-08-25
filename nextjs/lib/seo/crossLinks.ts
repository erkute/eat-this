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
 * first. Links from the category hub into /bezirk/{slug}. Needs the bezirk
 * reference (slug), which only
 * restaurantsByCategoryQuery projects; restaurants with a plain district name
 * but no bezirk ref are skipped because they can't be linked.
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
