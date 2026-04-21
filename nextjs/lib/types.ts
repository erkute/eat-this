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
