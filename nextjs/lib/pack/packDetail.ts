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
 * Compare only category packs with currently available Must Eats to All Berlin.
 * Prices come from CATALOG; empty or missing categories cannot inflate savings.
 */
export function bundleSavings(contents: PackContentsIndex): {
  singleTotalCents: number;
  savedCents: number;
  /** Floored: a discount may read smaller than it is, never larger. */
  percent: number;
} {
  const singleTotalCents = Object.values(CATALOG)
    .filter(
      (p) => p.type === 'category' && p.slug && (contents.byCategory[p.slug]?.mustEats ?? 0) > 0
    )
    .reduce((sum, p) => sum + p.amountCents, 0);
  const savedCents = Math.max(0, singleTotalCents - CATALOG['all-berlin'].amountCents);
  return {
    singleTotalCents,
    savedCents,
    percent: singleTotalCents > 0 ? Math.floor((savedCents / singleTotalCents) * 100) : 0,
  };
}

/**
 * The euro figure is exact; the percentage is rounded downwards.
 * Hide the comparison when the available individual packs cost less.
 */
export function formatBundleSavings(locale: 'de' | 'en', contents: PackContentsIndex): string {
  const { singleTotalCents, savedCents, percent } = bundleSavings(contents);
  if (savedCents === 0) return '';
  const single = formatPackPrice(singleTotalCents);
  const saved = formatPackPrice(savedCents);
  return locale === 'de'
    ? `Verfügbare Packs einzeln ${single} · du sparst ${saved} (${percent} %)`
    : `Available packs: ${single} separately · you save ${saved} (${percent}%)`;
}
