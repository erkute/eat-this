/**
 * Remys Vektor-Index ist die einzige Datei im Repo, die stumm veralten kann.
 *
 * `lib/buddy/restaurant-embeddings.json` wird von Hand gebaut
 * (`npm run embed:restaurants`) und von `lib/buddy/semanticSearch.ts` gelesen.
 * Nichts hält sie mit Sanity synchron. Ein Spot, der nach dem letzten Bau
 * dazukommt, fehlt darin — und `applySemanticOrder` gibt allem Unbekannten
 * Rang `Infinity`. Er wird also nicht herausgefiltert, landet aber hinter
 * jedem indizierten Kandidaten und damit nie unter den zwei bis vier, die
 * Remy vorstellt.
 *
 * Genau so ist es passiert: am 06.09.2026 kannte der Index 340 Spots, live
 * waren 465. Drei Monate lang, ohne dass etwas rot wurde — das Verhalten
 * sieht von außen aus wie eine Kuratierungslücke, nicht wie ein Defekt.
 *
 * Dieses Modul trägt beides, worauf sich der Wächter stützt: den Katalog-
 * schnitt, den der Index abbilden SOLL, und die Prüfungen darauf. Die
 * Prüfungen sind rein — der Netzzugriff liegt in `scripts/check-embeddings.ts`.
 */

import { SPOT_SLUG_RE } from '../../lib/buddy/stream';

/** Pfad des Index, relativ zu `nextjs/`. */
export const EMBEDDINGS_PATH = 'lib/buddy/restaurant-embeddings.json';

/**
 * Der Schnitt, den `embed-restaurants.ts` einbettet — und gegen den der
 * Wächter zählt. Beide importieren ihn hier, sonst prüfte man am Ende einen
 * anderen Katalog als den, der eingebettet wurde, und meldete Drift, die
 * keine ist.
 *
 * Abweichung mit Ansage: `liveRestaurant()` aus `lib/sanity-filters.ts`
 * schreibt `isOpen != false`, hier steht `isOpen == true`. Remys Abruf
 * (`lib/buddy/retrieval.ts`) filtert seit jeher so, und der Index muss
 * Remys Schnitt abbilden, nicht den der Seiten. Heute liefern beide dieselben
 * 465 Spots; sie fallen erst auseinander, wenn ein Dokument gar kein
 * `isOpen` gesetzt hat.
 */
export const EMBEDDED_RESTAURANTS_FILTER =
  '_type == "restaurant" && isOpen == true && isClosed != true && defined(slug.current)';

/** Alle Slugs des Schnitts — die Vergleichsmenge des Wächters. */
export const LIVE_SLUGS_QUERY = `*[${EMBEDDED_RESTAURANTS_FILTER}].slug.current`;

export interface EmbeddingsIndex {
  model: string;
  dim: number;
  count: number;
  vectors: Record<string, number[]>;
}

/**
 * Kein eigenes Muster: der Wächter prüft gegen genau die Zeichenklasse, an
 * der zur Laufzeit der Marker und der Seitenkontext hängen. Eine Kopie hier
 * würde irgendwann von ihr abweichen — und dann grün melden, was Remy nicht
 * darstellen kann.
 */
const MARKER_SAFE_SLUG = SPOT_SLUG_RE;

/**
 * Prüft den Index gegen sich selbst — ohne Netz, also auch offline und in
 * jedem `npm test`. Fängt den halb geschriebenen oder mit falschem Modell
 * gebauten Index, nicht den veralteten (dafür braucht es den Katalog).
 */
export function checkIndexShape(
  index: EmbeddingsIndex,
  expected: { model: string; dim: number }
): string[] {
  const findings: string[] = [];
  const slugs = Object.keys(index.vectors ?? {});

  if (slugs.length === 0) {
    findings.push(
      'Der Index ist leer — semanticRank fällt dauerhaft auf die Keyword-Reihenfolge zurück.'
    );
    return findings;
  }
  if (index.model !== expected.model) {
    findings.push(
      `Modell ${index.model} statt ${expected.model} — Abfrage- und Dokumentvektoren stammen dann aus verschiedenen Räumen, die Kosinuswerte sind bedeutungslos.`
    );
  }
  if (index.dim !== expected.dim) {
    findings.push(`dim ${index.dim} statt ${expected.dim}.`);
  }
  if (index.count !== slugs.length) {
    findings.push(`count sagt ${index.count}, es sind ${slugs.length} Vektoren.`);
  }

  const wrongLength: string[] = [];
  const degenerate: string[] = [];
  const badSlug: string[] = [];
  for (const [slug, vec] of Object.entries(index.vectors)) {
    if (!MARKER_SAFE_SLUG.test(slug)) badSlug.push(slug);
    if (!Array.isArray(vec) || vec.length !== index.dim) {
      wrongLength.push(slug);
      continue;
    }
    // Ein Nullvektor gibt in `cosine` immer 0 und rankt damit still nach
    // hinten; ein NaN vergiftet den Vergleich komplett.
    if (!vec.some((x) => x !== 0) || vec.some((x) => !Number.isFinite(x))) degenerate.push(slug);
  }
  if (wrongLength.length > 0) {
    findings.push(
      `${wrongLength.length} Vektoren haben nicht ${index.dim} Werte: ${sample(wrongLength)}`
    );
  }
  if (degenerate.length > 0) {
    findings.push(
      `${degenerate.length} Vektoren sind null oder enthalten NaN/Infinity: ${sample(degenerate)}`
    );
  }
  if (badSlug.length > 0) {
    findings.push(
      `${badSlug.length} Slugs passen nicht zur Marker-Zeichenklasse [a-z0-9-] und könnten nie als Karte erscheinen: ${sample(badSlug)}`
    );
  }
  return findings;
}

export interface DriftReport {
  live: number;
  indexed: number;
  /** Live, aber ohne Vektor — die rutschen bei semantischem Ranking ans Ende. */
  missing: string[];
  /** Im Index, aber nicht mehr im Katalog. Harmlos: GROQ liefert sie nie als
   *  Kandidat, sie belegen nur Platz in der Datei. */
  orphans: string[];
  missingPct: number;
  overBudget: boolean;
}

/**
 * Vergleicht den Index mit dem Katalog. `maxMissingPct` ist der Anteil
 * fehlender Spots, ab dem es rot wird — nicht null, weil ein einzelner neuer
 * Laden sonst jeden PR blockierte, und deutlich unter den 27 %, mit denen der
 * Drift zuletzt unbemerkt lief.
 */
export function compareToCatalog(
  indexSlugs: Iterable<string>,
  liveSlugs: Iterable<string>,
  maxMissingPct: number
): DriftReport {
  const indexed = new Set(indexSlugs);
  const live = new Set(liveSlugs);
  const missing = [...live].filter((s) => !indexed.has(s)).sort();
  const orphans = [...indexed].filter((s) => !live.has(s)).sort();
  // Ohne Katalogdaten gibt es nichts zu vergleichen — das ist eine Störung der
  // Quelle, kein Befund über den Index. Der Aufrufer entscheidet.
  const missingPct = live.size === 0 ? 0 : (missing.length / live.size) * 100;
  return {
    live: live.size,
    indexed: indexed.size,
    missing,
    orphans,
    missingPct,
    overBudget: live.size > 0 && missingPct > maxMissingPct,
  };
}

function sample(list: string[], n = 5): string {
  return list.slice(0, n).join(', ') + (list.length > n ? ` … (+${list.length - n})` : '');
}
