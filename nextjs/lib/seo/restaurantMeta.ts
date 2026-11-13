import { localizedCuisine } from '../cuisineLabels';
import {
  buildPlainTitle,
  METADATA_TITLE_MAX,
  truncateMetadataDescription,
} from './metadata-text';

/**
 * SERP-Title für Restaurant-Seiten: `{Name} – {Label} in Berlin-{Bezirk}`.
 * Edge-Cases: Name enthält "Berlin" → kein Doppel-Berlin; über Budget →
 * Label fällt weg, Standort-Keyword bleibt. Sanity `seo.metaTitle`
 * überschreibt den Builder im Aufrufer.
 *
 * Ohne Marken-Suffix, aus demselben Grund wie auf den Bezirksseiten (siehe
 * `buildPlainTitle`): die 11 Zeichen kosteten hier mehr als sie brachten.
 * Gemessen am 27.08.2026 über alle 466 kuratierten Titel — 166 der deutschen
 * und 162 der englischen lagen über den verbleibenden 49 Zeichen und wurden
 * mitten im Satz gekappt, und gekappt wurde die zweite Hälfte: der Bezirk.
 * "Long March Canteen — Chinesische Tapas in…" verlor sein Standort-Keyword,
 * "KEIT Friedrichshain – Sauerteigbäckerei mit…" seine Spezialität. Mit den
 * vollen 60 Zeichen bleiben zwei DE- und ein EN-Titel übrig. Der Median liegt
 * bei 47 Zeichen: die Titel sind für 60 geschrieben, nicht für 49.
 */
export function buildRestaurantTitle(opts: {
  name: string;
  cuisineType?: string | null;
  district?: string | null;
  locale: 'de' | 'en';
}): string {
  const { name, cuisineType, district, locale } = opts;
  const label = cuisineType ? localizedCuisine(cuisineType, locale) : null;
  const nameHasBerlin = /berlin/i.test(name);
  const place = district
    ? nameHasBerlin
      ? `in ${district}`
      : `in Berlin-${district}`
    : nameHasBerlin
      ? null
      : 'in Berlin';

  const compose = (mid: string | null) => (mid ? `${name} – ${mid}` : name);

  const full = compose([label, place].filter(Boolean).join(' ') || null);
  const locationOnly = compose(
    district ? (nameHasBerlin ? district : `Berlin-${district}`) : place
  );
  const candidates = label ? [full, locationOnly, name] : [full, name];
  const selected = candidates.find((candidate) => candidate.length <= METADATA_TITLE_MAX) ?? name;
  return buildPlainTitle(selected);
}

/**
 * Behält gepflegte Sanity-Titles, ergänzt aber fehlende Filialqualifizierer
 * aus dem Restaurantnamen. Beispiel: beide „Hokey Pokey"-Titles werden über
 * „Stargarder"/„Oderberger" eindeutig, ohne Datenmigration.
 *
 * Dazu die Stadt, wenn der Title sie nicht nennt (siehe `withCity`).
 */
export function buildCuratedRestaurantTitle(
  title: string,
  name: string,
  district?: string | null
): string {
  const cleanTitle = title.trim().replace(/\s+/g, ' ');
  const separator = cleanTitle.match(/\s(?:—|–|-)\s|:\s/);
  if (!separator?.index) return buildPlainTitle(withCity(cleanTitle, district));

  const lead = cleanTitle.slice(0, separator.index);
  const normalizedLead = lead.toLocaleLowerCase('de');
  const normalizedName = name.trim().toLocaleLowerCase('de');
  const qualified = normalizedName.startsWith(`${normalizedLead} `)
    ? `${name.trim()}${cleanTitle.slice(separator.index)}`
    : cleanTitle;
  return buildPlainTitle(withCity(qualified, district));
}

/**
 * „in Kreuzberg" → „in Berlin-Kreuzberg", sonst „, Berlin" am Ende — beides
 * nur, solange der Title danach noch in die 60 Zeichen passt.
 *
 * Der Builder oben schreibt die Stadt immer mit, die kuratierten Titles fast
 * nie: am 09.10.2026 nannten 230 der 248 deutschen und 223 der englischen
 * „Berlin" nicht. Gesucht wird aber genau so: „tacos el rey berlin", „gemello
 * berlin", „bari berlin restaurant" — 43 % der Impressionen der
 * Restaurantseiten (GSC, 90 Tage bis 08.10.2026) kamen über Suchen mit
 * „berlin", bei 0,3 % CTR auf Position 9,8. Ein Title, der beide Wörter der
 * Suche trägt, passt zur Anfrage und wird im Ergebnis fett gesetzt.
 */
function withCity(title: string, district: string | null | undefined): string {
  if (/berlin/i.test(title)) return title;
  const fits = (candidate: string) => candidate.length <= METADATA_TITLE_MAX;

  if (district) {
    const escaped = district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Der letzte Treffer: steht der Bezirk auch im Namen („Bonanza Coffee
    // Mitte – Specialty Coffee in Mitte"), ist der hintere der Ort.
    const matches = [...title.matchAll(new RegExp(`(?:\\bin |, )${escaped}(?![\\p{L}-])`, 'gu'))];
    const last = matches.at(-1);
    if (last?.index !== undefined) {
      const at = last.index + last[0].length - district.length;
      const candidate = `${title.slice(0, at)}Berlin-${title.slice(at)}`;
      if (fits(candidate)) return candidate;
      return title;
    }
  }

  const appended = `${title}, Berlin`;
  return fits(appended) ? appended : title;
}

/**
 * SERP-Title für Spots, deren Seite zur Speisekarte verlinkt: `{Name} Berlin:
 * Karte, Preise & Öffnungszeiten`. Er nennt nur, was die Seite zeigt — „Preise"
 * und „Öffnungszeiten" fallen weg, wo die Angabe fehlt. Passt nichts in die 60
 * Zeichen oder bliebe nur „Karte" übrig, kommt `null` zurück und der Aufrufer
 * nimmt den redaktionellen Title.
 *
 * Gesucht wird der Laden beim Namen, und oft mit dem, was man von ihm wissen
 * will: 266 Anfragen mit „Karte", „Menü" oder „menu" brachten in 28 Tagen (GSC
 * bis 10.11.2026) 4.362 Impressionen auf Position 7,8 bei 0,5 % CTR; „gemello
 * karte" stand auf 4,6 ohne einen Klick. Ein Title, der das Wort der Suche
 * trägt, passt zur Anfrage und wird im Ergebnis fett gesetzt.
 *
 * Nur mit Speisekarten-Link (83 von 251 Spots am 13.11.2026): ohne ihn wäre
 * „Karte" eine leere Zusage. Die übrigen Spots behalten den redaktionellen
 * Title und sind damit die Vergleichsgruppe für die CTR.
 */
export function buildMenuRestaurantTitle(opts: {
  name: string;
  hasPrice: boolean;
  hasHours: boolean;
  locale: 'de' | 'en';
}): string | null {
  const { hasPrice, hasHours, locale } = opts;
  const name = opts.name.trim().replace(/\s+/g, ' ');
  const de = locale === 'de';
  const menu = de ? 'Karte' : 'Menu';
  const price = de ? 'Preise' : 'Prices';
  const hours = de ? 'Öffnungszeiten' : 'Opening Hours';

  const list = (parts: string[]) =>
    parts.length > 2
      ? `${parts.slice(0, -1).join(', ')} & ${parts.at(-1)}`
      : parts.join(' & ');
  const full = [menu, hasPrice && price, hasHours && hours].filter(
    (part): part is string => Boolean(part)
  );
  if (full.length < 2) return null;
  // Ohne „Preise", wenn es eng wird: die Stadt ist das Wort der Suche.
  const short = hasHours ? [menu, hours] : full;
  const withCity = /berlin/i.test(name) ? name : `${name} Berlin`;

  const candidates = [
    `${withCity}: ${list(full)}`,
    `${withCity}: ${list(short)}`,
    `${name}: ${list(short)}`,
  ];
  return candidates.find((candidate) => candidate.length <= METADATA_TITLE_MAX) ?? null;
}

/**
 * Meta-Description-Kürzung auf ≤max Zeichen an der letzten Satzgrenze
 * (statt Google-Hard-Cut mitten im Wort). Ohne Satzende im Fenster:
 * Wortgrenze + Ellipse.
 */
export const truncateAtSentence = truncateMetadataDescription;
