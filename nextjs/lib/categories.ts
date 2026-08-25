import type { CategoryRef, RestaurantCard } from './types';

/**
 * Category data is sourced from the `category` document type in Sanity.
 * Use `getAllCategories()` / `getCategoryBySlug()` from `lib/sanity.server`
 * to fetch the canonical list at build/request time.
 *
 * This module only exposes locale-resolution helpers so consumers don't
 * each re-implement the DE/EN fallback logic.
 */

export interface CategoryDef {
  _id?: string;
  slug: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  /**
   * Slugs of the curated best-of list, in editorial order. Only projected by
   * `categoryBySlugQuery`; the hub listing doesn't need it.
   */
  topSpots?: string[];
}

/**
 * Eine Kategorie samt Hub-Zahlen. Nur `allCategoriesWithStatsQuery` projiziert
 * diese Felder — dieselbe Aufteilung wie bei `BezirkDoc`, wo die Detail-Query
 * die Statistik ebenfalls weglässt.
 */
export interface CategoryWithStats extends CategoryDef {
  /** Offene Spots dieser Kategorie. */
  restaurantCount?: number;
  /** Alphabetische Auswahl mit publizierbarem Foto, Featured zuerst. */
  exampleRestaurants?: Pick<
    RestaurantCard,
    '_id' | 'name' | 'slug' | 'cuisineType' | 'priceRange' | 'photo'
  >[];
  /**
   * Kuratierte Bestenliste in redaktioneller Reihenfolge (`category.topSpots`
   * im Studio), als aufgelöste Karten — das Regal soll damit anfangen dürfen.
   */
  topSpotCards?: (Pick<
    RestaurantCard,
    '_id' | 'name' | 'slug' | 'cuisineType' | 'priceRange' | 'photo'
  > & { isOpen?: boolean })[];
}

/** DE/EN display label for a category, falling back to the other locale when one is missing. */
export function localizedCategoryName(cat: CategoryRef | CategoryDef, locale: 'de' | 'en'): string {
  if (locale === 'en') return cat.nameEn || cat.name;
  return cat.name || cat.nameEn || cat.slug;
}

/** DE/EN blurb for a category — empty string when neither is set. */
export function localizedCategoryBlurb(cat: CategoryDef, locale: 'de' | 'en'): string {
  if (locale === 'en') return cat.descriptionEn || cat.description || '';
  return cat.description || cat.descriptionEn || '';
}
