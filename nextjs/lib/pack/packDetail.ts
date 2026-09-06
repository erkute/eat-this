// Pure helpers for the booster pack routes (/pack/[slug] and /packs).
// Keep free of React / Sanity so they stay unit-testable.
import { CATALOG, type PackDef } from '@/lib/stripe-catalog';

/** URL slug for a pack detail page: the category slug, or 'all-berlin'. */
export function packUrlSlug(pack: PackDef): string {
  return pack.slug ?? 'all-berlin';
}

/** Resolve a /pack/[slug] URL segment to its catalog pack, or null. */
export function resolvePackByUrlSlug(slug: string): PackDef | null {
  return Object.values(CATALOG).find((p) => packUrlSlug(p) === slug) ?? null;
}

/** Mockup price style: "2,99 €" for fractional, "20 €" for whole euros. */
export function formatPackPrice(amountCents: number): string {
  const euros = Math.floor(amountCents / 100);
  const cents = amountCents % 100;
  if (cents === 0) return `${euros} €`;
  return `${euros},${String(cents).padStart(2, '0')} €`;
}

/** Eine Karte, wie die Pack-Seite sie auflistet: Nummer und Ort, kein Gericht. */
export interface PackCard {
  _id: string;
  /** Die Nummer unten rechts auf der gedruckten Karte. */
  order?: number;
  name: string;
  district?: string;
}

/** Spot- und Kartenzahl einer Kategorie. `spots` zaehlt nur noch mit, wie
 *  breit die Kategorie ist — verkauft werden die Karten. */
export interface PackContents {
  spots: number;
  mustEats: number;
}

export interface PackContentsIndex {
  byCategory: Record<string, PackContents>;
  allBerlin: PackContents;
}

/**
 * "22 Karten" — was ein Pack enthaelt.
 *
 * Bis zum 06.09.2026 stand hier "340 Spots · 22 Must Eats", und die
 * Kategorie-Packs nannten ihre Groesse bewusst NICHT: Dinner trug 225 von 340
 * Spots, und "225 Spots · 2,99 €" neben dem Buendel argumentierte gegen das
 * Buendel. Mit Karten ist das Gegenteil richtig — die Zahlen sind klein,
 * vergleichbar und SIND das Produkt. Ein Pack, das seine Kartenzahl
 * verschweigt, verkauft eine Katze im Sack.
 *
 * Ein Pack ohne Karte sagt das offen, statt eine Null zu drucken: der Satz
 * gehoert zu einer Ware, die es noch nicht gibt.
 */
export function formatPackContents({ mustEats }: PackContents, locale: 'de' | 'en'): string {
  if (locale === 'de') {
    if (mustEats === 0) return 'Noch keine Karte drin';
    return `${mustEats} ${mustEats === 1 ? 'Karte' : 'Karten'}`;
  }
  if (mustEats === 0) return 'No card in it yet';
  return `${mustEats} ${mustEats === 1 ? 'card' : 'cards'}`;
}

/**
 * What the nine category packs cost bought one at a time, against All Berlin.
 * Derived from CATALOG rather than written down, so adding a tenth pack or
 * moving a price cannot leave a stale claim on the page.
 */
export function bundleSavings(): {
  singleTotalCents: number;
  savedCents: number;
  /** Floored: a discount may read smaller than it is, never larger. */
  percent: number;
} {
  const singleTotalCents = Object.values(CATALOG)
    .filter((p) => p.type === 'category')
    .reduce((sum, p) => sum + p.amountCents, 0);
  const savedCents = singleTotalCents - CATALOG['all-berlin'].amountCents;
  return {
    singleTotalCents,
    savedCents,
    percent: Math.floor((savedCents / singleTotalCents) * 100),
  };
}

/**
 * "Einzeln 26,91 € · du sparst 6,91 € (25 %)" — the line that was missing next
 * to every All-Berlin CTA. The euro figure is exact; only the percentage is
 * rounded, and downwards.
 */
export function formatBundleSavings(locale: 'de' | 'en'): string {
  const { singleTotalCents, savedCents, percent } = bundleSavings();
  const single = formatPackPrice(singleTotalCents);
  const saved = formatPackPrice(savedCents);
  return locale === 'de'
    ? `Einzeln ${single} · du sparst ${saved} (${percent} %)`
    : `${single} separately · you save ${saved} (${percent}%)`;
}
