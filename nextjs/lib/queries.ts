import {
  groqImageUrl,
  presetQuery,
  publishableRestaurantImageCondition,
  publishableRestaurantImageUrl,
  restaurantPhotoCredit,
  restaurantPhotoCreditUrl,
} from './sanity-image-presets'
// Category projection. The string→ref migration finished in 2026-06 (verified
// 2026-07: 0 of 343 restaurants carry legacy string entries), so all entries
// are references. The `defined(@->_id)` filter stays as a guard against
// dangling refs (category doc deleted while restaurants still point at it) —
// without it those would surface as null rows in the projected array.
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
    menuUrl,
    instagramHandle,
    reservationUrl,
    openingHours[] { days, hours },
    tip,
    tipEn,
    whatToOrder[] { dish, note, noteEn, price },
    description,
    descriptionEn,
    "photo": ${publishableRestaurantImageUrl('image', 'detailHero')},
    "photoCredit": ${restaurantPhotoCredit('image')},
    "photoCreditUrl": ${restaurantPhotoCreditUrl('image')},
    "gallery": gallery[]{
      _key,
      "thumb": asset->url + "${presetQuery('galleryThumb')}",
      "full": asset->url + "${presetQuery('detailHero')}",
      alt,
      credit,
      creditUrl
    },
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
      "dishImage": ${groqImageUrl('mustEatRef->image', 'articleDish')},
      "restaurantName": mustEatRef->restaurantRef->name,
      "restaurantSlug": mustEatRef->restaurantRef->slug.current,
      "district": coalesce(mustEatRef->restaurantRef->district, mustEatRef->restaurantRef->bezirkRef->name, mustEatRef->district),
      "cuisineType": mustEatRef->restaurantRef->cuisineType,
      "restaurantPhoto": ${publishableRestaurantImageUrl('mustEatRef->restaurantRef->image', 'articleDishRestaurant', 'mustEatRef->restaurantRef->slug.current', 'mustEatRef->restaurantRef->instagramHandle')}
    },
    _type == "spotCard" => {
      _type,
      _key,
      "restaurantName": restaurantRef->name,
      "restaurantSlug": restaurantRef->slug.current,
      "district": coalesce(restaurantRef->district, restaurantRef->bezirkRef->name),
      "cuisineType": restaurantRef->cuisineType,
      "restaurantPhoto": ${publishableRestaurantImageUrl('restaurantRef->image', 'card', 'restaurantRef->slug.current', 'restaurantRef->instagramHandle')}
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
    "imageUrl": ${groqImageUrl('image', 'detailHero')},
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
    "photo": ${publishableRestaurantImageUrl('image', 'card')}
  }
`

// Restaurants filtered by category slug (reference match — the legacy
// string dual-shape was removed after the 2026-06 migration completed).
export const restaurantsByCategoryQuery = `
  *[_type == "restaurant" && isOpen != false
    && $categorySlug in categories[]->slug.current
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
    "photo": ${publishableRestaurantImageUrl('image', 'card')}
  }
`

// Curated spots for the magic-link email: restaurants that have at least one
// Must-Eat card, editorial first (`featured`), then by Must-Eat count. Projects
// exactly what the email renders — restaurant photo + a single Must-Eat card.
export const emailSpotsQuery = `
  *[_type == "restaurant" && isOpen != false
    && defined(slug.current) && defined(image.asset) && (${publishableRestaurantImageCondition('image')})
    && count(*[_type == "mustEat" && restaurantRef._ref == ^._id && defined(image.asset)]) > 0]
    | order(coalesce(featured, false) desc, count(*[_type == "mustEat" && restaurantRef._ref == ^._id]) desc, _createdAt desc)
    [0...$limit] {
    name,
    "slug": slug.current,
    "area": coalesce(bezirkRef->name, district),
    "cuisine": cuisineType,
    "photo": ${publishableRestaurantImageUrl('image', 'card')},
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
  *[_type == "restaurant" && slug.current == $slug && defined(image.asset) && (${publishableRestaurantImageCondition('image')})][0] {
    name,
    "area": coalesce(bezirkRef->name, district),
    "cuisine": cuisineType,
    "photo": ${publishableRestaurantImageUrl('image', 'card')},
    "mustEats": *[_type == "mustEat" && restaurantRef._ref == ^._id && defined(image.asset)]
      | order(order asc)[0...1] {
      dish,
      "cardPhoto": image.asset->url
    }
  }
`

// Bezirke for the /bezirk index — includes count and a few example restaurants.
export const allBezirkeWithStatsQuery = `
  *[_type == "bezirk"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    descriptionEn,
    "imageUrl": ${groqImageUrl('image', 'card')},
    "restaurantCount": count(*[_type == "restaurant" && bezirkRef._ref == ^._id && isOpen != false]),
    "exampleRestaurants": *[_type == "restaurant" && bezirkRef._ref == ^._id && isOpen != false]
      | order(coalesce(featured, false) desc, name asc)[0...3] {
        _id,
        name,
        "slug": slug.current,
        cuisineType,
        shortDescription,
        shortDescriptionEn
      }
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
    "imageUrl": ${groqImageUrl('image', 'bezirkHero')},
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
    "imageUrl": ${groqImageUrl('image', 'card')},
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
    "imageUrl": ${groqImageUrl('image', 'card')}
  }
`

// Must Eat cards for a specific restaurant — card-back teaser only.
// Deliberately NO dish/photo: the teaser renders covered cards, and any
// extra field would ship to every anon in the RSC payload of the public,
// indexed /restaurant/[slug] page (same leak class as the P1 map leak).
export const mustEatsByRestaurantQuery = `
  *[_type == "mustEat" && restaurantRef._ref == $restaurantId] | order(order asc) {
    _id,
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
