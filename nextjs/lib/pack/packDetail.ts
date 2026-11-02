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
