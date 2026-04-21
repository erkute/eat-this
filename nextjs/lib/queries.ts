export const restaurantBySlugQuery = `
  *[_type == "restaurant" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    isOpen,
    isClosed,
    cuisineType,
    shortDescription,
    district,
    "bezirk": bezirkRef->{ _id, name, "slug": slug.current },
    address,
    categories,
    price,
    lat,
    lng,
    mapsUrl,
    website,
    reservationUrl,
    openingHours[] { days, hours },
    tip,
    description,
    "photo": image.asset->url + "?w=1200&auto=format&q=85",
    seo {
      metaTitle,
      metaDescription,
      "ogImageUrl": ogImage.asset->url,
      noIndex
    }
  }
`

export const allRestaurantSlugsQuery = `
  *[_type == "restaurant" && defined(slug.current)] {
    "slug": slug.current
  }
`

export const articleBySlugQuery = `
  *[_type == "newsArticle" && slug.current == $slug][0] {
    _id,
    "slug": slug.current,
    "title": coalesce(title, titleDe),
    titleDe,
    category,
    categoryLabel, categoryLabelDe,
    date,
    "imageUrl": image.asset->url + "?w=1200&auto=format&q=85",
    "alt": coalesce(image.alt, alt),
    excerpt, excerptDe,
    content, contentDe,
    seo {
      metaTitle,
      metaDescription,
      "ogImageUrl": ogImage.asset->url,
      noIndex
    }
  }
`

export const allArticleSlugsQuery = `
  *[_type == "newsArticle" && defined(slug.current)] {
    "slug": slug.current
  }
`

// All restaurants for map — lightweight projection
export const allRestaurantsQuery = `
  *[_type == "restaurant" && isOpen != false] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    isOpen,
    isClosed,
    cuisineType,
    shortDescription,
    district,
    "bezirk": bezirkRef->{ _id, name, "slug": slug.current },
    address,
    categories,
    price,
    lat,
    lng,
    tip,
    "photo": image.asset->url + "?w=800&auto=format&q=80"
  }
`

// Restaurants filtered by Bezirk slug
export const restaurantsByBezirkQuery = `
  *[_type == "restaurant" && isOpen != false && bezirkRef->slug.current == $bezirkSlug] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    cuisineType,
    shortDescription,
    district,
    categories,
    price,
    lat,
    lng,
    tip,
    "photo": image.asset->url + "?w=800&auto=format&q=80"
  }
`

// Restaurants filtered by category string
export const restaurantsByCategoryQuery = `
  *[_type == "restaurant" && isOpen != false && $category in categories] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    cuisineType,
    shortDescription,
    district,
    "bezirk": bezirkRef->{ _id, name, "slug": slug.current },
    categories,
    price,
    lat,
    lng,
    tip,
    "photo": image.asset->url + "?w=800&auto=format&q=80"
  }
`

// Latest 10 restaurants added
export const latestRestaurantsQuery = `
  *[_type == "restaurant" && isOpen != false] | order(_createdAt desc) [0...10] {
    _id,
    name,
    "slug": slug.current,
    cuisineType,
    shortDescription,
    district,
    "bezirk": bezirkRef->{ _id, name, "slug": slug.current },
    categories,
    price,
    lat,
    lng,
    tip,
    "photo": image.asset->url + "?w=800&auto=format&q=80"
  }
`

// All Bezirke for navigation/filter
export const allBezirkeQuery = `
  *[_type == "bezirk"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description
  }
`

// All distinct categories used across restaurants
export const allCategoriesQuery = `
  array::unique(*[_type == "restaurant" && isOpen != false].categories[])
`

// All news articles — newest first
export const allNewsArticlesQuery = `
  *[_type == "newsArticle"] | order(date desc) {
    _id,
    "slug": slug.current,
    "title": coalesce(title, titleDe),
    titleDe,
    category,
    categoryLabel, categoryLabelDe,
    date,
    "imageUrl": image.asset->url + "?w=800&auto=format&q=80",
    "alt": coalesce(image.alt, alt),
    excerpt, excerptDe,
    "author": author->{ name, "slug": slug.current, "photo": image.asset->url }
  }
`

// Sitemap — all slugs for restaurants + articles
export const sitemapQuery = `
  {
    "restaurants": *[_type == "restaurant" && defined(slug.current)] {
      "slug": slug.current,
      _updatedAt
    },
    "articles": *[_type == "newsArticle" && defined(slug.current)] {
      "slug": slug.current,
      _updatedAt
    }
  }
`
