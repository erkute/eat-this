/**
 * Remys Vektor-Indizes sind die einzigen Dateien im Repo, die stumm veralten
 * koennen.
 *
 * `lib/buddy/restaurant-embeddings.json` und `lib/buddy/article-embeddings.json`
 * werden von Hand gebaut (`npm run embed:restaurants`, `npm run embed:articles`)
 * und zur Laufzeit von `lib/buddy/semanticSearch.ts` gelesen. Nichts haelt sie
 * mit Sanity synchron. Was nach dem letzten Bau dazukam, fehlt darin — und
 * `applySemanticOrder` gibt allem Unbekannten Rang `Infinity`. Es wird also
 * nicht herausgefiltert, landet aber hinter jedem indizierten Kandidaten.
 *
 * Genau so ist es passiert: am 06.09.2026 kannte der Spot-Index 340 von 465
 * Spots. Drei Monate lang, ohne dass etwas rot wurde — das Verhalten sieht von
 * aussen aus wie eine Kuratierungsluecke, nicht wie ein Defekt.
 *
 * Dieses Modul traegt beides, worauf sich der Waechter stuetzt: den Schnitt,
 * den jeder Index abbilden SOLL, und die Pruefungen darauf. Die Pruefungen sind
 * rein — der Netzzugriff liegt in `scripts/check-embeddings.ts`.
 */
import { SPOT_SLUG_RE } from '../../lib/buddy/stream';

/** Was ein Index abdeckt und woran er gemessen wird. */
export interface IndexSpec {
  /** Fuer die Ausgabe des Waechters. */
  label: string;
  /** Pfad der JSON, relativ zu `nextjs/`. */
  path: string;
  /** GROQ-Praedikat des Schnitts, den der Index abbilden soll. */
  filter: string;
  /** Alle Slugs des Schnitts — die Vergleichsmenge. */
  slugsQuery: string;
  /** Anteil fehlender Eintraege, ab dem der Waechter rot wird. */
  maxMissingPct: number;
  /** Womit der Index neu gebaut wird. */
  rebuildCommand: string;
}

const slugsQuery = (filter: string) => `*[${filter}].slug.current`;

/**
 * Abweichung mit Ansage: `liveRestaurant()` aus `lib/sanity-filters.ts`
 * schreibt `isOpen != false`, hier steht `isOpen == true`. Remys Abruf
 * (`lib/buddy/retrieval.ts`) filtert seit jeher so, und der Index muss Remys
 * Schnitt abbilden, nicht den der Seiten. Heute liefern beide dieselben Spots;
 * sie fallen erst auseinander, wenn ein Dokument gar kein `isOpen` gesetzt hat.
 */
const RESTAURANT_FILTER =
  '_type == "restaurant" && isOpen == true && isClosed != true && defined(slug.current)';

const ARTICLE_FILTER = '_type == "newsArticle" && defined(slug.current)';

export const SPOT_INDEX: IndexSpec = {
  label: 'Spots',
  path: 'lib/buddy/restaurant-embeddings.json',
  filter: RESTAURANT_FILTER,
  slugsQuery: slugsQuery(RESTAURANT_FILTER),
  // Nicht null: ein einzelner neuer Laden wuerde sonst jeden PR blockieren.
  // Deutlich unter den 27 %, mit denen der Drift zuletzt unbemerkt lief.
  maxMissingPct: 5,
  rebuildCommand: 'npm run embed:restaurants',
};

export const ARTICLE_INDEX: IndexSpec = {
  label: 'Artikel',
  path: 'lib/buddy/article-embeddings.json',
  filter: ARTICLE_FILTER,
  slugsQuery: slugsQuery(ARTICLE_FILTER),
  // Strenger als bei den Spots, weil der Bestand klein ist: bei 24 Artikeln
  // waeren 5 % rechnerisch ein einzelner — und der faellt bei den Artikeln
  // schwerer ins Gewicht, weil die semantische Suche dort nicht bloss
  // umsortiert, sondern die Treffermenge bestimmt.
  maxMissingPct: 0,
  rebuildCommand: 'npm run embed:articles',
};

export const ALL_INDEXES: readonly IndexSpec[] = [SPOT_INDEX, ARTICLE_INDEX];

export interface EmbeddingsIndex {
  model: string;
  dim: number;
  count: number;
  vectors: Record<string, number[]>;
}

/**
 * Kein eigenes Muster: geprueft wird gegen genau die Zeichenklasse, an der zur
 * Laufzeit der `[[spot:…]]`-Marker und der Seitenkontext haengen. Eine Kopie
 * hier wuerde irgendwann von ihr abweichen — und dann gruen melden, was Remy
 * nicht darstellen kann. Fuer Artikel ist es dieselbe Frage eine Ebene weiter:
 * der Slug wird zu `/news/<slug>`.
 */
const PATH_SAFE_SLUG = SPOT_SLUG_RE;

/**
 * Prueft einen Index gegen sich selbst — ohne Netz, also auch offline und in
 * jedem `npm test`. Faengt den halb geschriebenen oder mit falschem Modell
 * gebauten Index, nicht den veralteten (dafuer braucht es den Katalog).
 */
export function checkIndexShape(
  index: EmbeddingsIndex,
  expected: { model: string; dim: number }
): string[] {
  const findings: string[] = [];
  const slugs = Object.keys(index.vectors ?? {});

  if (slugs.length === 0) {
    findings.push(
      'Der Index ist leer — semanticRank faellt dauerhaft auf die Keyword-Reihenfolge zurueck.'
    );
    return findings;
  }
  if (index.model !== expected.model) {
    findings.push(
      `Modell ${index.model} statt ${expected.model} — Abfrage- und Dokumentvektoren stammen dann aus verschiedenen Raeumen, die Kosinuswerte sind bedeutungslos.`
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
    if (!PATH_SAFE_SLUG.test(slug)) badSlug.push(slug);
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
      `${badSlug.length} Slugs passen nicht zur Zeichenklasse [A-Za-z0-9-] und koennten nie verlinkt werden: ${sample(badSlug)}`
    );
  }
  return findings;
}

export interface DriftReport {
  live: number;
  indexed: number;
  /** Live, aber ohne Vektor. */
  missing: string[];
  /** Im Index, aber nicht mehr im Katalog. Harmlos: GROQ liefert sie nie als
   *  Kandidat, sie belegen nur Platz in der Datei. */
  orphans: string[];
  missingPct: number;
  overBudget: boolean;
}

export function compareToCatalog(
  indexSlugs: Iterable<string>,
  liveSlugs: Iterable<string>,
  maxMissingPct: number
): DriftReport {
  const indexed = new Set(indexSlugs);
  const live = new Set(liveSlugs);
  const missing = [...live].filter((s) => !indexed.has(s)).sort();
  const orphans = [...indexed].filter((s) => !live.has(s)).sort();
  // Ohne Katalogdaten gibt es nichts zu vergleichen — das ist eine Stoerung der
  // Quelle, kein Befund ueber den Index. Der Aufrufer entscheidet.
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
