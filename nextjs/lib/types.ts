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

/** Editorial "Was bestellen?" recommendation (2–4 per restaurant). */
interface WhatToOrderItem {
  dish: string
  note?: string
  noteEn?: string
  price?: string
}

interface RestaurantGalleryImage {
  _key: string
  thumb?: string
  full?: string
  alt?: string
  credit?: string
  creditUrl?: string
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
  menuUrl?: string
  instagramHandle?: string
  reservationUrl?: string
  openingHours?: OpeningHourSlot[]
  tip?: string
  tipEn?: string
  whatToOrder?: WhatToOrderItem[]
  shortDescription?: string
  shortDescriptionEn?: string
  description?: string
  descriptionEn?: string
  photo?: string
  photoCredit?: string
  photoCreditUrl?: string
  gallery?: RestaurantGalleryImage[]
  seo?: RestaurantSeo
  bezirk?: { _id: string; name: string; slug?: string }
}

interface NewsArticleSeo {
  metaTitle?: string
  metaTitleEn?: string
  metaDescription?: string
  metaDescriptionEn?: string
  ogImageUrl?: string
  noIndex?: boolean
}

export type PortableTextBlock = { _type: string; _key?: string } & Record<string, unknown>

// Inline Must-Eat teaser embedded in article Portable Text. Public article
// queries resolve only safe restaurant metadata; premium dish fields stay in
// the private store.
export interface MustEatCardBlock {
  _type: 'mustEatCard'
  _key?: string
  mustEatId?: string
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

export interface NewsArticle {
  _id: string
  slug: string
  title: string
  titleEn?: string
  titleDe?: string
  category?: string
  categoryLabel?: string
  categoryLabelDe?: string
  date: string
  updatedAt?: string
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
  body?: PortableTextBlock[]
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
  exampleRestaurants?: Pick<RestaurantCard, '_id' | 'name' | 'slug' | 'cuisineType' | 'shortDescription' | 'shortDescriptionEn' | 'photo'>[]
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
  menuUrl?: string
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
  // dish/image/description/price are the paid content: the server strips them
  // for covered (face-down) cards (see lib/map/stripCoveredMustEats.ts), so
  // they're only present when the card is face-up for this viewer.
  dish?: string
  description?: string
  descriptionEn?: string
  price?: string
  image?: string
  order?: number
  restaurant: {
    _id: string
    name: string
    slug: string
    lat: number
    lng: number
    district?: string
    address?: string
    photo?: string
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
