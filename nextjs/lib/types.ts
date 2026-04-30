export interface OpeningHourSlot {
  days: string
  hours: string
}

export interface RestaurantSeo {
  metaTitle?: string
  metaDescription?: string
  ogImageUrl?: string
  noIndex?: boolean
}

export interface Restaurant {
  _id: string
  name: string
  slug: string
  district?: string
  address?: string
  categories?: string[]
  price?: string
  lat: number
  lng: number
  mapsUrl?: string
  website?: string
  reservationUrl?: string
  openingHours?: OpeningHourSlot[]
  tip?: string
  description?: string
  photo?: string
  seo?: RestaurantSeo
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

export interface MapRestaurant {
  _id: string
  name: string
  slug: string
  isClosed: boolean
  district?: string
  bezirk?: { name: string }
  address?: string
  categories?: string[]
  price?: string
  lat: number
  lng: number
  mapsUrl?: string
  website?: string
  reservationUrl?: string
  openingHours?: OpeningHourSlot[]
  tip?: string
  shortDescription?: string
  photo?: string
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

export type MapCategory =
  | 'All'
  | 'Dinner'
  | 'Lunch'
  | 'Breakfast'
  | 'Coffee'
  | 'Sweets'
  | 'Pizza'

export interface OpenStatus {
  isOpen: boolean
  label: string
  minutesUntilChange: number | null
}
