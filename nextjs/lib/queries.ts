import {
  groqImageUrl,
  presetQuery,
  publishableRestaurantImageCondition,
  publishableRestaurantImageUrl,
  restaurantPhotoCredit,
  restaurantPhotoCreditUrl,
} from './sanity-image-presets';
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
}`;

/* The full detail projection. Shared so the restaurant page and the OG-image
   route cannot drift apart, and so the page query below can wrap it without
   restating 40 fields. */
const RESTAURANT_DETAIL_FIELDS = `
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
    phone,
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
`;

/* Only the document. The OG-image route needs nothing else; the page uses
   restaurantPageQuery below, which folds in Must-Eats and siblings. */
export const restaurantBySlugQuery = `
  *[_type == "restaurant" && slug.current == $slug][0] {${RESTAURANT_DETAIL_FIELDS}}
`;

export const allRestaurantSlugsQuery = `
  *[_type == "restaurant" && defined(slug.current)] {
    "slug": slug.current
  }
`;

// Public article payloads resolve only the restaurant side of a Must-Eat
// reference. Dish text and images live in the private premium store and must
// never be projected into an indexed article response.
const articleContentProjection = `{
    ...,
    _type == "mustEatCard" => {
      _type,
      _key,
      "mustEatId": mustEatRef->_id,
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
  }`;

export const articleBySlugQuery = `
  *[_type == "newsArticle" && slug.current == $slug][0] {
    _id,
    "slug": slug.current,
    "title": coalesce(title, titleDe),
    "titleEn": title,
    titleDe,
    category,
    categoryLabel, categoryLabelDe,
    date,
    "updatedAt": _updatedAt,
    "imageUrl": ${groqImageUrl('image', 'detailHero')},
    "alt": coalesce(image.alt, alt),
    excerpt, excerptDe,
    content[] ${articleContentProjection},
    contentDe[] ${articleContentProjection},
    seo {
      metaTitle,
      metaTitleEn,
      metaDescription,
      metaDescriptionEn,
      "ogImageUrl": ogImage.asset->url,
      noIndex
    }
  }
`;

export const allArticleSlugsQuery = `
  *[_type == "newsArticle" && defined(slug.current)] {
    "slug": slug.current
  }
`;

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
`;

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
`;

const RESTAURANT_SIBLING_CARD_PROJECTION = `{
  _id,
  name,
  "slug": slug.current,
  cuisineType,
  priceRange,
  "bezirk": bezirkRef->{name},
  "photo": ${publishableRestaurantImageUrl('image', 'card')}
}`;


/**
 * Everything the restaurant page needs, in ONE round trip.
 *
 * It used to be three: the document, then — once its _id and bezirk were
 * known — Must-Eats and siblings in parallel. That is two sequential
 * round trips and three billed Sanity requests per slug. With 932
 * prerendered restaurant pages revalidating daily, those two extra
 * requests were ~930 avoidable calls per cycle, which is the single
 * largest block of our quota.
 *
 * The sub-queries reach the parent document through `^`, so nothing has to
 * be threaded in as a parameter. The sibling filter also compares
 * `bezirkRef._ref` directly instead of joining through `bezirkRef->slug`,
 * which drops a dereference per candidate.
 *
 * `generateMetadata` and the page body must BOTH use this query — Next
 * dedupes identical fetches within a render, so two call sites of the same
 * query cost one request, whereas mixing this with restaurantBySlugQuery
 * would cost two.
 */
export const restaurantPageQuery = `
  *[_type == "restaurant" && slug.current == $slug][0] {${RESTAURANT_DETAIL_FIELDS},
    "mustEats": *[_type == "mustEat" && restaurantRef._ref == ^._id] | order(order asc) {
      _id,
      order
    },
    "siblingsAfter": *[
      _type == "restaurant" && isOpen != false
      && defined(^.bezirkRef._ref) && bezirkRef._ref == ^.bezirkRef._ref
      && slug.current != ^.slug.current
      && (name > ^.name || (name == ^.name && slug.current > ^.slug.current))
    ] | order(name asc, slug.current asc)[0...$siblingLimit] ${RESTAURANT_SIBLING_CARD_PROJECTION},
    "siblingsWrap": *[
      _type == "restaurant" && isOpen != false
      && defined(^.bezirkRef._ref) && bezirkRef._ref == ^.bezirkRef._ref
      && slug.current != ^.slug.current
      && (name < ^.name || (name == ^.name && slug.current < ^.slug.current))
    ] | order(name asc, slug.current asc)[0...$siblingLimit] ${RESTAURANT_SIBLING_CARD_PROJECTION}
  }
`;

// Curated spots for the magic-link email: restaurant information only. Login
// emails are not an entitlement boundary and therefore never embed premium
// Must-Eat text or images.
export const emailSpotsQuery = `
  *[_type == "restaurant" && isOpen != false
    && defined(slug.current) && defined(image.asset) && (${publishableRestaurantImageCondition('image')})
    && count(*[_type == "mustEat" && restaurantRef._ref == ^._id]) > 0]
    | order(coalesce(featured, false) desc, count(*[_type == "mustEat" && restaurantRef._ref == ^._id]) desc, _createdAt desc)
    [0...$limit] {
    name,
    "slug": slug.current,
    "area": coalesce(bezirkRef->name, district),
    "cuisine": cuisineType,
    "photo": ${publishableRestaurantImageUrl('image', 'card')}
  }
`;

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
    "exampleRestaurants": *[_type == "restaurant" && bezirkRef._ref == ^._id && isOpen != false && defined(image.asset) && (${publishableRestaurantImageCondition('image')})]
      | order(coalesce(featured, false) desc, name asc)[0...4] {
        _id,
        name,
        "slug": slug.current,
        cuisineType,
        priceRange,
        shortDescription,
        shortDescriptionEn,
        "photo": ${publishableRestaurantImageUrl('image', 'card')}
      },
    "topSpotCards": topSpots[]->{
      _id,
      name,
      "slug": slug.current,
      cuisineType,
      priceRange,
      isOpen,
      "photo": ${publishableRestaurantImageUrl('image', 'card')}
    }
  }
`;

// One Bezirk by slug — for the detail landing page
export const bezirkBySlugQuery = `
  *[_type == "bezirk" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    descriptionEn,
    "imageUrl": ${groqImageUrl('image', 'bezirkHero')},
    "topSpots": topSpots[defined(@->slug.current)]->slug.current,
    seo {
      metaTitle,
      metaTitleEn,
      metaDescription,
      metaDescriptionEn,
      "ogImageUrl": ogImage.asset->url,
      noIndex
    }
  }
`;

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
`;

// Kategorien für den /kategorie-Index — mit Anzahl und ein paar Beispiel-Spots.
// Bewusst getrennt von `allCategoriesQuery`: die schlanke Variante speist die
// Sitemap, llms.txt und die Nachbar-Chips der Detailseite, und die brauchen
// keine vier Restaurantkarten pro Kategorie.
//
// Der Rückwärtsbezug läuft über `^._id in categories[]._ref` — dieselbe
// Referenz-Beziehung wie in `restaurantsByCategoryQuery`, nur von der anderen
// Seite gelesen.
export const allCategoriesWithStatsQuery = `
  *[_type == "category"] | order(coalesce(nameEn, name) asc) {
    _id,
    name,
    nameEn,
    "slug": slug.current,
    description,
    descriptionEn,
    "restaurantCount": count(*[_type == "restaurant" && isOpen != false && ^._id in categories[]._ref]),
    "exampleRestaurants": *[_type == "restaurant" && isOpen != false && ^._id in categories[]._ref && defined(image.asset) && (${publishableRestaurantImageCondition('image')})]
      | order(coalesce(featured, false) desc, name asc)[0...4] {
        _id,
        name,
        "slug": slug.current,
        cuisineType,
        priceRange,
        "photo": ${publishableRestaurantImageUrl('image', 'card')}
      },
    "topSpotCards": topSpots[]->{
      _id,
      name,
      "slug": slug.current,
      cuisineType,
      priceRange,
      isOpen,
      "photo": ${publishableRestaurantImageUrl('image', 'card')}
    }
  }
`;

// One category by slug — detail / hub page.
//
// `topSpots` is the editorially ordered best-of list (see
// docs/specs/2026-08-20-kategorie-ranking.md). Only the slugs are projected:
// the page already loads every restaurant of the category, so the slug is
// enough to reorder them, and the full card payload would ship twice.
// `defined(@->slug.current)` guards dangling refs the same way
// CATEGORY_PROJECTION does — without it a deleted restaurant would land as a
// null hole in the array.
export const categoryBySlugQuery = `
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    name,
    nameEn,
    "slug": slug.current,
    description,
    descriptionEn,
    "topSpots": topSpots[defined(@->slug.current)]->slug.current
  }
`;

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
    "imageUrlLead": ${groqImageUrl('image', 'newsLead')},
    "alt": coalesce(image.alt, alt),
    excerpt, excerptDe
  }
`;

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
`;

// Ein Guide als Teaser — für den Querverweis von der Kategorieseite auf den
// gleichnamigen Magazin-Artikel (siehe categoryGuideSlug in lib/seo/crossLinks).
// Bewusst OHNE content/contentDe: articleBySlugQuery zieht den kompletten
// Portable Text beider Sprachen, und der Hub braucht davon nichts als die
// Überschrift. Die Sprache wird wie in staticPageBySlugQuery schon in GROQ
// gewählt, damit die andere gar nicht erst in der RSC-Payload landet.
export const guideTeaserBySlugQuery = `
  *[_type == "newsArticle" && slug.current == $slug][0] {
    "slug": slug.current,
    "title": select(
      $locale == "de" => coalesce(titleDe, title),
      coalesce(title, titleDe)
    ),
    "excerpt": select(
      $locale == "de" => coalesce(excerptDe, excerpt),
      coalesce(excerpt, excerptDe)
    ),
    "noIndex": seo.noIndex == true
  }
`;

// Must Eat cards for a specific restaurant — card-back teaser only.
// Deliberately NO dish/photo: the teaser renders covered cards, and any
// extra field would ship to every anon in the RSC payload of the public,
// indexed /restaurant/[slug] page (same leak class as the P1 map leak).
// One localized static page. Selecting the active language in GROQ keeps the
// other page documents and translation fields out of the RSC payload.
export const staticPageBySlugQuery = `
  *[_type == "staticPage" && slug.current == $slug][0] {
    "slug": slug.current,
    "title": select(
      $locale == "de" => coalesce(titleDe, title),
      coalesce(title, titleDe)
    ),
    "body": select(
      $locale == "de" => coalesce(bodyDe, body),
      coalesce(body, bodyDe)
    )
  }
`;

/**
 * How much a Booster Pack actually contains, for every pack at once.
 *
 * The filters MUST stay identical to `mapRestaurantsQuery` (`isOpen != false`)
 * and to `isRestaurantVisible` (a category pack unlocks every restaurant
 * carrying that category), or the number on the pack card promises spots the
 * map never shows. Must Eats inherit their restaurant's `isOpen` for the same
 * reason: they only become visible with the restaurant they hang off.
 */
export const packContentsQuery = `
  {
    "categories": *[_type == "category" && defined(slug.current)] {
      "slug": slug.current,
      "spots": count(*[_type == "restaurant" && isOpen != false
        && ^.slug.current in categories[]->slug.current]),
      "mustEats": count(*[_type == "mustEat" && restaurantRef->isOpen != false
        && ^.slug.current in restaurantRef->categories[]->slug.current])
    },
    "allBerlin": {
      "spots": count(*[_type == "restaurant" && isOpen != false]),
      "mustEats": count(*[_type == "mustEat" && restaurantRef->isOpen != false])
    }
  }
`;
