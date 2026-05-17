// Category projection — only resolves reference entries; legacy string entries
// (left over from before the migration) are dropped. GROQ's object projection
// `{...}` returns null for primitive array elements, so a unified dual-shape
// projection isn't representable. The migration script converts strings →
// refs in one pass; until it has run on a given dataset, restaurants whose
// categories are still strings will render with no category chips.
const CATEGORY_PROJECTION = `categories[defined(@->_id)]->{
  "slug": slug.current,
  name,
  nameEn,
  description,
  descriptionEn
}`

export const restaurantBySlugQuery = `
  *[_type == "restaurant" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    isOpen,
    isClosed,
    cuisineType,
    shortDescription,
    shortDescriptionEn,
    district,
    "bezirk": bezirkRef->{ _id, name, "slug": slug.current },
    address,
    ${CATEGORY_PROJECTION},
    priceRange,
    lat,
    lng,
    mapsUrl,
    website,
    instagramHandle,
    reservationUrl,
    openingHours[] { days, hours },
    tip,
    tipEn,
    description,
    descriptionEn,
    "photo": image.asset->url + "?w=1200&auto=format&q=85",
    "photoCredit": image.credit,
    "photoCreditUrl": image.creditUrl,
    seo {
      metaTitle,
      metaTitleEn,
      metaDescription,
      metaDescriptionEn,
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
    ${CATEGORY_PROJECTION},
    priceRange,
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
    shortDescriptionEn,
    district,
    ${CATEGORY_PROJECTION},
    priceRange,
    lat,
    lng,
    tip,
    tipEn,
    "photo": image.asset->url + "?w=800&auto=format&q=80"
  }
`

// Restaurants filtered by category slug.
// Dual-shape match: reference docs use slug.current, legacy strings match by lowercased value.
export const restaurantsByCategoryQuery = `
  *[_type == "restaurant" && isOpen != false
    && count(categories[defined(@)
      && coalesce(@->slug.current, lower(@)) == $categorySlug
    ]) > 0
  ] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    cuisineType,
    shortDescription,
    shortDescriptionEn,
    district,
    "bezirk": bezirkRef->{ _id, name, "slug": slug.current },
    ${CATEGORY_PROJECTION},
    priceRange,
    lat,
    lng,
    tip,
    tipEn,
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
    ${CATEGORY_PROJECTION},
    priceRange,
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

// Bezirke for the /bezirk index — includes count and image
export const allBezirkeWithStatsQuery = `
  *[_type == "bezirk"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    "imageUrl": image.asset->url + "?w=800&auto=format&q=80",
    "restaurantCount": count(*[_type == "restaurant" && bezirkRef._ref == ^._id && isOpen != false])
  }
`

// One Bezirk by slug — for the detail landing page
export const bezirkBySlugQuery = `
  *[_type == "bezirk" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    descriptionEn,
    "imageUrl": image.asset->url + "?w=1600&auto=format&q=85",
    seo {
      metaTitle,
      metaTitleEn,
      metaDescription,
      metaDescriptionEn,
      "ogImageUrl": ogImage.asset->url,
      noIndex
    }
  }
`

// All categories for navigation/listing — pulled directly from the category
// document type (single source of truth). Sorted by EN name (falls back to DE)
// so the order is stable across locales.
export const allCategoriesQuery = `
  *[_type == "category"] | order(coalesce(nameEn, name) asc) {
    _id,
    name,
    nameEn,
    "slug": slug.current,
    description,
    descriptionEn
  }
`

// Flat list of every restaurant category occurrence (ref entries only) as
// `{slug}`. Counted in JS by slug. Legacy string entries are excluded — the
// per-category counts will read 0 until the migration script runs.
// `defined(categories)` filter prevents `null` entries flattening in for
// restaurants with no `categories` field at all.
export const categoryOccurrencesQuery = `
  *[_type == "restaurant" && isOpen != false && defined(categories)]
    .categories[defined(@->_id)]->{
    "slug": slug.current
  }
`

// One category by slug — detail / hub page.
export const categoryBySlugQuery = `
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    name,
    nameEn,
    "slug": slug.current,
    description,
    descriptionEn
  }
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

// Latest N news articles — for detail-page outro / home feed
export const latestNewsArticlesQuery = `
  *[_type == "newsArticle" && defined(slug.current)] | order(date desc)[0...$limit] {
    _id,
    "title": coalesce(title, titleDe),
    titleDe,
    "slug": slug.current,
    date,
    excerpt, excerptDe,
    categoryLabel, categoryLabelDe,
    "imageUrl": image.asset->url + "?w=800&auto=format&q=80"
  }
`

// Must Eat cards for a specific restaurant
export const mustEatsByRestaurantQuery = `
  *[_type == "mustEat" && restaurantRef._ref == $restaurantId] | order(order asc) {
    _id,
    dish,
    "photo": image.asset->url + "?w=800&auto=format&q=80",
    order
  }
`

// All Must Eat cards — for album/overview
export const allMustEatsQuery = `
  *[_type == "mustEat"] | order(order asc) {
    _id,
    dish,
    "restaurant": restaurantRef->{ _id, name, "slug": slug.current, district },
    "photo": image.asset->url + "?w=800&auto=format&q=80",
    order
  }
`

// Must Eat album grid — matches legacy window.CMS.fetchMustEats projection
export const allMustEatsAlbumQuery = `
  *[_type == "mustEat"] | order(order asc) {
    _id,
    dish,
    restaurant,
    district,
    price,
    "imageUrl": image.asset->url + "?w=600&auto=format&q=80",
    "restaurantSlug": restaurantRef->slug.current,
    order
  }
`

// All static pages (about, contact, press, impressum, datenschutz, agb)
export const allStaticPagesQuery = `
  *[_type == "staticPage" && defined(slug.current)] {
    "slug": slug.current,
    title,
    titleDe,
    body,
    bodyDe
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

export const restaurantCountQuery = `count(*[_type == "restaurant" && !(_id in path("drafts.**"))])`


