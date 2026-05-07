export const mapRestaurantsQuery = `
  *[_type == "restaurant" && isOpen != false] {
    _id,
    name,
    "slug": slug.current,
    isClosed,
    district,
    "bezirk": bezirkRef->{ name, "slug": slug.current },
    address,
    categories,
    price,
    lat,
    lng,
    mapsUrl,
    website,
    reservationUrl,
    openingHours,
    tip,
    shortDescription,
    "photo": image.asset->url + "?w=600&auto=format&q=80",
    "mustEatCount": count(*[_type == "mustEat" && restaurantRef._ref == ^._id])
  }
`

export const mapMustEatsQuery = `
  *[_type == "mustEat"] {
    _id,
    dish,
    description,
    price,
    "image": image.asset->url + "?w=600&auto=format&q=80",
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
