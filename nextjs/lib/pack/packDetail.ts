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

/**
 * Spot- und Kartenzahl einer Kategorie.
 *
 * Sie steht NIRGENDS in der Oberflaeche (Betreiber, 06.09.2026: „keine Anzahl
 * bitte erwaehnen"). Das Produkt nennt seine Zahlen nicht — dieselbe Regel,
 * unter der die Berlin-Zahl am 04.09.2026 vom Profil verschwand und unter der
 * der Einladungsbonus seine Groesse verschweigt.
 *
 * Gebraucht wird sie trotzdem, und zwar an genau einer Stelle: um zu wissen,
 * ob ein Pack ueberhaupt eine Karte traegt. Ein Pack mit null Karten ist eine
 * leere Schachtel und darf nicht verkauft werden — siehe /packs und
 * /api/stripe/checkout. Ohne sichtbare Zahl ist dieser Riegel das Einzige,
 * was einen Fehlkauf noch verhindert.
 */
export interface PackContents {
  spots: number;
  mustEats: number;
}

export interface PackContentsIndex {
  byCategory: Record<string, PackContents>;
  allBerlin: PackContents;
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
