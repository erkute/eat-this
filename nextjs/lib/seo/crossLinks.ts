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
 * häufigste zuerst, verlinkt vom Bezirks-Hub nach `/kategorie/{slug}`.
 *
 * `categories` liefert `restaurantsByBezirkQuery` bereits mit
 * (CATEGORY_PROJECTION). Das Label folgt der Seitensprache; gezählt und
 * entdoppelt wird über den Slug, weil DE und EN denselben Hub meinen.
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
 * Hub und Guide konkurrieren sonst um dieselbe Suche: Der Sanity-Artikel unter
 * `/news/beste-cafes-berlin` trägt praktisch denselben Titel wie
 * `/kategorie/coffee`. Ein Redirect wäre falsch, die beiden Seiten sind nicht
 * dasselbe: Der Hub listet jeden Café-Spot, der Guide erzählt einige davon aus.
 * Diese Zeile stellt die Beziehung her, Übersicht und Vertiefung statt zwei
 * konkurrierender Antworten. (Die alten `/guides/`-Pfade leiten auf die
 * Kategorieseiten weiter, siehe next.config.ts.)
 *
 * Mehrere Guides pro Hub sind der Normalfall: `sweets` nennt in seinem eigenen
 * Title „Eis, Donuts & Patisserie" und hat für jedes davon einen. Die
 * Reihenfolge folgt dieser Aufzählung.
 */
const CATEGORY_GUIDES: Record<string, readonly string[]> = {
  coffee: ['beste-cafes-berlin'],
  pizza: ['beste-pizzerien-berlin'],
  dinner: ['restaurant-date-berlin', 'beste-italiener-berlin'],
  'fine-dining': ['fine-dining-berlin'],
  breakfast: ['bester-brunch-berlin'],
  drinks: ['beste-cocktailbars-berlin', 'beste-weinbars-berlin'],
  sweets: ['beste-eisdielen-berlin', 'donuts-berlin', 'beste-baeckereien-berlin'],
  'fast-food': ['beste-burger-berlin'],
};

/**
 * Dieselbe Beziehung für die Bezirke. `essen-trinken-schoeneberg` bricht das
 * Namensmuster der übrigen; die Zuordnung läuft deshalb über diese Tabelle und
 * nicht über den Slug.
 */
const BEZIRK_GUIDES: Record<string, readonly string[]> = {
  mitte: ['restaurants-mitte'],
  kreuzberg: ['restaurants-kreuzberg'],
  neukoelln: ['restaurants-neukoelln'],
  'prenzlauer-berg': ['restaurants-prenzlauer-berg'],
  charlottenburg: ['restaurants-charlottenburg'],
  schoeneberg: ['essen-trinken-schoeneberg'],
};

/**
 * `Object.hasOwn` statt eines schlichten Zugriffs: der Slug kommt aus der URL,
 * und `/kategorie/constructor` würde sonst die geerbte Object-Methode treffen
 * und einen Link auf `/news/function%20Object()` bauen.
 */
function lookup(table: Record<string, readonly string[]>, slug: string): readonly string[] {
  return Object.hasOwn(table, slug) ? table[slug] : [];
}

/** Die Guide-Slugs zu einer Kategorie — leer, wenn es keinen gibt. */
export function categoryGuideSlugs(categorySlug: string): readonly string[] {
  return lookup(CATEGORY_GUIDES, categorySlug);
}

/** Die Guide-Slugs zu einem Bezirk — leer, wenn es keinen gibt. */
export function bezirkGuideSlugs(bezirkSlug: string): readonly string[] {
  return lookup(BEZIRK_GUIDES, bezirkSlug);
}
