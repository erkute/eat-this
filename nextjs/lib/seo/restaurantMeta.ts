import { localizedCuisine } from '../cuisineLabels';
import {
  buildBrandedTitle,
  METADATA_TITLE_TEXT_MAX,
  truncateMetadataDescription,
} from './metadata-text';

/**
 * SERP-Title für Restaurant-Seiten: `{Name} – {Label} in Berlin-{Bezirk}`.
 * Edge-Cases: Name enthält "Berlin" → kein Doppel-Berlin; über Budget →
 * Label fällt weg, Standort-Keyword bleibt. Sanity `seo.metaTitle`
 * überschreibt den Builder im Aufrufer.
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
  const selected =
    candidates.find((candidate) => candidate.length <= METADATA_TITLE_TEXT_MAX) ?? name;
  return buildBrandedTitle(selected);
}

/**
 * Behält gepflegte Sanity-Titles, ergänzt aber fehlende Filialqualifizierer
 * aus dem Restaurantnamen. Beispiel: beide „Hokey Pokey"-Titles werden über
 * „Stargarder"/„Oderberger" eindeutig, ohne Datenmigration.
 */
export function buildCuratedRestaurantTitle(title: string, name: string): string {
  const cleanTitle = title.trim().replace(/\s+/g, ' ');
  const separator = cleanTitle.match(/\s(?:—|–|-)\s|:\s/);
  if (!separator?.index) return buildBrandedTitle(cleanTitle);

  const lead = cleanTitle.slice(0, separator.index);
  const normalizedLead = lead.toLocaleLowerCase('de');
  const normalizedName = name.trim().toLocaleLowerCase('de');
  const qualified = normalizedName.startsWith(`${normalizedLead} `)
    ? `${name.trim()}${cleanTitle.slice(separator.index)}`
    : cleanTitle;
  return buildBrandedTitle(qualified);
}

/**
 * Meta-Description-Kürzung auf ≤max Zeichen an der letzten Satzgrenze
 * (statt Google-Hard-Cut mitten im Wort). Ohne Satzende im Fenster:
 * Wortgrenze + Ellipse.
 */
export const truncateAtSentence = truncateMetadataDescription;
