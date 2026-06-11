import { groqImageUrl } from '@/lib/sanity-image-presets'
// Category projection — only resolves reference entries. See lib/queries.ts.
const CATEGORY_PROJECTION = `categories[defined(@->_id)]->{
  "slug": slug.current,
  name,
  nameEn
}`

export const mapRestaurantsQuery = `
  *[_type == "restaurant" && isOpen != false] {
    _id,
    _createdAt,
    name,
    "slug": slug.current,
    isClosed,
    district,
    "bezirk": bezirkRef->{ name, "slug": slug.current },
    address,
    ${CATEGORY_PROJECTION},
    cuisineType,
    priceRange,
    phone,
    lat,
    lng,
    mapsUrl,
    website,
    instagramHandle,
    reservationUrl,
    openingHours,
    tip,
    shortDescription,
    description,
    "photo": ${groqImageUrl('image', 'mapCard')},
    "photoCredit": image.credit,
    "photoCreditUrl": image.creditUrl,
    "mustEatCount": count(*[_type == "mustEat" && restaurantRef._ref == ^._id]),
    tierAnon,
    tierSigned
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
