import { groqImageUrl, presetQuery } from '@/lib/sanity-image-presets'
// Category projection — only resolves reference entries. See lib/queries.ts.
const CATEGORY_PROJECTION = `categories[defined(@->_id)]->{
  "slug": slug.current,
  name,
  nameEn
}`

// Map list/marker payload — deliberately WITHOUT the detail-only fields
// (address, phone, website, reservationUrl, mapsUrl, instagramHandle, tip,
// description, photoCredit*). Those are fetched on demand when the detail
// sheet opens (restaurantMapDetailQuery / /api/restaurant-detail). Two wins:
// the anon map payload shrinks (description is the bulk), and the whole
// catalog's contact data no longer ships up-front for every locked spot.
// `openingHours` MUST stay — the list + marker render the open-now badge.
export const mapRestaurantsQuery = `
  *[_type == "restaurant" && isOpen != false] {
    _id,
    _createdAt,
    name,
    "slug": slug.current,
    isClosed,
    district,
    "bezirk": bezirkRef->{ name, "slug": slug.current },
    ${CATEGORY_PROJECTION},
    cuisineType,
    priceRange,
    lat,
    lng,
    openingHours,
    "photo": ${groqImageUrl('image', 'mapCard')},
    "mustEatCount": count(*[_type == "mustEat" && restaurantRef._ref == ^._id]),
    tierAnon,
    tierSigned
  }
`

// On-demand detail fields for the map detail sheet — fetched by slug when a
// spot is opened. Mirrors the fields RestaurantDetail renders below the hero.
export const restaurantMapDetailQuery = `
  *[_type == "restaurant" && slug.current == $slug][0] {
    address,
    phone,
    mapsUrl,
    website,
    instagramHandle,
    reservationUrl,
    tip,
    description,
    shortDescription,
    "photoCredit": image.credit,
    "photoCreditUrl": image.creditUrl,
    "gallery": gallery[]{
      _key,
      "thumb": asset->url + "${presetQuery('galleryThumb')}",
      "full": asset->url + "${presetQuery('detailHero')}",
      alt,
      credit,
      creditUrl
    }
  }
`

export const mapMustEatsQuery = `
  *[_type == "mustEat"] {
    _id,
    dish,
    description,
    descriptionEn,
    price,
    revealedForAnon,
    order,
    "image": ${groqImageUrl('image', 'mapCard')},
    "restaurant": restaurantRef-> {
      _id,
      name,
      "slug": slug.current,
      lat,
      lng,
      district,
      address
    }
  }
`
