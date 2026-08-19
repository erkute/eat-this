// Pure helpers for the booster pack routes (/pack/[slug] and /packs).
// Keep free of React / Sanity so they stay unit-testable.
import { CATALOG, type PackDef } from '@/lib/stripe-catalog';
import type { RestaurantCard } from '@/lib/types';

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

interface PackTeaserRow {
  name: string;
  district?: string;
}
interface PackTeaser {
  /** First N spots shown by name + district (the hook). */
  revealed: PackTeaserRow[];
  /** Next M spots — district only, name stays covered until purchase. */
  locked: { district?: string }[];
}

/**
 * Split a category's restaurants into a small revealed teaser + a couple of
 * covered rows. Names of locked rows are deliberately withheld.
 *
 * Restaurants are alphabetical, so a chain puts its branches side by side —
 * Breakfast opened on "01 AERA · Mitte / 02 AERA · Charlottenburg", which reads
 * like a thin pack rather than two genuinely different rooms. One row per name
 * in the revealed part; the branches are still in the pack and still counted.
 */
export function buildPackTeaser(
  restaurants: RestaurantCard[],
  revealCount = 3,
  lockedCount = 2
): PackTeaser {
  const seen = new Set<string>();
  const distinct = restaurants.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
  const revealed = distinct.slice(0, revealCount).map((r) => ({
    name: r.name,
    district: r.district,
  }));
  const locked = distinct
    .slice(revealCount, revealCount + lockedCount)
    .map((r) => ({ district: r.district }));
  return { revealed, locked };
}

/** Spot + Must-Eat totals a pack puts on the map. */
export interface PackContents {
  spots: number;
  mustEats: number;
}

export interface PackContentsIndex {
  byCategory: Record<string, PackContents>;
  allBerlin: PackContents;
}

/**
 * "341 Spots · 22 Must Eats" — All Berlin only. Category packs deliberately
 * never state their size: Dinner carries 226 of 341 spots and Lunch 206, so
 * "226 Spots · 2,99 €" next to the bundle argues against the bundle. A category
 * pack sells on what is in it; only All Berlin sells on how much.
 * Packs without a Must Eat yet say only the spots rather than advertising zero.
 */
export function formatPackContents({ spots, mustEats }: PackContents, locale: 'de' | 'en'): string {
  const spotLabel =
    locale === 'de'
      ? `${spots} ${spots === 1 ? 'Spot' : 'Spots'}`
      : `${spots} ${spots === 1 ? 'spot' : 'spots'}`;
  if (mustEats === 0) return spotLabel;
  return `${spotLabel} · ${mustEats} ${mustEats === 1 ? 'Must Eat' : 'Must Eats'}`;
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
