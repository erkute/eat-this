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

// Inline "Must Eat" reference blocks inside article content carry both the dish
// (freigestellt photo + name) and the restaurant (photo/name/slug/district) so
// the renderer can draw the inline card AND derive the "Spots im Artikel" grid +
// spotrail without extra fetches. Normal blocks pass through untouched (`...`).
const articleContentProjection = `{
    ...,
    _type == "mustEatCard" => {
      _type,
      _key,
      "mustEatId": mustEatRef->_id,
      "dish": mustEatRef->dish,
      "dishDescription": mustEatRef->description,
      "dishDescriptionEn": mustEatRef->descriptionEn,
      "dishImage": mustEatRef->image.asset->url + "?w=400&auto=format&q=80",
      "restaurantName": mustEatRef->restaurantRef->name,
      "restaurantSlug": mustEatRef->restaurantRef->slug.current,
      "district": coalesce(mustEatRef->restaurantRef->district, mustEatRef->restaurantRef->bezirkRef->name, mustEatRef->district),
      "cuisineType": mustEatRef->restaurantRef->cuisineType,
      "restaurantPhoto": mustEatRef->restaurantRef->image.asset->url + "?w=500&auto=format&q=75"
    },
    _type == "spotCard" => {
      _type,
      _key,
      "restaurantName": restaurantRef->name,
      "restaurantSlug": restaurantRef->slug.current,
      "district": coalesce(restaurantRef->district, restaurantRef->bezirkRef->name),
      "cuisineType": restaurantRef->cuisineType,
      "restaurantPhoto": restaurantRef->image.asset->url + "?w=800&auto=format&q=80"
    }
  }`

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
    content[] ${articleContentProjection},
    contentDe[] ${articleContentProjection},
    "author": author->{ name, "slug": slug.current, "photo": image.asset->url },
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

// Curated spots for the magic-link email: restaurants that have at least one
// Must-Eat card, editorial first (`featured`), then by Must-Eat count. Projects
// exactly what the email renders — restaurant photo + a single Must-Eat card.
export const emailSpotsQuery = `
  *[_type == "restaurant" && isOpen != false
    && defined(slug.current) && defined(image.asset)
    && count(*[_type == "mustEat" && restaurantRef._ref == ^._id && defined(image.asset)]) > 0]
    | order(coalesce(featured, false) desc, count(*[_type == "mustEat" && restaurantRef._ref == ^._id]) desc, _createdAt desc)
    [0...$limit] {
    name,
    "slug": slug.current,
    "area": coalesce(bezirkRef->name, district),
    "cuisine": cuisineType,
    "photo": image.asset->url,
    "mustEats": *[_type == "mustEat" && restaurantRef._ref == ^._id && defined(image.asset)]
      | order(order asc)[0...1] {
      dish,
      "cardPhoto": image.asset->url
    }
  }
`

// One spot for the composed email card image (/api/email/spot-card) — same
// shape as emailSpotsQuery, addressed by slug.
export const emailSpotCardQuery = `
  *[_type == "restaurant" && slug.current == $slug && defined(image.asset)][0] {
    name,
    "area": coalesce(bezirkRef->name, district),
    "cuisine": cuisineType,
    "photo": image.asset->url,
    "mustEats": *[_type == "mustEat" && restaurantRef._ref == ^._id && defined(image.asset)]
      | order(order asc)[0...1] {
      dish,
      "cardPhoto": image.asset->url
    }
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


