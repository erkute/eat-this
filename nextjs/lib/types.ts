export interface OpeningHourSlot {
  days: string
  hours: string
}

export interface RestaurantSeo {
  metaTitle?: string
  metaTitleEn?: string
  metaDescription?: string
  metaDescriptionEn?: string
  ogImageUrl?: string
  noIndex?: boolean
}

export interface CategoryRef {
  _id?: string
  slug: string
  /** DE label (e.g. "Café", "Frühstück"). Pre-migration: the raw legacy string. */
  name: string
  /** EN label (e.g. "Coffee", "Breakfast"). Pre-migration: null. */
  nameEn?: string
  /** Optional DE blurb for hub/SEO copy. */
  description?: string
  /** Optional EN blurb for hub/SEO copy. */
  descriptionEn?: string
}

export interface PriceRange {
  min?: number
  max?: number
  currency?: string
}

export interface Restaurant {
  _id: string
  name: string
  slug: string
  district?: string
  cuisineType?: string
  address?: string
  categories?: CategoryRef[]
  priceRange?: PriceRange
  lat: number
  lng: number
  mapsUrl?: string
  website?: string
  instagramHandle?: string
  reservationUrl?: string
  openingHours?: OpeningHourSlot[]
  tip?: string
  tipEn?: string
  shortDescription?: string
  shortDescriptionEn?: string
  description?: string
  descriptionEn?: string
  photo?: string
  photoCredit?: string
  photoCreditUrl?: string
  seo?: RestaurantSeo
  bezirk?: { _id: string; name: string; slug?: string }
}

export interface NewsArticleSeo {
  metaTitle?: string
  metaDescription?: string
  ogImageUrl?: string
  noIndex?: boolean
}

export type PortableTextBlock = { _type: string; _key?: string } & Record<string, unknown>

export interface NewsArticle {
  _id: string
  slug: string
  title: string
  titleDe?: string
  category?: string
  categoryLabel?: string
  categoryLabelDe?: string
  date: string
  imageUrl?: string
  alt?: string
  excerpt?: string
  excerptDe?: string
  content?: PortableTextBlock[]
  contentDe?: PortableTextBlock[]
  seo?: NewsArticleSeo
}

export interface StaticPageDoc {
  slug: string
  title: string
  titleDe?: string
  body?: PortableTextBlock[]
  bodyDe?: PortableTextBlock[]
}

export interface MustEatAlbumCard {
  _id: string
  dish: string
  restaurant: string
  district?: string
  price?: string
  imageUrl: string
  restaurantSlug?: string
  order?: number
}

export interface BezirkSeo {
  metaTitle?: string
  metaTitleEn?: string
  metaDescription?: string
  metaDescriptionEn?: string
  ogImageUrl?: string
  noIndex?: boolean
}

export interface BezirkDoc {
  _id: string
  name: string
  slug: string
  description?: string
  descriptionEn?: string
  imageUrl?: string
  seo?: BezirkSeo
  // Optional: only projected by allBezirkeWithStatsQuery; bezirkBySlugQuery does NOT include it.
  restaurantCount?: number
}

export interface RestaurantCard {
  _id: string
  name: string
  slug: string
  district?: string
  priceRange?: PriceRange
  cuisineType?: string
  categories?: CategoryRef[]
  shortDescription?: string
  shortDescriptionEn?: string
  tip?: string
  tipEn?: string
  photo?: string
}

export interface MapRestaurant {
  _id: string
  _createdAt: string
  name: string
  slug: string
  isClosed: boolean
  district?: string
  bezirk?: { name: string; slug?: string }
  address?: string
  categories?: CategoryRef[]
  priceRange?: PriceRange
  phone?: string
  lat: number
  lng: number
  mapsUrl?: string
  website?: string
  instagramHandle?: string
  reservationUrl?: string
  openingHours?: OpeningHourSlot[]
  tip?: string
  shortDescription?: string
  photo?: string
  photoCredit?: string
  photoCreditUrl?: string
  mustEatCount: number
}

export interface MapMustEat {
  _id: string
  dish: string
  description?: string
  price?: string
  image: string
  restaurant: {
    _id: string
    name: string
    slug: string
    lat: number
    lng: number
    district?: string
    address?: string
  }
}

export type MapLayer = 'restaurants' | 'mustEats'

/** Map category filter: 'All' or a category slug from Sanity. */
export type MapCategory = 'All' | string

export interface OpenStatus {
  isOpen: boolean
  label: string
  minutesUntilChange: number | null
}

// ── Landing Page (CMS-managed singleton) ────────────────────────────

export interface LandingHero {
  headlineDe: string
  headlineEn: string
  bodyDe: string
  bodyEn: string
  ctaLabelDe: string
  ctaLabelEn: string
  ctaHref: string
  imageUrl?: string
}

export interface LandingTrustBar {
  lineDe: string
  lineEn: string
}

export interface LandingMapPreview {
  headlineDe: string
  headlineEn: string
  bodyDe: string
  bodyEn: string
  screenshotUrl?: string
}

export interface LandingMustEats {
  headlineDe: string
  headlineEn: string
  bodyDe: string
  bodyEn: string
  ctaLabelDe?: string
  ctaLabelEn?: string
  ctaHref?: string
}

export interface LandingStatement {
  headlineDe: string
  headlineEn: string
  bodyDe: string
  bodyEn: string
}

export interface LandingInsideMap {
  headlineDe: string
  headlineEn: string
  itemsDe?: string[]
  itemsEn?: string[]
  screenshotUrls?: string[]
}

export interface LandingCategoriesSection {
  headlineDe: string
  headlineEn: string
}

export interface LandingRecentlyAdded {
  headlineDe: string
  headlineEn: string
  bodyDe?: string
  bodyEn?: string
  sectionCtaLabelDe?: string
  sectionCtaLabelEn?: string
}

export interface LandingPackTier {
  titleDe: string
  titleEn: string
  bodyDe: string
  bodyEn: string
  bulletsDe?: string[]
  bulletsEn?: string[]
  ctaLabelDe?: string
  ctaLabelEn?: string
  imageUrl?: string
}

export interface LandingPacks {
  headlineDe: string
  headlineEn: string
  bodyDe?: string
  bodyEn?: string
  starter: LandingPackTier
  category: LandingPackTier
  complete: LandingPackTier
}

export interface LandingNewsletter {
  headlineDe: string
  headlineEn: string
  bodyDe: string
  bodyEn: string
  ctaLabelDe?: string
  ctaLabelEn?: string
}

export interface LandingFinalCta {
  headlineDe: string
  headlineEn: string
  bodyDe?: string
  bodyEn?: string
  ctaLabelDe: string
  ctaLabelEn: string
  ctaHref: string
}

export interface LandingPageDoc {
  hero: LandingHero
  trustBar: LandingTrustBar
  mapPreview: LandingMapPreview
  mustEats: LandingMustEats
  howWeCurate: LandingStatement
  insideMap: LandingInsideMap
  categories: LandingCategoriesSection
  recentlyAdded: LandingRecentlyAdded
  packs: LandingPacks
  whyEatThis: LandingStatement
  newsletter: LandingNewsletter
  finalCta: LandingFinalCta
}

// ── Recently Added card (Restaurant + MustEat union) ───────────────

export interface RecentlyAddedCard {
  _id: string
  kind: 'restaurant' | 'mustEat'
  name: string
  slug: string
  bezirk?: string
  imageUrl: string
  href: string
  createdAt: string
}

// ── Categories grid tile ────────────────────────────────────────────

export interface CategoryGridTile {
  _id: string
  slug: string
  name: string
  nameEn?: string
  iconUrl?: string
}
