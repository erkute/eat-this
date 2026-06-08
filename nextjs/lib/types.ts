export interface OpeningHourSlot {
  days: string
  hours: string
}

interface RestaurantSeo {
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

interface PriceRange {
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

interface NewsArticleSeo {
  metaTitle?: string
  metaDescription?: string
  ogImageUrl?: string
  noIndex?: boolean
}

export type PortableTextBlock = { _type: string; _key?: string } & Record<string, unknown>

// Inline "Must Eat" block embedded in article Portable Text (resolved in
// articleBySlugQuery). Carries the dish + its restaurant for the inline card
// and the derived "Spots im Artikel" grid / spotrail.
export interface MustEatCardBlock {
  _type: 'mustEatCard'
  _key?: string
  mustEatId?: string
  dish?: string
  dishDescription?: string
  dishDescriptionEn?: string
  dishImage?: string
  restaurantName?: string
  restaurantSlug?: string
  district?: string
  cuisineType?: string
  restaurantPhoto?: string
}

// Inline "Spot" block embedded in article Portable Text — references a
// restaurant directly (no mustEat needed). Resolved in articleBySlugQuery;
// renders an image card and feeds the "Spots im Artikel" grid / spotrail.
export interface SpotCardBlock {
  _type: 'spotCard'
  _key?: string
  restaurantName?: string
  restaurantSlug?: string
  district?: string
  cuisineType?: string
  restaurantPhoto?: string
}

// A unique restaurant referenced by an article (derived from its mustEatCard
// and spotCard blocks) — feeds the "Spots im Artikel" grid + spotrail.
export interface ArticleSpot {
  name: string
  slug?: string
  district?: string
  cuisineType?: string
  photo?: string
}

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
  restaurantId?: string
  revealedForAnon?: boolean
  order?: number
}

interface BezirkSeo {
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
  /** Only projected by restaurantsByCategoryQuery (district hub doesn't need it). */
  bezirk?: { name: string; slug?: string }
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
  cuisineType?: string
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
  description?: string
  photo?: string
  photoCredit?: string
  photoCreditUrl?: string
  mustEatCount: number
  tierAnon?:   boolean
  tierSigned?: boolean
}

export interface MapMustEat {
  _id: string
  dish: string
  description?: string
  descriptionEn?: string
  price?: string
  image: string
  order?: number
  restaurant: {
    _id: string
    name: string
    slug: string
    lat: number
    lng: number
    district?: string
    address?: string
  }
  revealedForAnon?: boolean
}

/** Map category filter: 'All' or a category slug from Sanity. */
export type MapCategory = 'All' | string

export interface OpenStatus {
  isOpen: boolean
  label: string
  minutesUntilChange: number | null
}

